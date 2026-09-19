package services

import (
	"context"
	"errors"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"workstream-backend/internal/models"
	"workstream-backend/internal/repositories"
)

var (
	ErrServiceNotFound        = errors.New("service not found")
	ErrForbidden              = errors.New("forbidden: you do not have permission to access or modify this service")
	ErrValidationFailed       = errors.New("validation failed")
	ErrCannotDeletePublished  = errors.New("published services cannot be deleted; please archive the service instead")
)

// ServiceValidationError represents structured field validation errors
type ServiceValidationError struct {
	Errors map[string]string
}

func (e *ServiceValidationError) Error() string {
	var msgs []string
	for field, msg := range e.Errors {
		msgs = append(msgs, fmt.Sprintf("%s: %s", field, msg))
	}
	return fmt.Sprintf("validation failed: %s", strings.Join(msgs, "; "))
}

// ServiceService handles business logic for marketplace services and seller lifecycle
type ServiceService interface {
	GetAllServices(ctx context.Context, f repositories.ServiceFilter) ([]models.Service, error)
	GetServiceByID(ctx context.Context, id string) (*models.Service, error)
	GetSellerServices(ctx context.Context, sellerID string, status string, limit, offset int) (*models.SellerServicesData, error)
	CreateService(ctx context.Context, sellerID string, req models.CreateServiceRequest) (*models.Service, error)
	UpdateService(ctx context.Context, userID, userRole, serviceID string, req models.UpdateServiceRequest) (*models.Service, error)
	PublishService(ctx context.Context, userID, userRole, serviceID string) (*models.Service, error)
	ArchiveService(ctx context.Context, userID, userRole, serviceID string) (*models.Service, error)
	DeleteService(ctx context.Context, userID, userRole, serviceID string) error
	ValidateServiceForPublishing(s *models.Service) map[string]string
}

type serviceService struct {
	serviceRepo  repositories.ServiceRepository
	categoryRepo repositories.CategoryRepository
}

// NewServiceService creates a new ServiceService instance
func NewServiceService(serviceRepo repositories.ServiceRepository, categoryRepo repositories.CategoryRepository) ServiceService {
	return &serviceService{
		serviceRepo:  serviceRepo,
		categoryRepo: categoryRepo,
	}
}

// GetAllServices returns a filtered list of published services
func (s *serviceService) GetAllServices(ctx context.Context, f repositories.ServiceFilter) ([]models.Service, error) {
	return s.serviceRepo.GetAll(ctx, f)
}

// GetServiceByID returns a single service by ID (supports srv_1 or 1 formats)
func (s *serviceService) GetServiceByID(ctx context.Context, id string) (*models.Service, error) {
	service, err := s.serviceRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if service == nil {
		return nil, ErrServiceNotFound
	}
	return service, nil
}

// GetSellerServices retrieves services for the authenticated seller
func (s *serviceService) GetSellerServices(ctx context.Context, sellerID string, status string, limit, offset int) (*models.SellerServicesData, error) {
	if sellerID == "" {
		return nil, errors.New("seller ID is required")
	}

	servicesList, total, err := s.serviceRepo.GetBySellerID(ctx, sellerID, status, limit, offset)
	if err != nil {
		return nil, err
	}

	if servicesList == nil {
		servicesList = []models.Service{}
	}

	return &models.SellerServicesData{
		Services: servicesList,
		Total:    total,
		Limit:    limit,
		Offset:   offset,
	}, nil
}

// CreateService validates and creates a new service in draft or published status
func (s *serviceService) CreateService(ctx context.Context, sellerID string, req models.CreateServiceRequest) (*models.Service, error) {
	if sellerID == "" {
		return nil, errors.New("authenticated seller ID is required")
	}

	valErrors := make(map[string]string)

	// Validate title
	trimmedTitle := strings.TrimSpace(req.Title)
	if trimmedTitle == "" {
		valErrors["title"] = "Title is required"
	} else if len(trimmedTitle) < 5 {
		valErrors["title"] = "Title must be at least 5 characters"
	} else if len(trimmedTitle) > 200 {
		valErrors["title"] = "Title cannot exceed 200 characters"
	}

	// Validate category and subcategory
	if req.CategoryID == "" {
		valErrors["category_id"] = "Category is required"
	}
	if req.SubcategoryID == "" {
		valErrors["subcategory_id"] = "Subcategory is required"
	}

	var cat *models.Category
	var sub *models.Subcategory
	if len(valErrors) == 0 && s.categoryRepo != nil {
		var err error
		cat, sub, err = s.categoryRepo.ValidateCategoryAndSubcategory(ctx, req.CategoryID, req.SubcategoryID)
		if err != nil {
			valErrors["category"] = err.Error()
		}
	}

	if len(valErrors) > 0 {
		return nil, &ServiceValidationError{Errors: valErrors}
	}

	// Status resolution (defaults to "draft")
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != "published" && status != "archived" {
		status = "draft"
	}

	// Image resolution
	coverImg := req.CoverImage
	if coverImg == "" {
		coverImg = req.ImageURL
	}
	if coverImg == "" {
		coverImg = req.Image
	}
	if coverImg == "" {
		coverImg = "https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80"
	}

	// Slug generation
	slug := generateSlug(trimmedTitle)
	serviceID := fmt.Sprintf("srv_usr_%d", time.Now().UnixNano()/int64(time.Millisecond))

	// Starting price and delivery days
	startingPrice := req.StartingPrice
	if startingPrice <= 0 {
		startingPrice = req.Price
	}
	deliveryDays := req.DeliveryDays
	if deliveryDays <= 0 {
		deliveryDays = req.DeliveryTime
	}

	// Process and build packages
	packages := s.buildPackagesFromRequest(req.Packages, serviceID, &startingPrice, &deliveryDays)

	// Ensure minimum starting price & delivery days defaults
	if startingPrice <= 0 {
		startingPrice = 50.0
	}
	if deliveryDays <= 0 {
		deliveryDays = 3
	}

	// Build tags list
	var tags []string
	if len(req.Tags) > 0 {
		tags = req.Tags
	} else if req.TagString != "" {
		for _, t := range strings.Split(req.TagString, ",") {
			trimmed := strings.TrimSpace(t)
			if trimmed != "" {
				tags = append(tags, trimmed)
			}
		}
	}

	service := &models.Service{
		ID:              serviceID,
		Title:           trimmedTitle,
		Slug:            slug,
		SellerID:        sellerID,
		CategoryID:      cat.ID,
		CategorySlug:    cat.Slug,
		SubcategoryID:   sub.ID,
		SubcategorySlug: sub.Slug,
		TagIDs:          []string{},
		Status:          status,
		IsFeatured:      false,
		IsTrending:      false,
		ViewsCount:      0,
		CoverImage:      coverImg,
		ImageURL:        coverImg,
		GalleryImages:   []string{coverImg},
		Description:     strings.TrimSpace(req.Description),
		Tags:            tags,
		StartingPrice:   startingPrice,
		Currency:        "USD",
		DeliveryDays:    deliveryDays,
		Rating:          5.0,
		ReviewCount:     0,
		OrderCount:      0,
	}

	// If creating directly as published, validate publish readiness
	if status == "published" {
		service.Packages = make(map[string]models.ServicePackage)
		for _, p := range packages {
			service.Packages[p.Tier] = p
		}
		pubErrors := s.ValidateServiceForPublishing(service)
		if len(pubErrors) > 0 {
			return nil, &ServiceValidationError{Errors: pubErrors}
		}
	}

	created, err := s.serviceRepo.Create(ctx, service, packages)
	if err != nil {
		return nil, fmt.Errorf("failed to create service: %w", err)
	}

	return created, nil
}

// UpdateService updates service properties and packages with strict ownership checks
func (s *serviceService) UpdateService(ctx context.Context, userID, userRole, serviceID string, req models.UpdateServiceRequest) (*models.Service, error) {
	// 1. Check ownership
	isOwner, existing, err := s.serviceRepo.CheckOwnership(ctx, serviceID, userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrServiceNotFound
	}
	if !isOwner && strings.ToLower(userRole) != "admin" {
		return nil, ErrForbidden
	}

	valErrors := make(map[string]string)

	// Update Title
	if req.Title != nil {
		trimmed := strings.TrimSpace(*req.Title)
		if trimmed == "" {
			valErrors["title"] = "Title cannot be empty"
		} else if len(trimmed) < 5 {
			valErrors["title"] = "Title must be at least 5 characters"
		} else {
			existing.Title = trimmed
			existing.Slug = generateSlug(trimmed)
		}
	}

	// Update Description
	if req.Description != nil {
		existing.Description = strings.TrimSpace(*req.Description)
	}

	// Update Category / Subcategory
	catID := existing.CategoryID
	subID := existing.SubcategoryID
	if req.CategoryID != nil && *req.CategoryID != "" {
		catID = *req.CategoryID
	}
	if req.SubcategoryID != nil && *req.SubcategoryID != "" {
		subID = *req.SubcategoryID
	}

	if (req.CategoryID != nil || req.SubcategoryID != nil) && s.categoryRepo != nil {
		cat, sub, err := s.categoryRepo.ValidateCategoryAndSubcategory(ctx, catID, subID)
		if err != nil {
			valErrors["category"] = err.Error()
		} else {
			existing.CategoryID = cat.ID
			existing.CategorySlug = cat.Slug
			existing.SubcategoryID = sub.ID
			existing.SubcategorySlug = sub.Slug
		}
	}

	// Update Images
	if req.CoverImage != nil && *req.CoverImage != "" {
		existing.CoverImage = *req.CoverImage
		existing.ImageURL = *req.CoverImage
	} else if req.ImageURL != nil && *req.ImageURL != "" {
		existing.CoverImage = *req.ImageURL
		existing.ImageURL = *req.ImageURL
	} else if req.Image != nil && *req.Image != "" {
		existing.CoverImage = *req.Image
		existing.ImageURL = *req.Image
	}

	// Update Tags
	if req.Tags != nil {
		existing.Tags = req.Tags
	}

	// Update Status if provided
	if req.Status != nil {
		st := strings.ToLower(strings.TrimSpace(*req.Status))
		if st == "draft" || st == "published" || st == "archived" {
			existing.Status = st
		}
	}

	// Update Pricing / Delivery
	if req.StartingPrice != nil && *req.StartingPrice >= 0 {
		existing.StartingPrice = *req.StartingPrice
	} else if req.Price != nil && *req.Price >= 0 {
		existing.StartingPrice = *req.Price
	}

	if req.DeliveryDays != nil && *req.DeliveryDays > 0 {
		existing.DeliveryDays = *req.DeliveryDays
	} else if req.DeliveryTime != nil && *req.DeliveryTime > 0 {
		existing.DeliveryDays = *req.DeliveryTime
	}

	if len(valErrors) > 0 {
		return nil, &ServiceValidationError{Errors: valErrors}
	}

	// Packages update
	var updatedPackages []models.ServicePackage
	updatePackages := len(req.Packages) > 0
	if updatePackages {
		startingPrice := existing.StartingPrice
		deliveryDays := existing.DeliveryDays
		updatedPackages = s.buildPackagesFromRequest(req.Packages, existing.ID, &startingPrice, &deliveryDays)
		existing.StartingPrice = startingPrice
		existing.DeliveryDays = deliveryDays
	}

	updated, err := s.serviceRepo.Update(ctx, existing, updatedPackages, updatePackages)
	if err != nil {
		return nil, fmt.Errorf("failed to update service: %w", err)
	}

	return updated, nil
}

// PublishService transitions a draft or archived service to 'published' status after validating completeness
func (s *serviceService) PublishService(ctx context.Context, userID, userRole, serviceID string) (*models.Service, error) {
	isOwner, existing, err := s.serviceRepo.CheckOwnership(ctx, serviceID, userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrServiceNotFound
	}
	if !isOwner && strings.ToLower(userRole) != "admin" {
		return nil, ErrForbidden
	}

	// Validate publish readiness
	valErrors := s.ValidateServiceForPublishing(existing)
	if len(valErrors) > 0 {
		return nil, &ServiceValidationError{Errors: valErrors}
	}

	if err := s.serviceRepo.Publish(ctx, existing.ID); err != nil {
		return nil, fmt.Errorf("failed to publish service: %w", err)
	}

	// Return fresh updated service
	return s.serviceRepo.GetByIDWithStatus(ctx, existing.ID)
}

// ArchiveService transitions a published or draft service to 'archived' status
func (s *serviceService) ArchiveService(ctx context.Context, userID, userRole, serviceID string) (*models.Service, error) {
	isOwner, existing, err := s.serviceRepo.CheckOwnership(ctx, serviceID, userID)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrServiceNotFound
	}
	if !isOwner && strings.ToLower(userRole) != "admin" {
		return nil, ErrForbidden
	}

	if err := s.serviceRepo.Archive(ctx, existing.ID); err != nil {
		return nil, fmt.Errorf("failed to archive service: %w", err)
	}

	return s.serviceRepo.GetByIDWithStatus(ctx, existing.ID)
}

// DeleteService permanently removes a draft service.
// Published services cannot be deleted directly to protect transaction and order integrity.
func (s *serviceService) DeleteService(ctx context.Context, userID, userRole, serviceID string) error {
	isOwner, existing, err := s.serviceRepo.CheckOwnership(ctx, serviceID, userID)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrServiceNotFound
	}
	if !isOwner && strings.ToLower(userRole) != "admin" {
		return ErrForbidden
	}

	if existing.Status == "published" {
		return ErrCannotDeletePublished
	}

	return s.serviceRepo.Delete(ctx, existing.ID)
}

// ValidateServiceForPublishing validates all completeness criteria required before a service is visible publicly
func (s *serviceService) ValidateServiceForPublishing(service *models.Service) map[string]string {
	errors := make(map[string]string)

	if service == nil {
		errors["service"] = "Service data is missing"
		return errors
	}

	if strings.TrimSpace(service.Title) == "" {
		errors["title"] = "Title is required"
	} else if len(strings.TrimSpace(service.Title)) < 5 {
		errors["title"] = "Title must be at least 5 characters"
	}

	if strings.TrimSpace(service.Description) == "" {
		errors["description"] = "Description is required to publish"
	}

	if service.CategoryID == "" {
		errors["category"] = "Category is required"
	}
	if service.SubcategoryID == "" {
		errors["subcategory"] = "Subcategory is required"
	}

	if len(service.Packages) == 0 {
		errors["packages"] = "At least one valid service package is required"
	} else {
		for tier, pkg := range service.Packages {
			if pkg.Price < 0 {
				errors[fmt.Sprintf("package_%s_price", tier)] = "Package price cannot be negative"
			}
			if pkg.DeliveryTime <= 0 {
				errors[fmt.Sprintf("package_%s_delivery", tier)] = "Delivery time must be at least 1 day"
			}
		}
	}

	return errors
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

func (s *serviceService) buildPackagesFromRequest(
	pkgRequests []models.ServicePackageRequest,
	serviceID string,
	startingPrice *float64,
	deliveryDays *int,
) []models.ServicePackage {
	tierNames := []string{"basic", "standard", "premium"}
	var packages []models.ServicePackage

	if len(pkgRequests) == 0 {
		// Create default basic package
		pPrice := 50.0
		if startingPrice != nil && *startingPrice > 0 {
			pPrice = *startingPrice
		}
		pDays := 3
		if deliveryDays != nil && *deliveryDays > 0 {
			pDays = *deliveryDays
		}

		packages = append(packages, models.ServicePackage{
			ID:           fmt.Sprintf("pkg_%s_%s", serviceID, "basic"),
			ServiceID:    serviceID,
			Tier:         "basic",
			Name:         "Basic",
			Title:        "Basic Package",
			Description:  "Standard initial delivery",
			Price:        pPrice,
			DeliveryTime: pDays,
			Revisions:    2,
			Features:     []string{"Standard delivery", "High quality source files"},
		})
		return packages
	}

	minPrice := math.MaxFloat64
	minDelivery := math.MaxInt32

	for i, pr := range pkgRequests {
		tier := strings.ToLower(strings.TrimSpace(pr.Tier))
		if tier == "" {
			if i < len(tierNames) {
				tier = tierNames[i]
			} else {
				tier = fmt.Sprintf("tier_%d", i+1)
			}
		}

		name := strings.TrimSpace(pr.Name)
		if name == "" {
			name = strings.Title(tier)
		}

		title := strings.TrimSpace(pr.Title)
		if title == "" {
			title = fmt.Sprintf("%s Package", name)
		}

		price := pr.Price
		if price < 0 {
			price = 0
		}

		delTime := pr.DeliveryDays
		if delTime <= 0 {
			delTime = pr.DeliveryTime
		}
		if delTime <= 0 {
			delTime = 1
		}

		if price < minPrice {
			minPrice = price
		}
		if delTime < minDelivery {
			minDelivery = delTime
		}

		features := pr.Features
		if features == nil {
			features = []string{"Standard Delivery"}
		}

		packages = append(packages, models.ServicePackage{
			ID:           fmt.Sprintf("pkg_%s_%s", serviceID, tier),
			ServiceID:    serviceID,
			Tier:         tier,
			Name:         name,
			Title:        title,
			Description:  pr.Description,
			Price:        price,
			DeliveryTime: delTime,
			Revisions:    pr.Revisions,
			Features:     features,
		})
	}

	if minPrice < math.MaxFloat64 && startingPrice != nil {
		*startingPrice = minPrice
	}
	if minDelivery < math.MaxInt32 && deliveryDays != nil {
		*deliveryDays = minDelivery
	}

	return packages
}

var nonAlphanumericRegex = regexp.MustCompile(`[^a-z0-9]+`)

func generateSlug(title string) string {
	lower := strings.ToLower(title)
	slug := nonAlphanumericRegex.ReplaceAllString(lower, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		slug = fmt.Sprintf("service-%d", time.Now().Unix())
	}
	return slug
}
