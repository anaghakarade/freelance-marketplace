package services

import (
	"regexp"
	"strings"
)

var (
	punctRegex = regexp.MustCompile(`[^\w\s\+\#\/\.\-]`)
	spaceRegex = regexp.MustCompile(`\s+`)
)

// canonicalAliasMap maps common variations to normalized conceptual skills
var canonicalAliasMap = map[string]string{
	"react.js":       "react",
	"reactjs":        "react",
	"react js":       "react",
	"vue.js":         "vue",
	"vuejs":          "vue",
	"vue js":         "vue",
	"node.js":        "node",
	"nodejs":         "node",
	"node js":        "node",
	"next.js":        "next",
	"nextjs":         "next",
	"next js":        "next",
	"nuxt.js":        "nuxt",
	"nuxtjs":         "nuxt",
	"angular.js":     "angular",
	"angularjs":      "angular",
	"ts":             "typescript",
	"typescript.js":  "typescript",
	"js":             "javascript",
	"javascript.js":  "javascript",
	"golang":         "go",
	"go lang":        "go",
	"postgres":       "postgresql",
	"psql":           "postgresql",
	"postgres-db":    "postgresql",
	"mongo":          "mongodb",
	"mongo db":       "mongodb",
	"aws":            "aws",
	"amazon web services": "aws",
	"k8s":            "kubernetes",
	"docker-compose": "docker",
	"ui/ux":          "ui/ux",
	"ui / ux":        "ui/ux",
	"ui-ux":          "ui/ux",
	"ux/ui":          "ui/ux",
	"three.js":       "three.js",
	"threejs":        "three.js",
	"three js":       "three.js",
	"three-js":       "three.js",
	"tailwind":       "tailwindcss",
	"tailwind css":   "tailwindcss",
	"tailwind-css":   "tailwindcss",
	"graphql":        "graphql",
	"graph-ql":       "graphql",
	"rest api":       "rest api",
	"restful api":    "rest api",
	"rest apis":      "rest api",
	"python 3":       "python",
	"py":             "python",
}

// NormalizeSkill normalizes skill strings by trimming, lowercasing, and resolving aliases
func NormalizeSkill(raw string) string {
	cleaned := strings.TrimSpace(strings.ToLower(raw))
	cleaned = punctRegex.ReplaceAllString(cleaned, "")
	cleaned = spaceRegex.ReplaceAllString(cleaned, " ")

	if alias, exists := canonicalAliasMap[cleaned]; exists {
		return alias
	}
	return cleaned
}

// MatchSkills compares project requirements with candidate skills and returns score, matched and missing items
func MatchSkills(required []string, candidate []string) (score float64, matched []string, missing []string) {
	if len(required) == 0 {
		// If project has no specific required skills, default score is 100
		return 100.0, candidate, nil
	}

	candidateMap := make(map[string]bool)
	for _, s := range candidate {
		norm := NormalizeSkill(s)
		if norm != "" {
			candidateMap[norm] = true
		}
	}

	for _, req := range required {
		normReq := NormalizeSkill(req)
		if normReq == "" {
			continue
		}

		found := false
		if candidateMap[normReq] {
			found = true
		} else {
			// Substring / prefix check (e.g. candidate has "full-stack react", req is "react")
			for cand := range candidateMap {
				if strings.Contains(cand, normReq) || strings.Contains(normReq, cand) {
					found = true
					break
				}
			}
		}

		if found {
			matched = append(matched, req)
		} else {
			missing = append(missing, req)
		}
	}

	if len(required) > 0 {
		score = (float64(len(matched)) / float64(len(required))) * 100.0
	} else {
		score = 100.0
	}

	return score, matched, missing
}
