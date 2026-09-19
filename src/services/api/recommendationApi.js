/**
 * recommendationApi.js — Personalized discovery and interaction tracking client
 */
import { apiClient } from './apiClient';

export const recommendationApi = {
  /**
   * Retrieves deterministic personalized service recommendations
   * @param {Object} params - { limit }
   * @returns {Promise<{ services: Array, limit: number }>}
   */
  getRecommendedServices: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    const res = await apiClient.get(`/recommendations/services${qs ? `?${qs}` : ''}`);
    return res.data || res;
  },

  /**
   * Records a user interaction signal for personalization
   * @param {Object} event - { interactionType, targetType, targetId, metadata }
   * @returns {Promise<{ recorded: boolean }>}
   */
  recordInteraction: async (event) => {
    try {
      const res = await apiClient.post('/recommendations/events', event);
      return res.data || res;
    } catch {
      // Non-blocking interaction recording
      return { recorded: false };
    }
  },
};

export default recommendationApi;
