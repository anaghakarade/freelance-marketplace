import { marketplaceService } from './marketplaceService';
import { userService } from './userService';
import { analyticsService } from './analyticsService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const searchService = {
  /**
   * Search services with query ranking and gap logging
   * @param {string} query
   * @param {Object} filters
   * @returns {Promise<{ results: Array, totalCount: number, isZeroResult: boolean }>}
   */
  searchServices: async (query = '', filters = {}) => {
    const q = query.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      let dbQuery = supabase.from('services').select('*', { count: 'exact' });

      if (q) {
        dbQuery = dbQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }
      if (filters.category) {
        dbQuery = dbQuery.eq('category_id', filters.category);
      }
      if (filters.minPrice) {
        dbQuery = dbQuery.gte('starting_price', filters.minPrice);
      }
      if (filters.maxPrice) {
        dbQuery = dbQuery.lte('starting_price', filters.maxPrice);
      }

      const { data, count, error } = await dbQuery;

      if (!error && data) {
        const isZeroResult = data.length === 0 && q.length > 0;
        if (isZeroResult) {
          analyticsService.trackZeroResultSearch(q);
        }
        return { results: data, totalCount: count || data.length, isZeroResult };
      }
    }

    // LocalStorage fallback
    const results = marketplaceService.getServices({ ...filters, search: q });
    const isZeroResult = results.length === 0 && q.length > 0;

    if (isZeroResult) {
      analyticsService.trackZeroResultSearch(q);
    }

    return {
      results,
      totalCount: results.length,
      isZeroResult,
    };
  },

  searchFreelancers: (query = '') => {
    const q = query.trim().toLowerCase();
    const freelancers = userService.getFreelancers();

    if (!q) return freelancers;

    return freelancers.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.title && f.title.toLowerCase().includes(q)) ||
      (f.skills && f.skills.some(s => s.toLowerCase().includes(q)))
    );
  },

  autocomplete: (query = '') => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const categories = marketplaceService.getCategories();
    const services = marketplaceService.getServices();

    const catMatches = categories
      .filter(c => c.name.toLowerCase().includes(q))
      .map(c => ({ type: 'category', text: c.name, slug: c.slug }));

    const srvMatches = services
      .filter(s => s.title.toLowerCase().includes(q))
      .slice(0, 5)
      .map(s => ({ type: 'service', text: s.title, id: s.id, slug: s.slug }));

    return [...catMatches, ...srvMatches];
  },
};

export default searchService;
