import { searchApi } from './api/searchApi';
import { marketplaceService } from './marketplaceService';
import { userService } from './userService';
import { analyticsService } from './analyticsService';

export const searchService = {
  /**
   * Search services with query ranking and relevance
   * @param {string} query
   * @param {Object} filters
   * @returns {Promise<{ results: Array, totalCount: number, isZeroResult: boolean }>}
   */
  searchServices: async (query = '', filters = {}) => {
    const q = query.trim();

    try {
      const response = await searchApi.searchServices({
        q,
        category: filters.category,
        subcategory: filters.subcategory,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minRating: filters.minRating,
        delivery: filters.delivery,
        sort: filters.sort || 'relevance',
        page: filters.page || 1,
        limit: filters.limit || 24,
      });

      const items = response.services || [];
      const total = response.total !== undefined ? response.total : items.length;
      const unwrapped = items.map(it => it.service ? { ...it.service, relevanceScore: it.relevanceScore, highlights: it.highlights } : it);

      const isZeroResult = unwrapped.length === 0 && q.length > 0;
      if (isZeroResult) {
        analyticsService.trackZeroResultSearch(q);
      }

      return {
        results: unwrapped,
        totalCount: total,
        isZeroResult,
      };
    } catch (err) {
      console.warn('[searchService] Server search failed, falling back to marketplaceService:', err);
      const results = await marketplaceService.getServices({ ...filters, search: q });
      const isZeroResult = results.length === 0 && q.length > 0;
      return {
        results: results || [],
        totalCount: (results || []).length,
        isZeroResult,
      };
    }
  },

  /**
   * Search talent and freelancers via server discovery
   */
  searchFreelancers: async (query = '', filters = {}) => {
    const q = query.trim();
    try {
      const response = await searchApi.searchFreelancers({ q, ...filters });
      return response.freelancers || [];
    } catch {
      const freelancers = userService.getFreelancers();
      if (!q) return freelancers;
      return freelancers.filter(f =>
        f.name.toLowerCase().includes(q.toLowerCase()) ||
        (f.title && f.title.toLowerCase().includes(q.toLowerCase())) ||
        (f.skills && f.skills.some(s => s.toLowerCase().includes(q.toLowerCase())))
      );
    }
  },

  autocomplete: (query = '') => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const categories = marketplaceService.getCategories();
    const services = marketplaceService.getServices();

    const catMatches = (categories || [])
      .filter(c => c && c.name && c.name.toLowerCase().includes(q))
      .map(c => ({ type: 'category', text: c.name, slug: c.slug }));

    const srvMatches = (services || [])
      .filter(s => s && s.title && s.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map(s => ({ type: 'service', text: s.title, id: s.id, slug: s.slug }));

    return [...catMatches, ...srvMatches];
  },
};

export default searchService;
