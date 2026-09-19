import { apiClient } from './apiClient';

// Backend applies the trust-tier and matching rules; this adapter only serializes filters.
export async function searchFreelancers(filters = {}) {
  const params = new URLSearchParams();
  [['q', filters.q], ['category', filters.category], ['skill', filters.skill], ['tier', filters.tier], ['sort', filters.sort], ['page', filters.page], ['limit', filters.limit], ['min_rating', filters.minRating]].forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const query = params.toString();
  return apiClient.get(`/freelancers${query ? `?${query}` : ''}`);
}

export default { searchFreelancers };
