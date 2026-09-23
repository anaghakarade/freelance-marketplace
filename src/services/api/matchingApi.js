/**
 * matchingApi.js — Project-to-freelancer intelligent matching API client
 * Authenticated endpoints for retrieving explainable talent matches with
 * deterministic 5-factor scoring engine fallback.
 */
import { apiClient } from './apiClient';
import { users as defaultUsers } from '../../data/users';

/**
 * Computes deterministic 5-factor explainable match scores between a project and talent pool.
 * Implements the exact WorkStream deterministic matching algorithm:
 *   - Skill Score: 40%
 *   - Trust Score: 20%
 *   - Rating Score: 15%
 *   - Experience Score: 15%
 *   - Budget Score: 10%
 *
 * @param {Object} project - The project brief
 * @param {Array} candidateUsers - Pool of users to score
 * @returns {Array} Ranked list of ProjectFreelancerMatch objects
 */
export function computeDeterministicMatches(project, candidateUsers = defaultUsers) {
  if (!project) return [];

  // Extract project skills (handle array or comma-separated string)
  let rawSkills = project.skills || [];
  if (typeof rawSkills === 'string') {
    rawSkills = rawSkills.split(',').map(s => s.trim());
  }
  const projectSkills = rawSkills.map(s => String(s).toLowerCase().trim()).filter(Boolean);
  const projectBudget = Number(project.fixedBudget || project.budgetMax || project.budgetMin || 500);

  // Filter to freelancer/seller candidates
  const freelancers = candidateUsers.filter(
    u => u.role === 'freelancer' || u.role === 'seller' || (!u.role && u.skills?.length > 0)
  );

  const results = freelancers.map(user => {
    const userRawSkills = Array.isArray(user.skills) ? user.skills : [];
    
    // 1. Skill Score (40%)
    let skillScore = 75;
    const matchedSkills = [];
    const missingSkills = [];

    if (projectSkills.length > 0) {
      projectSkills.forEach(ps => {
        const found = userRawSkills.find(us => {
          const uStr = String(us).toLowerCase().trim();
          return uStr.includes(ps) || ps.includes(uStr);
        });
        if (found) {
          if (!matchedSkills.includes(found)) matchedSkills.push(found);
        } else {
          missingSkills.push(ps);
        }
      });
      skillScore = Math.min(100, Math.round((matchedSkills.length / projectSkills.length) * 100));
    } else {
      matchedSkills.push(...userRawSkills.slice(0, 3));
    }

    // 2. Trust Score (20%) & Growth Tier (Phase 8 Trust System)
    let growthTier = 'New';
    let trustScore = 40;
    const completed = Number(user.completedProjects || user.completed || 0);
    const avgRating = Number(user.rating || user.averageRating || 4.8);
    const reviewCount = Number(user.reviewsCount || user.ratingCount || 10);

    if (completed >= 20 && avgRating >= 4.8) {
      growthTier = 'Top Performer';
      trustScore = 90;
    } else if (completed >= 10 && avgRating >= 4.5) {
      growthTier = 'Trusted';
      trustScore = 75;
    } else if (completed >= 5 && avgRating >= 4.0) {
      growthTier = 'Established';
      trustScore = 65;
    } else if (completed >= 1) {
      growthTier = 'Rising';
      trustScore = 55;
    } else {
      growthTier = 'New';
      trustScore = 40;
    }

    // 3. Rating Score (15%)
    const ratingScore = avgRating > 0 ? Math.min(100, Math.round((avgRating / 5) * 100)) : 60;

    // 4. Experience Score (15%)
    const experienceScore = Math.min(100, Math.max(30, completed * 10));

    // 5. Budget Score (10%)
    let budgetScore = 100;
    const startingRate = Number(user.startingPrice || 80);
    if (projectBudget > 0 && startingRate > 0) {
      if (startingRate <= projectBudget) {
        budgetScore = 100;
      } else if (startingRate <= projectBudget * 1.25) {
        budgetScore = 80;
      } else if (startingRate <= projectBudget * 1.5) {
        budgetScore = 60;
      } else {
        budgetScore = 40;
      }
    }

    // Weighted composite score (0 - 100)
    const rawScore =
      skillScore * 0.40 +
      trustScore * 0.20 +
      ratingScore * 0.15 +
      experienceScore * 0.15 +
      budgetScore * 0.10;
    const matchScore = Math.min(100, Math.max(10, Math.round(rawScore)));

    // Generate explainable reasons
    const reasons = [];
    if (matchedSkills.length > 0) {
      if (missingSkills.length === 0 && projectSkills.length > 0) {
        reasons.push(`Full match on all required skills (${matchedSkills.join(', ')})`);
      } else {
        reasons.push(`Matched ${matchedSkills.length} of ${projectSkills.length || matchedSkills.length} skills (${matchedSkills.slice(0, 3).join(', ')})`);
      }
    } else {
      reasons.push('Relevant domain capabilities and profile alignment');
    }

    if (growthTier && growthTier !== 'New') {
      reasons.push(`${growthTier} trust profile with verified delivery record`);
    }
    if (avgRating >= 4.5) {
      reasons.push(`${avgRating.toFixed(1)} average rating across ${reviewCount} client reviews`);
    }
    if (completed > 0) {
      reasons.push(`${completed} successfully completed freelance contracts`);
    }
    if (projectBudget > 0 && startingRate <= projectBudget) {
      reasons.push('Starting rates fully align with your project budget');
    }

    return {
      freelancer: {
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          title: user.title || 'Freelance Specialist',
          skills: user.skills || [],
        },
        growthTier,
        averageRating: avgRating,
        ratingCount: reviewCount,
        completed,
      },
      matchScore,
      breakdown: {
        skillMatch: skillScore,
        trust: trustScore,
        rating: ratingScore,
        experience: experienceScore,
        budget: budgetScore,
      },
      reasons,
      matchedSkills,
      missingSkills,
    };
  });

  // Rank by matchScore descending, then rating descending
  results.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return (b.freelancer.averageRating || 0) - (a.freelancer.averageRating || 0);
  });

  return results;
}

export const matchingApi = {
  /**
   * Retrieves deterministic talent matches for a buyer project.
   * Attempts Go backend API first; falls back to the deterministic matching engine
   * if backend is offline, unauthorized, or returns empty matches.
   *
   * @param {string} projectId
   * @param {Object} params - { page, limit }
   * @param {Object} [projectFallback] - The project brief for client-side deterministic fallback
   * @returns {Promise<{ projectId: string, projectName: string, matches: Array, total: number, page: number, limit: number }>}
   */
  getProjectMatches: async (projectId, params = {}, projectFallback = null) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    try {
      const res = await apiClient.get(`/projects/${projectId}/matches${qs ? `?${qs}` : ''}`);
      const unwrapped = res?.data || res;
      const matches = Array.isArray(unwrapped) ? unwrapped : (unwrapped?.matches || []);
      if (matches.length > 0) {
        return unwrapped;
      }
    } catch (err) {
      console.warn('[matchingApi] Backend match endpoint unreachable or unauthorized, falling back to deterministic engine:', err.message);
    }

    // Deterministic fallback using project attributes & active talent pool
    if (projectFallback) {
      const matches = computeDeterministicMatches(projectFallback);
      return {
        projectId,
        projectName: projectFallback.title || 'Project',
        matches,
        total: matches.length,
        page: params.page || 1,
        limit: params.limit || 10,
      };
    }

    return { projectId, matches: [], total: 0 };
  },

  computeDeterministicMatches,
};

export default matchingApi;
