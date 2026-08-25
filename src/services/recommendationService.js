import { marketplaceService } from './marketplaceService';
import { userService } from './userService';

export const recommendationService = {
  getRecommendedServices: (userId = null, limit = 4) => {
    const services = marketplaceService.getServices();

    if (!userId) {
      // Deterministic fallback: return featured + highest rated services
      return services
        .filter(s => s.isFeatured || s.rating >= 4.8)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit);
    }

    // Signal-based filtering for user
    const favorites = marketplaceService.getFavorites();
    const favCategories = new Set();
    favorites.forEach(fId => {
      const srv = marketplaceService.getServiceById(fId);
      if (srv) favCategories.add(srv.categoryId);
    });

    if (favCategories.size > 0) {
      const matched = services.filter(s => favCategories.has(s.categoryId));
      if (matched.length >= limit) return matched.slice(0, limit);
    }

    return services.slice(0, limit);
  },

  getRecommendedFreelancers: (limit = 4) => {
    const freelancers = userService.getFreelancers();
    return freelancers
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, limit);
  },

  getSimilarServices: (serviceId, limit = 3) => {
    const target = marketplaceService.getServiceById(serviceId);
    if (!target) return marketplaceService.getFeaturedServices(limit);

    return marketplaceService
      .getServices()
      .filter(s => s.id !== serviceId && s.categoryId === target.categoryId)
      .slice(0, limit);
  },
};

export default recommendationService;
