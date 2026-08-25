/**
 * apiService.js — Extensible Service Abstraction Layer
 *
 * Provides a clean adapter interface separating React UI components from data storage.
 * Currently delegating to `marketplaceService` (LocalStorage), but fully structured for
 * seamless future swap to Supabase, REST, GraphQL, or Algolia without UI component changes.
 */

import { marketplaceService } from './marketplaceService';

export const apiService = {
  // Services
  getServices: async (filters = {}) => {
    return marketplaceService.getServices(filters);
  },

  getServiceById: async (id) => {
    return marketplaceService.getServiceById(id);
  },

  // Categories & Trending
  getCategories: async () => {
    return marketplaceService.getCategories();
  },

  getTrendingGroups: async () => {
    return marketplaceService.getTrendingGroups();
  },

  // Projects & Matching
  postProject: async (projectData) => {
    // Adapter boundary for posting project requests
    return {
      id: `prj_${Date.now()}`,
      ...projectData,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  },

  // Search Abstraction (Algolia / Meilisearch ready)
  searchMarketplace: async (query, filters = {}) => {
    return marketplaceService.getServices({ ...filters, search: query });
  },
};

export default apiService;
