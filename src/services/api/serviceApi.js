/**
 * serviceApi.js — Service & Gig API Adapter (Phase 4B)
 *
 * Communicates with:
 *   GET    /api/services            — list published services with filters
 *   GET    /api/services/:id        — single service by ID or slug
 *   POST   /api/services            — create service (draft or published)
 *   PATCH  /api/services/:id        — update service (seller or admin)
 *   POST   /api/services/:id/publish — publish draft/archived service
 *   POST   /api/services/:id/archive — archive service
 *   DELETE /api/services/:id        — delete draft service
 *   GET    /api/seller/services     — get authenticated seller's services
 */

import { apiClient } from './apiClient';

/**
 * Fetch public published services with optional filters.
 *
 * @param {Object} opts
 * @param {string}  [opts.category]      - category slug
 * @param {string}  [opts.subcategory]   - subcategory slug
 * @param {string}  [opts.search]        - search query
 * @param {boolean} [opts.featured]      - featured only
 * @param {boolean} [opts.trending]      - trending only
 * @param {string}  [opts.trendingGroup] - trending group slug
 * @param {number}  [opts.minRating]     - minimum rating
 * @param {number}  [opts.maxPrice]      - maximum price
 * @param {string}  [opts.sort]          - sort field
 * @param {number}  [opts.limit]         - page size (default 50 for marketplace)
 * @param {number}  [opts.offset]        - pagination offset
 * @returns {Promise<Array>}
 */
export async function getServices({
  category,
  subcategory,
  search,
  featured,
  trending,
  trendingGroup,
  minRating,
  minPrice,
  maxPrice,
  sort,
  limit = 50,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();

  if (category) params.set('category', category);
  if (subcategory) params.set('subcategory', subcategory);
  if (search && search.trim()) params.set('search', search.trim());
  if (featured === true) params.set('featured', 'true');
  if (trending === true) params.set('trending', 'true');
  if (trendingGroup) params.set('trending_group', trendingGroup);
  if (minRating !== undefined && minRating !== '' && !isNaN(minRating)) {
    params.set('min_rating', String(minRating));
  }
  if (minPrice !== undefined && minPrice !== '' && !isNaN(minPrice)) {
    params.set('min_price', String(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== '' && !isNaN(maxPrice)) {
    params.set('max_price', String(maxPrice));
  }
  if (sort && sort !== 'recommended') params.set('sort', sort);
  if (limit) params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));

  const qs = params.toString();
  const endpoint = `/services${qs ? `?${qs}` : ''}`;
  return apiClient.get(endpoint);
}

/**
 * Fetch a single service by ID or slug.
 *
 * @param {string} id - service ID (e.g. "srv_1" or "1")
 * @returns {Promise<Object>}
 */
export async function getServiceById(id) {
  return apiClient.get(`/services/${encodeURIComponent(id)}`);
}

/**
 * Create a new service (draft or published).
 *
 * @param {Object} data - service creation payload
 * @returns {Promise<Object>}
 */
export async function createService(data) {
  return apiClient.post('/services', data);
}

/**
 * Update an existing service.
 *
 * @param {string} id - service ID
 * @param {Object} data - update payload
 * @returns {Promise<Object>}
 */
export async function updateService(id, data) {
  return apiClient.patch(`/services/${encodeURIComponent(id)}`, data);
}

/**
 * Publish a service.
 *
 * @param {string} id - service ID
 * @returns {Promise<Object>}
 */
export async function publishService(id) {
  return apiClient.post(`/services/${encodeURIComponent(id)}/publish`);
}

/**
 * Archive a service.
 *
 * @param {string} id - service ID
 * @returns {Promise<Object>}
 */
export async function archiveService(id) {
  return apiClient.post(`/services/${encodeURIComponent(id)}/archive`);
}

/**
 * Delete a draft service.
 *
 * @param {string} id - service ID
 * @returns {Promise<Object>}
 */
export async function deleteService(id) {
  return apiClient.delete(`/services/${encodeURIComponent(id)}`);
}

/**
 * Fetch services belonging to the authenticated seller.
 *
 * @param {Object} opts
 * @param {string} [opts.status] - "draft", "published", "archived", or "all"
 * @param {number} [opts.limit]  - page size
 * @param {number} [opts.offset] - offset
 * @returns {Promise<{services: Array, total: number, limit: number, offset: number}>}
 */
export async function getMyServices({ status, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  if (limit) params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));

  const qs = params.toString();
  return apiClient.get(`/seller/services${qs ? `?${qs}` : ''}`);
}

export const serviceApi = {
  getServices,
  getServiceById,
  createService,
  updateService,
  publishService,
  archiveService,
  deleteService,
  getMyServices,
};

export default serviceApi;
