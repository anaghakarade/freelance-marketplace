/**
 * categoryApi.js — Category & Subcategory API Service Adapter
 */

import { apiClient } from './apiClient';

export const categoryApi = {
  /**
   * Fetch all active categories
   */
  getAllCategories: async () => {
    return apiClient.get('/categories');
  },

  /**
   * Fetch a single category by slug with its subcategories
   */
  getCategoryBySlug: async (slug) => {
    return apiClient.get(`/categories/${encodeURIComponent(slug)}`);
  },

  /**
   * Fetch subcategories for a category slug
   */
  getSubcategories: async (categorySlug) => {
    return apiClient.get(`/categories/${encodeURIComponent(categorySlug)}/subcategories`);
  },
};

export default categoryApi;
