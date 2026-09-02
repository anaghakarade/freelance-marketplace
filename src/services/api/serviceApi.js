/**
 * serviceApi.js — Service & Gig API Service Adapter
 */

import { apiClient } from './apiClient';

export const serviceApi = {
  /**
   * Fetch services with optional category/subcategory filters and pagination
   */
  getServices: async ({ category, subcategory, limit = 20, offset = 0 } = {}) => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (subcategory) params.append('subcategory', subcategory);
    if (limit) params.append('limit', String(limit));
    if (offset) params.append('offset', String(offset));

    const queryString = params.toString();
    const endpoint = `/services${queryString ? `?${queryString}` : ''}`;
    return apiClient.get(endpoint);
  },

  /**
   * Fetch a single service by ID
   */
  getServiceById: async (id) => {
    return apiClient.get(`/services/${encodeURIComponent(id)}`);
  },
};

export default serviceApi;
