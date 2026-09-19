/**
 * searchApi.js — Advanced marketplace multi-entity search API client
 * Connects directly to backend /api/search/* endpoints via shared apiClient
 */
import { apiClient } from './apiClient';

export const searchApi = {
  /**
   * Advanced service search with relevance scoring, category, pricing, delivery, and rating filters
   * @param {Object} params
   * @returns {Promise<{ services: Array, total: number, page: number, limit: number }>}
   */
  searchServices: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    if (params.subcategory) query.set('subcategory', params.subcategory);
    if (params.minPrice !== undefined && params.minPrice !== '') query.set('min_price', params.minPrice);
    if (params.maxPrice !== undefined && params.maxPrice !== '') query.set('max_price', params.maxPrice);
    if (params.minRating !== undefined && params.minRating !== '') query.set('rating', params.minRating);
    if (params.delivery !== undefined && params.delivery !== '') query.set('delivery_time', params.delivery);
    if (params.tier) query.set('tier', params.tier);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    const res = await apiClient.get(`/search/services${qs ? `?${qs}` : ''}`);
    return res.data || res;
  },

  /**
   * Advanced talent and freelancer search
   * @param {Object} params
   * @returns {Promise<{ freelancers: Array, total: number, page: number, limit: number }>}
   */
  searchFreelancers: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    if (params.skill) query.set('skill', params.skill);
    if (params.tier) query.set('tier', params.tier);
    if (params.minRating !== undefined && params.minRating !== '') query.set('min_rating', params.minRating);
    if (params.minCompleted !== undefined && params.minCompleted !== '') query.set('min_completed', params.minCompleted);
    if (params.minPrice !== undefined && params.minPrice !== '') query.set('min_price', params.minPrice);
    if (params.maxPrice !== undefined && params.maxPrice !== '') query.set('max_price', params.maxPrice);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    const res = await apiClient.get(`/search/freelancers${qs ? `?${qs}` : ''}`);
    return res.data || res;
  },

  /**
   * Search open buyer projects
   * @param {Object} params
   * @returns {Promise<{ projects: Array, total: number, limit: number, offset: number }>}
   */
  searchProjects: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.category) query.set('category', params.category);
    if (params.skill) query.set('skill', params.skill);
    if (params.minBudget) query.set('min_budget', params.minBudget);
    if (params.maxBudget) query.set('max_budget', params.maxBudget);
    if (params.experienceLevel) query.set('experience_level', params.experienceLevel);
    if (params.budgetType) query.set('budget_type', params.budgetType);
    if (params.sort) query.set('sort', params.sort);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    const res = await apiClient.get(`/search/projects${qs ? `?${qs}` : ''}`);
    return res.data || res;
  },
};

export default searchApi;
