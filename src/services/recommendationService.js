import { recommendationApi } from './api/recommendationApi';
import { marketplaceService } from './marketplaceService';
import { userService } from './userService';

export const recommendationService = {
  getRecommendedServices: async (userId = null, limit = 4) => {
    try {
      const res = await recommendationApi.getRecommendedServices({ limit });
      if (res && res.services && res.services.length > 0) {
        return res.services;
      }
    } catch (err) {
      console.warn('[recommendationService] Server recommendations failed, using local fallback:', err);
    }

    // Local deterministic fallback
    const services = await marketplaceService.getServices();
    if (!userId) {
      return (services || [])
        .filter(s => s.isFeatured || s.rating >= 4.8)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit);
    }

    const favorites = await marketplaceService.getFavorites();
    const favCategories = new Set();
    (favorites || []).forEach(srv => {
      if (srv && srv.categoryId) favCategories.add(srv.categoryId);
    });

    if (favCategories.size > 0) {
      const matched = (services || []).filter(s => favCategories.has(s.categoryId));
      if (matched.length >= limit) return matched.slice(0, limit);
    }

    return (services || []).slice(0, limit);
  },

  getRecommendedFreelancers: (limit = 4) => {
    const freelancers = userService.getFreelancers();
    return freelancers
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);
  },

  getSimilarServices: async (serviceId, limit = 3) => {
    const target = await marketplaceService.getServiceById(serviceId);
    if (!target) return marketplaceService.getFeaturedServices(limit);

    const all = await marketplaceService.getServices();
    return (all || [])
      .filter(s => s.id !== serviceId && s.categoryId === target.categoryId)
      .slice(0, limit);
  },
};

export default recommendationService;
