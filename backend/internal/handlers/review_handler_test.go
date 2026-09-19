package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

func init() {
	gin.SetMode(gin.TestMode)
}

type storedReview struct {
	models.ContractReview
	DeletedAt *time.Time
}

type notificationRecord struct {
	UserID string
	Type   string
}

type activityRecord struct {
	ActorID string
	Action  string
}

type fakeContract struct {
	ProjectID    string
	BuyerID      string
	FreelancerID string
	Status       string
}

type fakeReviewStore struct {
	contracts     map[string]fakeContract
	reviews       map[string]*storedReview
	notifications []notificationRecord
	activities    []activityRecord
	createErr     error
	trustOverride *models.TrustProfile
}

func newFakeReviewStore() *fakeReviewStore {
	return &fakeReviewStore{
		contracts: map[string]fakeContract{},
		reviews:   map[string]*storedReview{},
	}
}

func (f *fakeReviewStore) Eligibility(_ context.Context, contractID, userID string) (string, bool, error) {
	c, ok := f.contracts[contractID]
	if !ok {
		return "", false, fmt.Errorf("contract not found")
	}
	if c.Status != "completed" || (userID != c.BuyerID && userID != c.FreelancerID) {
		return "", false, repositories.ErrReviewForbidden
	}
	reviewee := c.FreelancerID
	if userID == c.FreelancerID {
		reviewee = c.BuyerID
	}
	if userID == reviewee {
		return "", false, repositories.ErrReviewForbidden
	}
	for _, r := range f.reviews {
		if r.ContractID == contractID && r.ReviewerID == userID {
			return reviewee, false, nil
		}
	}
	return reviewee, true, nil
}

func (f *fakeReviewStore) Create(_ context.Context, review *models.ContractReview) error {
	if f.createErr != nil {
		return f.createErr
	}
	c, ok := f.contracts[review.ContractID]
	if !ok {
		return fmt.Errorf("contract not found")
	}
	if review.ReviewerID == review.RevieweeID {
		return repositories.ErrReviewForbidden
	}
	for _, existing := range f.reviews {
		if existing.ContractID == review.ContractID && existing.ReviewerID == review.ReviewerID {
			return repositories.ErrReviewDuplicate
		}
	}
	review.ProjectID = c.ProjectID
	review.IsVerified = true
	now := time.Now().UTC()
	review.CreatedAt = now
	review.UpdatedAt = now
	copyReview := *review
	f.reviews[review.ID] = &storedReview{ContractReview: copyReview}
	f.notifications = append(f.notifications, notificationRecord{UserID: review.RevieweeID, Type: "new_review"})
	f.activities = append(f.activities, activityRecord{ActorID: review.ReviewerID, Action: "review_created"})
	return nil
}

func (f *fakeReviewStore) Get(_ context.Context, id string) (*models.ContractReview, error) {
	r, ok := f.reviews[id]
	if !ok || r.DeletedAt != nil {
		return nil, repositories.ErrReviewNotFound
	}
	copyReview := r.ContractReview
	return &copyReview, nil
}

func (f *fakeReviewStore) List(_ context.Context, userID string, limit, offset int) ([]models.ContractReview, error) {
	out := []models.ContractReview{}
	for _, r := range f.reviews {
		if r.RevieweeID == userID && r.DeletedAt == nil {
			out = append(out, r.ContractReview)
		}
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.After(out[j].CreatedAt) })
	if offset > len(out) {
		return []models.ContractReview{}, nil
	}
	out = out[offset:]
	if limit < len(out) {
		out = out[:limit]
	}
	return out, nil
}

func (f *fakeReviewStore) Update(_ context.Context, id, userID string, rating int, comment string) (*models.ContractReview, error) {
	r, ok := f.reviews[id]
	if !ok || r.DeletedAt != nil {
		return nil, repositories.ErrReviewNotFound
	}
	if r.ReviewerID != userID {
		return nil, repositories.ErrReviewForbidden
	}
	r.Rating = rating
	r.Comment = comment
	r.UpdatedAt = time.Now().UTC()
	copyReview := r.ContractReview
	return &copyReview, nil
}

func (f *fakeReviewStore) Delete(_ context.Context, id, userID string) error {
	r, ok := f.reviews[id]
	if !ok || r.DeletedAt != nil {
		return repositories.ErrReviewNotFound
	}
	if r.ReviewerID != userID {
		return repositories.ErrReviewForbidden
	}
	now := time.Now().UTC()
	r.DeletedAt = &now
	return nil
}

func (f *fakeReviewStore) Trust(_ context.Context, userID string) (*models.TrustProfile, error) {
	if f.trustOverride != nil {
		return f.trustOverride, nil
	}
	p := &models.TrustProfile{Distribution: map[int]int{1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}
	sum := 0
	for _, r := range f.reviews {
		if r.RevieweeID != userID || r.DeletedAt != nil {
			continue
		}
		p.RatingCount++
		sum += r.Rating
		p.Distribution[r.Rating]++
		if r.IsVerified {
			p.VerifiedReviewCount++
		}
	}
	if p.RatingCount > 0 {
		p.AverageRating = float64(sum) / float64(p.RatingCount)
	}
	for _, c := range f.contracts {
		if (c.BuyerID == userID || c.FreelancerID == userID) && c.Status == "completed" {
			p.CompletedProjects++
		}
	}
	p.GrowthTier = repositories.DetermineGrowthTier(p.CompletedProjects, p.RatingCount, p.AverageRating)
	return p, nil
}

type apiEnvelope struct {
	Success bool            `json:"success"`
	Message string          `json:"message"`
	Data    json.RawMessage `json:"data"`
}

func performReview(t *testing.T, h *ReviewHandler, method, path, userID string, params gin.Params, query, body string) *httptest.ResponseRecorder {
	t.Helper()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	c.Request = req
	c.Params = params
	c.Set("user_id", userID)
	switch {
	case strings.Contains(path, "/review-eligibility"):
		h.Eligibility(c)
	case strings.HasSuffix(path, "/trust") || strings.Contains(path, "/trust"):
		h.Trust(c)
	case method == http.MethodPost && path == "/api/reviews":
		h.Create(c)
	case method == http.MethodGet && strings.Contains(path, "/reviews?") || strings.Contains(path, "/users/"):
		if strings.Contains(path, "/reviews") && strings.Contains(path, "/users/") {
			h.List(c)
			return w
		}
		h.Get(c)
	case method == http.MethodGet:
		h.Get(c)
	case method == http.MethodPatch:
		h.Update(c)
	case method == http.MethodDelete:
		h.Delete(c)
	}
	_ = query
	return w
}

func decodeEnvelope(t *testing.T, w *httptest.ResponseRecorder) apiEnvelope {
	t.Helper()
	var env apiEnvelope
	if err := json.Unmarshal(w.Body.Bytes(), &env); err != nil {
		t.Fatalf("invalid json %s: %v", w.Body.String(), err)
	}
	return env
}

func seedCompletedPair(f *fakeReviewStore) {
	f.contracts["c_done"] = fakeContract{ProjectID: "p1", BuyerID: "usr_buyer", FreelancerID: "usr_freelancer", Status: "completed"}
	f.contracts["c_active"] = fakeContract{ProjectID: "p2", BuyerID: "usr_buyer", FreelancerID: "usr_freelancer", Status: "active"}
	f.contracts["c_other"] = fakeContract{ProjectID: "p3", BuyerID: "usr_other", FreelancerID: "usr_stranger", Status: "completed"}
}

func TestReviewCreateCompletedContractSucceeds(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	w := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_done","rating":5,"comment":"Great delivery on this project."}`)
	if w.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	env := decodeEnvelope(t, w)
	var review models.ContractReview
	if err := json.Unmarshal(env.Data, &review); err != nil {
		t.Fatal(err)
	}
	if review.ReviewerID != "usr_buyer" || review.RevieweeID != "usr_freelancer" || !review.IsVerified {
		t.Fatalf("unexpected review %+v", review)
	}
}

func TestReviewCreateIncompleteContractRejected(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	w := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_active","rating":5,"comment":"Great delivery on this project."}`)
	if w.Code != http.StatusForbidden {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
}

func TestReviewCreateUnrelatedUserRejected(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	w := performReview(t, h, http.MethodPost, "/api/reviews", "usr_outsider", nil, "", `{"contract_id":"c_done","rating":5,"comment":"Great delivery on this project."}`)
	if w.Code != http.StatusForbidden {
		t.Fatalf("status=%d", w.Code)
	}
}

func TestReviewCreateSelfReviewRejected(t *testing.T) {
	f := newFakeReviewStore()
	f.contracts["c_self"] = fakeContract{ProjectID: "p1", BuyerID: "usr_same", FreelancerID: "usr_same", Status: "completed"}
	h := NewReviewHandler(f)
	w := performReview(t, h, http.MethodPost, "/api/reviews", "usr_same", nil, "", `{"contract_id":"c_self","rating":5,"comment":"Great delivery on this project."}`)
	if w.Code != http.StatusForbidden {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
}

func TestReviewCreateDuplicateDirectionalRejected(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	body := `{"contract_id":"c_done","rating":5,"comment":"Great delivery on this project."}`
	first := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", body)
	if first.Code != http.StatusCreated {
		t.Fatalf("first create status=%d", first.Code)
	}
	second := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", body)
	if second.Code != http.StatusConflict {
		t.Fatalf("duplicate status=%d body=%s", second.Code, second.Body.String())
	}
}

func TestReviewCreateRatingBounds(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	low := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_done","rating":0,"comment":"Great delivery on this project."}`)
	if low.Code != http.StatusBadRequest {
		t.Fatalf("rating 0 status=%d", low.Code)
	}
	high := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_done","rating":6,"comment":"Great delivery on this project."}`)
	if high.Code != http.StatusBadRequest {
		t.Fatalf("rating 6 status=%d", high.Code)
	}
}

func TestReviewCreateIgnoresSpoofedIdentityAndVerification(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	body := `{
		"contract_id":"c_done",
		"rating":4,
		"comment":"Great delivery on this project.",
		"reviewer_id":"usr_spoofed",
		"reviewee_id":"usr_spoofed_target",
		"is_verified":false,
		"isVerified":false
	}`
	w := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", body)
	if w.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", w.Code, w.Body.String())
	}
	env := decodeEnvelope(t, w)
	var review models.ContractReview
	_ = json.Unmarshal(env.Data, &review)
	if review.ReviewerID != "usr_buyer" {
		t.Fatalf("reviewer spoofed: %s", review.ReviewerID)
	}
	if review.RevieweeID != "usr_freelancer" {
		t.Fatalf("reviewee spoofed: %s", review.RevieweeID)
	}
	if !review.IsVerified {
		t.Fatal("verified status must remain server-controlled")
	}
}

func TestReviewGetExistingAndMissing(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	created := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_done","rating":5,"comment":"Great delivery on this project."}`)
	var env apiEnvelope
	_ = json.Unmarshal(created.Body.Bytes(), &env)
	var review models.ContractReview
	_ = json.Unmarshal(env.Data, &review)
	ok := performReview(t, h, http.MethodGet, "/api/reviews/"+review.ID, "usr_buyer", gin.Params{{Key: "id", Value: review.ID}}, "", "")
	if ok.Code != http.StatusOK {
		t.Fatalf("get status=%d", ok.Code)
	}
	missing := performReview(t, h, http.MethodGet, "/api/reviews/missing", "usr_buyer", gin.Params{{Key: "id", Value: "missing"}}, "", "")
	if missing.Code != http.StatusNotFound {
		t.Fatalf("missing status=%d", missing.Code)
	}
}

func TestReviewListingPaginationAndDeletedHidden(t *testing.T) {
	f := newFakeReviewStore()
	now := time.Now().UTC()
	for i := 0; i < 3; i++ {
		id := fmt.Sprintf("rev_%d", i)
		f.reviews[id] = &storedReview{ContractReview: models.ContractReview{
			ID: id, ReviewerID: "usr_buyer", RevieweeID: "usr_freelancer", ProjectID: "p1", ContractID: fmt.Sprintf("c%d", i),
			Rating: 5, Comment: "Great delivery on this project.", IsVerified: true, CreatedAt: now.Add(time.Duration(i) * time.Minute),
		}}
	}
	h := NewReviewHandler(f)
	page1 := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(page1)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/users/usr_freelancer/reviews?page=1&limit=2", nil)
	c.Params = gin.Params{{Key: "id", Value: "usr_freelancer"}}
	c.Set("user_id", "usr_buyer")
	h.List(c)
	if page1.Code != http.StatusOK {
		t.Fatalf("list status=%d", page1.Code)
	}
	env := decodeEnvelope(t, page1)
	var payload struct {
		Reviews []models.ContractReview `json:"reviews"`
		Page    int                     `json:"page"`
		Limit   int                     `json:"limit"`
	}
	_ = json.Unmarshal(env.Data, &payload)
	if len(payload.Reviews) != 2 || payload.Page != 1 || payload.Limit != 2 {
		t.Fatalf("unexpected page1 %+v", payload)
	}
	if payload.Reviews[0].ID != "rev_2" {
		t.Fatalf("expected newest first, got %s", payload.Reviews[0].ID)
	}
	page2 := httptest.NewRecorder()
	cPage2, _ := gin.CreateTestContext(page2)
	cPage2.Request = httptest.NewRequest(http.MethodGet, "/api/users/usr_freelancer/reviews?page=2&limit=2", nil)
	cPage2.Params = gin.Params{{Key: "id", Value: "usr_freelancer"}}
	cPage2.Set("user_id", "usr_buyer")
	h.List(cPage2)
	env = decodeEnvelope(t, page2)
	_ = json.Unmarshal(env.Data, &payload)
	if len(payload.Reviews) != 1 || payload.Reviews[0].ID != "rev_0" {
		t.Fatalf("unexpected page2 %+v", payload)
	}
	deleted := f.reviews["rev_1"]
	ts := now
	deleted.DeletedAt = &ts
	pageAll := httptest.NewRecorder()
	c2, _ := gin.CreateTestContext(pageAll)
	c2.Request = httptest.NewRequest(http.MethodGet, "/api/users/usr_freelancer/reviews?page=1&limit=20", nil)
	c2.Params = gin.Params{{Key: "id", Value: "usr_freelancer"}}
	c2.Set("user_id", "usr_buyer")
	h.List(c2)
	env = decodeEnvelope(t, pageAll)
	_ = json.Unmarshal(env.Data, &payload)
	if len(payload.Reviews) != 2 {
		t.Fatalf("deleted review should be hidden, got %d", len(payload.Reviews))
	}
}

func TestReviewPatchAuthorizationAndImmutableFields(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	created := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_done","rating":5,"comment":"Great delivery on this project."}`)
	env := decodeEnvelope(t, created)
	var review models.ContractReview
	_ = json.Unmarshal(env.Data, &review)
	params := gin.Params{{Key: "id", Value: review.ID}}
	owner := performReview(t, h, http.MethodPatch, "/api/reviews/"+review.ID, "usr_buyer", params, "", `{"rating":4,"comment":"Updated after a second look."}`)
	if owner.Code != http.StatusOK {
		t.Fatalf("owner patch status=%d body=%s", owner.Code, owner.Body.String())
	}
	outsider := performReview(t, h, http.MethodPatch, "/api/reviews/"+review.ID, "usr_outsider", params, "", `{"rating":1,"comment":"I should not be able to edit this."}`)
	if outsider.Code != http.StatusForbidden {
		t.Fatalf("outsider patch status=%d", outsider.Code)
	}
	reviewee := performReview(t, h, http.MethodPatch, "/api/reviews/"+review.ID, "usr_freelancer", params, "", `{"rating":1,"comment":"I should not be able to edit this."}`)
	if reviewee.Code != http.StatusForbidden {
		t.Fatalf("reviewee patch status=%d", reviewee.Code)
	}
	spoof := performReview(t, h, http.MethodPatch, "/api/reviews/"+review.ID, "usr_buyer", params, "", `{"rating":3,"comment":"Still a solid engagement.","reviewer_id":"usr_other","reviewee_id":"usr_other","contract_id":"c_other","project_id":"p9","is_verified":false}`)
	if spoof.Code != http.StatusOK {
		t.Fatalf("spoof patch status=%d", spoof.Code)
	}
	stored := f.reviews[review.ID]
	if stored.ReviewerID != "usr_buyer" || stored.RevieweeID != "usr_freelancer" || stored.ContractID != "c_done" || stored.ProjectID != "p1" || !stored.IsVerified {
		t.Fatalf("immutable fields changed: %+v", stored.ContractReview)
	}
}

func TestReviewDeleteOwnerAndNonOwner(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	created := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_done","rating":5,"comment":"Great delivery on this project."}`)
	env := decodeEnvelope(t, created)
	var review models.ContractReview
	_ = json.Unmarshal(env.Data, &review)
	params := gin.Params{{Key: "id", Value: review.ID}}
	forbidden := performReview(t, h, http.MethodDelete, "/api/reviews/"+review.ID, "usr_freelancer", params, "", "")
	if forbidden.Code != http.StatusForbidden {
		t.Fatalf("non-owner delete status=%d", forbidden.Code)
	}
	ok := performReview(t, h, http.MethodDelete, "/api/reviews/"+review.ID, "usr_buyer", params, "", "")
	if ok.Code != http.StatusOK {
		t.Fatalf("owner delete status=%d", ok.Code)
	}
	if f.reviews[review.ID].DeletedAt == nil {
		t.Fatal("soft delete must keep the audit row")
	}
	hidden := performReview(t, h, http.MethodGet, "/api/reviews/"+review.ID, "usr_buyer", params, "", "")
	if hidden.Code != http.StatusNotFound {
		t.Fatalf("soft-deleted get status=%d", hidden.Code)
	}
	retry := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_done","rating":4,"comment":"Trying to review again after delete."}`)
	if retry.Code != http.StatusConflict {
		t.Fatalf("duplicate after delete status=%d body=%s", retry.Code, retry.Body.String())
	}
}

func TestReviewTrustTiersAveragesAndDeletedExcluded(t *testing.T) {
	cases := []struct {
		name      string
		completed int
		ratings   []int
		want      string
	}{
		{"new", 0, nil, "New"},
		{"rising", 1, nil, "Rising"},
		{"established", 5, []int{4, 4, 4}, "Established"},
		{"trusted", 10, []int{5, 5, 5, 4, 4, 4, 5, 4}, "Trusted"},
		{"top", 20, []int{5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 4, 5}, "Top Performer"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			f := newFakeReviewStore()
			for i := 0; i < tc.completed; i++ {
				f.contracts[fmt.Sprintf("c%d", i)] = fakeContract{BuyerID: "usr_buyer", FreelancerID: "usr_freelancer", Status: "completed"}
			}
			sum := 0
			for i, rating := range tc.ratings {
				sum += rating
				f.reviews[fmt.Sprintf("r%d", i)] = &storedReview{ContractReview: models.ContractReview{
					ID: fmt.Sprintf("r%d", i), ReviewerID: "usr_buyer", RevieweeID: "usr_freelancer", Rating: rating, IsVerified: true,
				}}
			}
			h := NewReviewHandler(f)
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, "/api/users/usr_freelancer/trust", nil)
			c.Params = gin.Params{{Key: "id", Value: "usr_freelancer"}}
			c.Set("user_id", "usr_buyer")
			h.Trust(c)
			env := decodeEnvelope(t, w)
			var profile models.TrustProfile
			if err := json.Unmarshal(env.Data, &profile); err != nil {
				t.Fatal(err)
			}
			if profile.GrowthTier != tc.want {
				t.Fatalf("tier=%s want %s", profile.GrowthTier, tc.want)
			}
			if profile.RatingCount != len(tc.ratings) {
				t.Fatalf("count=%d want %d", profile.RatingCount, len(tc.ratings))
			}
			if len(tc.ratings) > 0 {
				wantAvg := float64(sum) / float64(len(tc.ratings))
				if profile.AverageRating != wantAvg {
					t.Fatalf("avg=%v want %v", profile.AverageRating, wantAvg)
				}
			}
		})
	}

	f := newFakeReviewStore()
	f.contracts["c1"] = fakeContract{BuyerID: "usr_buyer", FreelancerID: "usr_freelancer", Status: "completed"}
	now := time.Now().UTC()
	f.reviews["keep"] = &storedReview{ContractReview: models.ContractReview{ID: "keep", RevieweeID: "usr_freelancer", Rating: 5, IsVerified: true}}
	f.reviews["gone"] = &storedReview{ContractReview: models.ContractReview{ID: "gone", RevieweeID: "usr_freelancer", Rating: 1, IsVerified: true}, DeletedAt: &now}
	h := NewReviewHandler(f)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/users/usr_freelancer/trust", nil)
	c.Params = gin.Params{{Key: "id", Value: "usr_freelancer"}}
	c.Set("user_id", "usr_buyer")
	h.Trust(c)
	env := decodeEnvelope(t, w)
	var profile models.TrustProfile
	_ = json.Unmarshal(env.Data, &profile)
	if profile.RatingCount != 1 || profile.VerifiedReviewCount != 1 || profile.Distribution[5] != 1 || profile.Distribution[1] != 0 {
		t.Fatalf("deleted reviews must not affect aggregates: %+v", profile)
	}
}

func TestReviewCreateNotificationAndActivity(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	h := NewReviewHandler(f)
	w := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_done","rating":5,"comment":"Great delivery on this project."}`)
	if w.Code != http.StatusCreated {
		t.Fatalf("status=%d", w.Code)
	}
	if len(f.notifications) != 1 || f.notifications[0].Type != "new_review" || f.notifications[0].UserID != "usr_freelancer" {
		t.Fatalf("notification=%+v", f.notifications)
	}
	if len(f.activities) != 1 || f.activities[0].Action != "review_created" || f.activities[0].ActorID != "usr_buyer" {
		t.Fatalf("activity=%+v", f.activities)
	}
}

func TestReviewCreateDoesNotLeavePartialSideEffectsWhenCreateFails(t *testing.T) {
	f := newFakeReviewStore()
	seedCompletedPair(f)
	f.createErr = fmt.Errorf("forced failure after eligibility")
	h := NewReviewHandler(f)
	w := performReview(t, h, http.MethodPost, "/api/reviews", "usr_buyer", nil, "", `{"contract_id":"c_done","rating":5,"comment":"Great delivery on this project."}`)
	if w.Code != http.StatusInternalServerError {
		t.Fatalf("status=%d", w.Code)
	}
	if len(f.reviews) != 0 || len(f.notifications) != 0 || len(f.activities) != 0 {
		t.Fatalf("partial side effects exist reviews=%d ntf=%d act=%d", len(f.reviews), len(f.notifications), len(f.activities))
	}
}

func TestReviewJSONBindingDoesNotAcceptClientReviewer(t *testing.T) {
	var req models.CreateContractReviewRequest
	if err := json.Unmarshal([]byte(`{"contract_id":"c1","rating":5,"reviewer_id":"x","reviewee_id":"y","is_verified":true}`), &req); err != nil {
		t.Fatal(err)
	}
	raw, _ := json.Marshal(req)
	if bytes.Contains(raw, []byte("reviewer_id")) || bytes.Contains(raw, []byte("reviewee_id")) {
		t.Fatalf("create DTO must not carry identity fields: %s", raw)
	}
}
