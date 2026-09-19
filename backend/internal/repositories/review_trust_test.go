package repositories

import "testing"

func TestDetermineGrowthTier(t *testing.T) {
	cases := []struct {
		name       string
		completed  int
		reviews    int
		avg        float64
		want       string
	}{
		{"zero completed contracts", 0, 0, 0, "New"},
		{"one completed contract", 1, 0, 0, "Rising"},
		{"established threshold", 5, 3, 4.0, "Established"},
		{"trusted threshold", 10, 8, 4.5, "Trusted"},
		{"top performer threshold", 20, 15, 4.8, "Top Performer"},
		{"highest qualifying wins over lower tiers", 20, 15, 4.8, "Top Performer"},
		{"meets trusted but not top performer", 20, 15, 4.5, "Trusted"},
		{"meets established but not trusted rating", 10, 8, 4.0, "Established"},
		{"high volume without enough reviews stays established", 20, 3, 4.8, "Established"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := DetermineGrowthTier(tc.completed, tc.reviews, tc.avg)
			if got != tc.want {
				t.Fatalf("DetermineGrowthTier(%d,%d,%v)=%q want %q", tc.completed, tc.reviews, tc.avg, got, tc.want)
			}
		})
	}
}

func TestPercentRateUnavailableWhenNoDenominator(t *testing.T) {
	if percentRate(0, 0) != nil {
		t.Fatal("expected nil rate when there is no denominator")
	}
}

func TestPercentRateUsesEvidence(t *testing.T) {
	got := percentRate(2, 4)
	if got == nil || *got != 50 {
		t.Fatalf("expected 50, got %v", got)
	}
}
