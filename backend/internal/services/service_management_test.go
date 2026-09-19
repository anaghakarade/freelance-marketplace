package services_test

import (
	"context"
	"errors"
	"fmt"
	"testing"

	"workstream-backend/internal/models"
	"workstream-backend/internal/services"
)

func TestServiceManagement_CreateService(t *testing.T) {
	ctx := context.Background()

	catRepo := &mockCategoryRepository{
		validateFunc: func(ctx context.Context, catID, subID string) (*models.Category, *models.Subcategory, error) {
			if catID == "cat_invalid" {
				return nil, nil, fmt.Errorf("category 'cat_invalid' not found")
			}
			if subID == "sub_wrong" {
				return nil, nil, fmt.Errorf("subcategory does not belong to category")
			}
			return &models.Category{ID: "cat_2", Name: "Programming", Slug: "programming-tech"},
				&models.Subcategory{ID: "sub_2_1", CategoryID: "cat_2", Name: "Web Development", Slug: "web-development"}, nil
		},
	}

	var savedPackages []models.ServicePackage
	serviceRepo := &mockServiceRepository{
		createFunc: func(ctx context.Context, s *models.Service, packages []models.ServicePackage) (*models.Service, error) {
			savedPackages = packages
			return s, nil
		},
	}

	svc := services.NewServiceService(serviceRepo, catRepo)

	// 1. Success: create draft service
	req := models.CreateServiceRequest{
		Title:         "I will develop a modern React website",
		Description:   "Professional responsive web development",
		CategoryID:    "cat_2",
		SubcategoryID: "sub_2_1",
		Status:        "draft",
		Packages: []models.ServicePackageRequest{
			{
				Name:         "Basic",
				Tier:         "basic",
				Description:  "Basic landing page",
				Price:        50,
				DeliveryDays: 3,
				Features:     []string{"Responsive Design"},
			},
		},
	}

	created, err := svc.CreateService(ctx, "usr_seller_1", req)
	if err != nil {
		t.Fatalf("unexpected error creating service: %v", err)
	}

	if created.Status != "draft" {
		t.Errorf("expected status 'draft', got '%s'", created.Status)
	}
	if created.SellerID != "usr_seller_1" {
		t.Errorf("expected seller ID 'usr_seller_1', got '%s'", created.SellerID)
	}
	if len(savedPackages) != 1 {
		t.Errorf("expected 1 package, got %d", len(savedPackages))
	}

	// 2. Validation error: invalid category
	reqInvalidCat := req
	reqInvalidCat.CategoryID = "cat_invalid"
	_, err = svc.CreateService(ctx, "usr_seller_1", reqInvalidCat)
	if err == nil {
		t.Fatal("expected validation error for invalid category, got nil")
	}

	// 3. Validation error: mismatched subcategory
	reqMismatchedSub := req
	reqMismatchedSub.SubcategoryID = "sub_wrong"
	_, err = svc.CreateService(ctx, "usr_seller_1", reqMismatchedSub)
	if err == nil {
		t.Fatal("expected validation error for mismatched subcategory, got nil")
	}

	// 4. Validation error: title too short
	reqShortTitle := req
	reqShortTitle.Title = "Hi"
	_, err = svc.CreateService(ctx, "usr_seller_1", reqShortTitle)
	if err == nil {
		t.Fatal("expected validation error for short title, got nil")
	}
}

func TestServiceManagement_OwnershipAndAuthorization(t *testing.T) {
	ctx := context.Background()

	mockExisting := &models.Service{
		ID:            "srv_100",
		Title:         "Original Service Title",
		SellerID:      "seller_alice",
		CategoryID:    "cat_2",
		SubcategoryID: "sub_2_1",
		Status:        "draft",
		StartingPrice: 50,
		DeliveryDays:  3,
	}

	serviceRepo := &mockServiceRepository{
		checkOwnershipFunc: func(ctx context.Context, serviceID, sellerID string) (bool, *models.Service, error) {
			if serviceID == "srv_100" {
				return mockExisting.SellerID == sellerID, mockExisting, nil
			}
			return false, nil, nil
		},
		updateFunc: func(ctx context.Context, s *models.Service, packages []models.ServicePackage, updatePackages bool) (*models.Service, error) {
			return s, nil
		},
		deleteFunc: func(ctx context.Context, id string) error {
			return nil
		},
		publishFunc: func(ctx context.Context, id string) error {
			mockExisting.Status = "published"
			return nil
		},
		getByIDWithStatusFunc: func(ctx context.Context, id string) (*models.Service, error) {
			return mockExisting, nil
		},
	}

	catRepo := &mockCategoryRepository{}
	svc := services.NewServiceService(serviceRepo, catRepo)

	// 1. Seller Bob tries to update Seller Alice's service -> Expect ErrForbidden
	newTitle := "Hacked Title"
	_, err := svc.UpdateService(ctx, "seller_bob", "seller", "srv_100", models.UpdateServiceRequest{
		Title: &newTitle,
	})
	if !errors.Is(err, services.ErrForbidden) {
		t.Errorf("expected ErrForbidden when updating other's service, got %v", err)
	}

	// 2. Seller Bob tries to delete Seller Alice's service -> Expect ErrForbidden
	err = svc.DeleteService(ctx, "seller_bob", "seller", "srv_100")
	if !errors.Is(err, services.ErrForbidden) {
		t.Errorf("expected ErrForbidden when deleting other's service, got %v", err)
	}

	// 3. Admin updates Seller Alice's service -> Allowed
	adminUpdatedTitle := "Admin Cleaned Title"
	res, err := svc.UpdateService(ctx, "admin_user", "admin", "srv_100", models.UpdateServiceRequest{
		Title: &adminUpdatedTitle,
	})
	if err != nil {
		t.Fatalf("unexpected error for admin update: %v", err)
	}
	if res.Title != "Admin Cleaned Title" {
		t.Errorf("expected title 'Admin Cleaned Title', got '%s'", res.Title)
	}

	// 4. Seller Alice updates her own service -> Allowed
	aliceTitle := "Alice Updated Title"
	res, err = svc.UpdateService(ctx, "seller_alice", "seller", "srv_100", models.UpdateServiceRequest{
		Title: &aliceTitle,
	})
	if err != nil {
		t.Fatalf("unexpected error for owner update: %v", err)
	}
	if res.Title != "Alice Updated Title" {
		t.Errorf("expected title 'Alice Updated Title', got '%s'", res.Title)
	}
}

func TestServiceManagement_LifecycleAndPublishValidation(t *testing.T) {
	ctx := context.Background()

	incompleteService := &models.Service{
		ID:            "srv_incomplete",
		Title:         "Incomplete Service",
		Description:   "", // missing description
		SellerID:      "seller_alice",
		CategoryID:    "cat_2",
		SubcategoryID: "sub_2_1",
		Status:        "draft",
		Packages:      map[string]models.ServicePackage{}, // missing packages
	}

	completeService := &models.Service{
		ID:            "srv_complete",
		Title:         "Complete Full-Stack React Service",
		Description:   "Comprehensive React application development",
		SellerID:      "seller_alice",
		CategoryID:    "cat_2",
		SubcategoryID: "sub_2_1",
		Status:        "draft",
		Packages: map[string]models.ServicePackage{
			"basic": {
				ID:           "pkg_1",
				Tier:         "basic",
				Name:         "Basic",
				Price:        75,
				DeliveryTime: 3,
			},
		},
	}

	serviceRepo := &mockServiceRepository{
		checkOwnershipFunc: func(ctx context.Context, serviceID, sellerID string) (bool, *models.Service, error) {
			if serviceID == "srv_incomplete" {
				return true, incompleteService, nil
			}
			if serviceID == "srv_complete" {
				return true, completeService, nil
			}
			return false, nil, nil
		},
		publishFunc: func(ctx context.Context, id string) error {
			if id == "srv_complete" {
				completeService.Status = "published"
			}
			return nil
		},
		getByIDWithStatusFunc: func(ctx context.Context, id string) (*models.Service, error) {
			if id == "srv_complete" {
				return completeService, nil
			}
			return incompleteService, nil
		},
		deleteFunc: func(ctx context.Context, id string) error {
			return nil
		},
	}

	svc := services.NewServiceService(serviceRepo, &mockCategoryRepository{})

	// 1. Publishing incomplete service must fail validation
	_, err := svc.PublishService(ctx, "seller_alice", "seller", "srv_incomplete")
	if err == nil {
		t.Fatal("expected validation error when publishing incomplete service, got nil")
	}

	var valErr *services.ServiceValidationError
	if !errors.As(err, &valErr) {
		t.Errorf("expected ServiceValidationError, got %v", err)
	}
	if _, ok := valErr.Errors["description"]; !ok {
		t.Error("expected description error in validation errors map")
	}
	if _, ok := valErr.Errors["packages"]; !ok {
		t.Error("expected packages error in validation errors map")
	}

	// 2. Publishing complete service succeeds
	published, err := svc.PublishService(ctx, "seller_alice", "seller", "srv_complete")
	if err != nil {
		t.Fatalf("unexpected error publishing complete service: %v", err)
	}
	if published.Status != "published" {
		t.Errorf("expected status 'published', got '%s'", published.Status)
	}

	// 3. Attempting to permanently delete a published service fails (recommend archive)
	err = svc.DeleteService(ctx, "seller_alice", "seller", "srv_complete")
	if !errors.Is(err, services.ErrCannotDeletePublished) {
		t.Errorf("expected ErrCannotDeletePublished, got %v", err)
	}
}
