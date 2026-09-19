package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestFreelancerDiscoveryRejectsInvalidFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	handler := NewFreelancerDiscoveryHandler(nil)

	tests := []string{
		"/api/freelancers?min_rating=6",
		"/api/freelancers?sort=unrecognized",
		"/api/freelancers?page=0",
		"/api/freelancers?limit=101",
		"/api/freelancers?tier=Unknown",
	}
	for _, target := range tests {
		t.Run(target, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, target, nil)
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = request

			handler.Search(context)
			if response.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
			}
		})
	}
}
