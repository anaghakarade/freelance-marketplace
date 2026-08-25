import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from './authService';

const ANALYTICS_KEY = 'workstream_analytics_events';

export const analyticsService = {
  /**
   * Log marketplace event
   * @param {string} eventName - e.g. 'service_view' | 'search' | 'order_created' | 'zero_result_search'
   * @param {Object} metadata
   */
  trackEvent: async (eventName, metadata = {}) => {
    const currentUser = authService.getCurrentUser();
    const payload = {
      event_name: eventName,
      user_id: currentUser ? currentUser.id : null,
      metadata,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('search_logs').insert({
        query: eventName === 'zero_result_search' ? metadata.query : eventName,
        result_count: metadata.resultCount || 0,
        user_id: payload.user_id,
      });
      return;
    }

    // LocalStorage fallback log
    const logs = JSON.parse(localStorage.getItem(ANALYTICS_KEY)) || [];
    logs.push(payload);
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(logs.slice(-200)));
  },

  trackZeroResultSearch: (query) => {
    analyticsService.trackEvent('zero_result_search', { query, resultCount: 0 });
    console.warn(`[WorkStream Analytics] Zero-result search logged: "${query}"`);
  },

  getAnalyticsSummary: async () => {
    const logs = JSON.parse(localStorage.getItem(ANALYTICS_KEY)) || [];
    const zeroResults = logs.filter(l => l.event_name === 'zero_result_search');
    return {
      totalEvents: logs.length,
      zeroResultCount: zeroResults.length,
      topZeroQueries: zeroResults.map(z => z.metadata?.query).filter(Boolean),
    };
  },
};

export default analyticsService;
