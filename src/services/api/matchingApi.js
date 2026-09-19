/**
 * matchingApi.js — Project-to-freelancer intelligent matching API client
 * Authenticated endpoints for retrieving explainable talent matches
 */
import { apiClient } from './apiClient';

export const matchingApi = {
  /**
   * Retrieves deterministic talent matches for a buyer project
   * @param {string} projectId
   * @param {Object} params - { page, limit }
   * @returns {Promise<{ projectId: string, projectName: string, matches: Array, total: number, page: number, limit: number }>}
   */
  getProjectMatches: async (projectId, params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    const res = await apiClient.get(`/projects/${projectId}/matches${qs ? `?${qs}` : ''}`);
    return res.data || res;
  },
};

export default matchingApi;
