package models

type FreelancerSearchResult struct {
	User          User     `json:"user"`
	AverageRating float64  `json:"averageRating"`
	RatingCount   int      `json:"ratingCount"`
	Completed     int      `json:"completedContracts"`
	GrowthTier    string   `json:"growthTier"`
	MatchScore    float64  `json:"matchScore"`
	MatchReasons  []string `json:"matchReasons"`
}

type FreelancerSearchResponse struct {
	Freelancers []FreelancerSearchResult `json:"freelancers"`
	Total       int                      `json:"total"`
	Page        int                      `json:"page"`
	Limit       int                      `json:"limit"`
}
