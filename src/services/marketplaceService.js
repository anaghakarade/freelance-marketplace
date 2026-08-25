import { categories as initialCategories } from '../data/categories';
import { subcategories as initialSubcategories } from '../data/subcategories';
import { tags as initialTags } from '../data/tags';
import { trendingGroups as initialTrendingGroups } from '../data/trendingGroups';
import { services as initialServices } from '../data/services';
import { authService } from './authService';

const CATEGORIES_KEY = 'workstream_categories';
const SUBCATEGORIES_KEY = 'workstream_subcategories';
const TAGS_KEY = 'workstream_tags';
const TRENDING_KEY = 'workstream_trending_groups';
const SERVICES_KEY = 'workstream_services';
const FAVORITES_KEY = 'workstream_favorites';
const DATA_VERSION_KEY = 'workstream_data_version';
const CURRENT_DATA_VERSION = '2.0';

/* ==========================================================================
   DATA VALIDATION & INTEGRITY HELPERS
   ========================================================================== */
function validateTaxonomyData(cats, subs, servs, trendings) {
  if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined') {
    const catIdMap = new Set();
    const catSlugMap = new Set();
    cats.forEach(c => {
      if (catIdMap.has(c.id)) console.warn(`[Taxonomy Validation Error] Duplicate Category ID: ${c.id}`);
      if (catSlugMap.has(c.slug)) console.warn(`[Taxonomy Validation Error] Duplicate Category Slug: ${c.slug}`);
      catIdMap.add(c.id);
      catSlugMap.add(c.slug);
    });

    const subIdMap = new Set();
    subs.forEach(s => {
      if (subIdMap.has(s.id)) console.warn(`[Taxonomy Validation Error] Duplicate Subcategory ID: ${s.id}`);
      subIdMap.add(s.id);
      const parentCat = cats.find(c => c.id === s.categoryId || c.slug === s.categorySlug);
      if (!parentCat) {
        console.warn(`[Taxonomy Validation Error] Subcategory "${s.name}" (${s.id}) references missing parent category: ${s.categoryId || s.categorySlug}`);
      }
    });

    servs.forEach(srv => {
      const parentCat = cats.find(c => c.id === srv.categoryId || c.slug === srv.categorySlug);
      if (!parentCat) {
        console.warn(`[Taxonomy Validation Error] Service "${srv.title}" (${srv.id}) references invalid category: ${srv.categoryId || srv.categorySlug}`);
      }
      if (srv.subcategoryId || srv.subcategorySlug) {
        const parentSub = subs.find(s => s.id === srv.subcategoryId || s.slug === srv.subcategorySlug);
        if (!parentSub) {
          console.warn(`[Taxonomy Validation Error] Service "${srv.title}" (${srv.id}) references invalid subcategory: ${srv.subcategoryId || srv.subcategorySlug}`);
        }
      }
    });

    trendings.forEach(g => {
      if (g.serviceIds && Array.isArray(g.serviceIds)) {
        g.serviceIds.forEach(sid => {
          const srv = servs.find(s => s.id === sid);
          if (!srv) console.warn(`[Taxonomy Validation Notice] Trending Group "${g.title}" references unlisted service ID: ${sid}`);
        });
      }
    });
  }
}

/* ==========================================================================
   VERSIONED SAFE LOCALSTORAGE MIGRATION
   ========================================================================== */
function initializeAndMigrateData() {
  const currentVersion = localStorage.getItem(DATA_VERSION_KEY);

  if (currentVersion !== CURRENT_DATA_VERSION) {
    try {
      // 1. Categories & Subcategories & Trending
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(initialCategories));
      localStorage.setItem(SUBCATEGORIES_KEY, JSON.stringify(initialSubcategories));
      localStorage.setItem(TAGS_KEY, JSON.stringify(initialTags));
      localStorage.setItem(TRENDING_KEY, JSON.stringify(initialTrendingGroups));

      // 2. Services: Preserve custom seller created services if any exist
      let existingServices = [];
      try {
        existingServices = JSON.parse(localStorage.getItem(SERVICES_KEY)) || [];
      } catch (e) {
        existingServices = [];
      }

      const customSellerServices = existingServices.filter(s => s.id && s.id.startsWith('srv_usr_') || (s.id && !initialServices.some(init => init.id === s.id)));

      // Normalize initial services with canonical categoryId & subcategoryId
      const mergedServices = [...initialServices, ...customSellerServices];
      localStorage.setItem(SERVICES_KEY, JSON.stringify(mergedServices));

      // 3. Set Migration Version
      localStorage.setItem(DATA_VERSION_KEY, CURRENT_DATA_VERSION);
      console.log(`[WorkStream] Successfully migrated LocalStorage schema to version ${CURRENT_DATA_VERSION}`);
    } catch (err) {
      console.error('[WorkStream Migration Error] Failed to perform versioned migration:', err);
    }
  }

  // Ensure default fallback keys exist without destroying active sessions or orders
  if (!localStorage.getItem(CATEGORIES_KEY)) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(initialCategories));
  if (!localStorage.getItem(SUBCATEGORIES_KEY)) localStorage.setItem(SUBCATEGORIES_KEY, JSON.stringify(initialSubcategories));
  if (!localStorage.getItem(TAGS_KEY)) localStorage.setItem(TAGS_KEY, JSON.stringify(initialTags));
  if (!localStorage.getItem(TRENDING_KEY)) localStorage.setItem(TRENDING_KEY, JSON.stringify(initialTrendingGroups));
  if (!localStorage.getItem(SERVICES_KEY)) localStorage.setItem(SERVICES_KEY, JSON.stringify(initialServices));
  if (!localStorage.getItem(FAVORITES_KEY)) localStorage.setItem(FAVORITES_KEY, JSON.stringify([]));

  // Run validation check
  validateTaxonomyData(
    JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || initialCategories,
    JSON.parse(localStorage.getItem(SUBCATEGORIES_KEY)) || initialSubcategories,
    JSON.parse(localStorage.getItem(SERVICES_KEY)) || initialServices,
    JSON.parse(localStorage.getItem(TRENDING_KEY)) || initialTrendingGroups
  );
}

// Execute migration check on module load
initializeAndMigrateData();

/* ==========================================================================
   NORMALIZER HELPER (CANONICAL RELATIONSHIPS)
   ========================================================================== */
const normalizeService = (srv) => {
  const categories = JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || initialCategories;
  const subcategories = JSON.parse(localStorage.getItem(SUBCATEGORIES_KEY)) || initialSubcategories;
  const users = authService.getUsers();
  const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];

  // Match by canonical ID first, fallback to slug
  const category = categories.find(c => c.id === srv.categoryId || c.slug === srv.categorySlug) ||
                   categories.find(c => c.slug === srv.category) || null;

  const subcategory = subcategories.find(s => s.id === srv.subcategoryId || s.slug === srv.subcategorySlug) ||
                      subcategories.find(s => s.slug === srv.subcategory) || null;

  const seller = users.find(u => u.id === srv.sellerId);

  // Price resolution: fallback to packages.basic.price or startingPrice
  const basePrice = Number(srv.startingPrice || srv.packages?.basic?.price || srv.price || 50);
  const deliveryDays = Number(srv.deliveryDays || srv.packages?.basic?.deliveryTime || srv.deliveryTime || 3);
  const coverImg = srv.coverImage || srv.image || 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80';

  return {
    ...srv,
    // Canonical reference IDs
    categoryId: category ? category.id : (srv.categoryId || 'cat_2'),
    categoryName: category ? category.name : 'General Services',
    categorySlug: category ? category.slug : (srv.categorySlug || 'programming-tech'),
    subcategoryId: subcategory ? subcategory.id : (srv.subcategoryId || ''),
    subcategoryName: subcategory ? subcategory.name : '',
    subcategorySlug: subcategory ? subcategory.slug : (srv.subcategorySlug || ''),

    sellerName: seller ? seller.name : (srv.sellerName || 'Professional Freelancer'),
    sellerAvatar: seller ? seller.avatar : (srv.sellerAvatar || ''),
    sellerTitle: seller ? seller.title || seller.role : 'Freelance Specialist',
    sellerRating: seller ? seller.rating : (srv.rating || 5.0),

    price: basePrice,
    startingPrice: basePrice,
    deliveryDays: deliveryDays,
    deliveryTime: deliveryDays,
    coverImage: coverImg,
    image: coverImg,
    galleryImages: srv.galleryImages && srv.galleryImages.length > 0 ? srv.galleryImages : [coverImg],
    isFavorite: favorites.includes(srv.id),
    isFeatured: Boolean(srv.isFeatured),
    isTrending: Boolean(srv.isTrending),

    // Right Livelihood / Value Created fields
    problemSolved: srv.problemSolved || 'Businesses need clear, high-quality digital solutions to connect with customers and communicate effectively.',
    whoItHelps: srv.whoItHelps || 'Small businesses, founders, and growing digital teams.',
    valueCreated: srv.valueCreated || 'Delivers clean visual assets and robust code that build long-term trust without deceptive patterns.'
  };
};

/* ==========================================================================
   MARKETPLACE SERVICE EXPORT (SINGLE SOURCE OF TRUTH)
   ========================================================================== */
export const marketplaceService = {

  /* ================= CATEGORIES ================= */
  getCategories: () => {
    const list = JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || initialCategories;
    return list.filter(c => c.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  },

  getCategoryBySlug: (slugOrId) => {
    if (!slugOrId) return null;
    const categories = marketplaceService.getCategories();
    return categories.find(c => c.slug === slugOrId || c.id === slugOrId) || null;
  },

  addCategory: (categoryData) => {
    const list = JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || initialCategories;
    const newCat = {
      id: `cat_${Date.now()}`,
      name: categoryData.name,
      slug: categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: categoryData.description || '',
      iconName: categoryData.iconName || 'Sparkles',
      image: categoryData.image || 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80',
      sortOrder: list.length + 1,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    list.push(newCat);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list));
    return newCat;
  },

  deleteCategory: (categoryId) => {
    let list = JSON.parse(localStorage.getItem(CATEGORIES_KEY)) || initialCategories;
    list = list.filter(c => c.id !== categoryId && c.slug !== categoryId);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(list));
    return true;
  },

  getPopularCategories: (limit = 8) => {
    return marketplaceService.getCategories().slice(0, limit);
  },

  /* ================= SUBCATEGORIES ================= */
  getSubcategories: (categorySlugOrId = null) => {
    const list = JSON.parse(localStorage.getItem(SUBCATEGORIES_KEY)) || initialSubcategories;
    const activeSubs = list.filter(s => s.isActive !== false);
    if (!categorySlugOrId) return activeSubs.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const category = marketplaceService.getCategoryBySlug(categorySlugOrId);
    if (!category) return [];

    return activeSubs.filter(s => s.categoryId === category.id || s.categorySlug === category.slug)
                     .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  },

  getSubcategoryBySlug: (categorySlugOrId, subcategorySlugOrId) => {
    const subs = marketplaceService.getSubcategories(categorySlugOrId);
    return subs.find(s => s.slug === subcategorySlugOrId || s.id === subcategorySlugOrId) || null;
  },

  /* ================= TRENDING GROUPS ================= */
  getTrendingGroups: () => {
    const list = JSON.parse(localStorage.getItem(TRENDING_KEY)) || initialTrendingGroups;
    return list.filter(g => g.isActive !== false).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  },

  getTrendingGroupBySlug: (slugOrId) => {
    if (!slugOrId) return null;
    const groups = marketplaceService.getTrendingGroups();
    return groups.find(g => g.slug === slugOrId || g.id === slugOrId) || null;
  },

  /* ================= TAGS ================= */
  getTags: () => {
    return JSON.parse(localStorage.getItem(TAGS_KEY)) || initialTags;
  },

  /* ================= FAVORITES ================= */
  getFavorites: () => {
    const ids = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    const allServices = JSON.parse(localStorage.getItem(SERVICES_KEY)) || initialServices;
    return allServices.filter(s => ids.includes(s.id)).map(normalizeService);
  },

  toggleFavorite: (serviceId) => {
    let ids = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    if (ids.includes(serviceId)) {
      ids = ids.filter(id => id !== serviceId);
    } else {
      ids.push(serviceId);
    }
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
    return ids.includes(serviceId);
  },

  /* ================= CORE QUERYING, SEARCH & RELEVANCE ================= */
  searchServices: (query) => {
    return marketplaceService.filterServices({ search: query });
  },

  getServicesByCategory: (categorySlugOrId) => {
    return marketplaceService.filterServices({ category: categorySlugOrId });
  },

  getServicesBySubcategory: (subcategorySlugOrId) => {
    return marketplaceService.filterServices({ subcategory: subcategorySlugOrId });
  },

  getServicesByTrendingGroup: (groupIdOrSlug) => {
    return marketplaceService.filterServices({ trendingGroup: groupIdOrSlug });
  },

  getFeaturedServices: (limit = 6) => {
    return marketplaceService.filterServices({ featured: true, limit });
  },

  getTrendingServices: (limit = 6) => {
    return marketplaceService.filterServices({ trending: true, limit });
  },

  getRelatedServices: (service, limit = 4) => {
    if (!service) return [];
    const all = marketplaceService.filterServices({ category: service.categorySlug || service.categoryId });
    return all.filter(s => s.id !== service.id).slice(0, limit);
  },

  /* ================= SORTING UTILITY ================= */
  sortServices: (servicesList, sortBy = 'recommended') => {
    const list = [...servicesList];
    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.startingPrice - b.startingPrice);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.startingPrice - a.startingPrice);
    } else if (sortBy === 'best_rated' || sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0));
    } else if (sortBy === 'most_reviewed') {
      list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'trending') {
      list.sort((a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0) || (b.orderCount || 0) - (a.orderCount || 0));
    }
    return list;
  },

  /* ================= CENTRAL COMPOSABLE FILTER ENGINE ================= */
  filterServices: (filters = {}) => {
    let services = JSON.parse(localStorage.getItem(SERVICES_KEY)) || initialServices;

    // 1. Normalize all records against canonical taxonomy
    services = services.map(normalizeService);

    // 2. Filter by Category (ID or Slug)
    if (filters.category) {
      const cat = marketplaceService.getCategoryBySlug(filters.category);
      if (cat) {
        services = services.filter(srv => srv.categoryId === cat.id || srv.categorySlug === cat.slug);
      } else {
        services = services.filter(srv => srv.categoryId === filters.category || srv.categorySlug === filters.category);
      }
    }

    // 3. Filter by Subcategory (ID or Slug)
    if (filters.subcategory) {
      services = services.filter(srv =>
        srv.subcategoryId === filters.subcategory ||
        srv.subcategorySlug === filters.subcategory
      );
    }

    // 4. Filter by Trending Group (referenced via serviceIds)
    if (filters.trendingGroup || filters.trending) {
      const groupSlug = filters.trendingGroup || (typeof filters.trending === 'string' ? filters.trending : null);
      if (groupSlug) {
        const group = marketplaceService.getTrendingGroupBySlug(groupSlug);
        if (group && group.serviceIds && Array.isArray(group.serviceIds)) {
          services = services.filter(srv => group.serviceIds.includes(srv.id));
        }
      } else if (filters.trending === true || filters.trending === 'true') {
        services = services.filter(srv => srv.isTrending === true);
      }
    }

    // 5. Filter by Featured Status
    if (filters.featured === true || filters.featured === 'true') {
      services = services.filter(srv => srv.isFeatured === true);
    }

    // 6. Search Query with sensible relevance ranking (Title > Tags > Category > Description)
    if (filters.search && typeof filters.search === 'string' && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      services = services.filter(srv => {
        const titleMatch = srv.title.toLowerCase().includes(q);
        const tagMatch = srv.tags && srv.tags.some(t => t.toLowerCase().includes(q));
        const catMatch = srv.categoryName.toLowerCase().includes(q) || (srv.subcategoryName && srv.subcategoryName.toLowerCase().includes(q));
        const descMatch = srv.description.toLowerCase().includes(q);
        const sellerMatch = srv.sellerName && srv.sellerName.toLowerCase().includes(q);

        return titleMatch || tagMatch || catMatch || descMatch || sellerMatch;
      });

      // Relevance ranking
      services.sort((a, b) => {
        const qLower = q;
        const aTitleExact = a.title.toLowerCase().startsWith(qLower) ? 4 : a.title.toLowerCase().includes(qLower) ? 3 : 0;
        const bTitleExact = b.title.toLowerCase().startsWith(qLower) ? 4 : b.title.toLowerCase().includes(qLower) ? 3 : 0;

        const aTagMatch = a.tags && a.tags.some(t => t.toLowerCase() === qLower) ? 2 : 0;
        const bTagMatch = b.tags && b.tags.some(t => t.toLowerCase() === qLower) ? 2 : 0;

        const aScore = aTitleExact + aTagMatch;
        const bScore = bTitleExact + bTagMatch;

        return bScore - aScore;
      });
    }

    // 7. Budget Filter (Min & Max Price)
    if (filters.minPrice !== undefined && filters.minPrice !== '' && !isNaN(filters.minPrice)) {
      services = services.filter(srv => srv.startingPrice >= Number(filters.minPrice));
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== '' && !isNaN(filters.maxPrice)) {
      services = services.filter(srv => srv.startingPrice <= Number(filters.maxPrice));
    }

    // 8. Delivery Speed Filter
    if (filters.maxDeliveryDays !== undefined && filters.maxDeliveryDays !== '' && !isNaN(filters.maxDeliveryDays)) {
      services = services.filter(srv => srv.deliveryDays <= Number(filters.maxDeliveryDays));
    }

    // 9. Minimum Rating Filter
    if (filters.minRating !== undefined && filters.minRating !== '' && !isNaN(filters.minRating)) {
      services = services.filter(srv => srv.rating >= Number(filters.minRating));
    }

    // 10. Tag Filter
    if (filters.tag) {
      const tagLower = String(filters.tag).toLowerCase();
      services = services.filter(srv =>
        srv.tags && srv.tags.some(t => t.toLowerCase() === tagLower)
      );
    }

    // 11. Sort Execution (unless already relevance sorted by search without explicit sort override)
    const sortBy = filters.sort || filters.sortBy || 'recommended';
    if (!filters.search || (filters.sort && filters.sort !== 'recommended')) {
      services = marketplaceService.sortServices(services, sortBy);
    }

    // 12. Pagination & Dual Interface Compatibility
    const total = services.length;
    const isPaginatedCall = filters.page !== undefined || filters.limit !== undefined || filters.paginate === true;
    const page = Math.max(1, parseInt(filters.page) || 1);
    const limit = Math.max(1, parseInt(filters.limit) || (isPaginatedCall ? 24 : total || 100));
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;

    const paginatedSlice = isPaginatedCall ? services.slice(startIndex, startIndex + limit) : services;

    // Attach metadata properties to array for dual object/array compatibility
    paginatedSlice.services = paginatedSlice;
    paginatedSlice.total = total;
    paginatedSlice.page = page;
    paginatedSlice.limit = limit;
    paginatedSlice.totalPages = totalPages;
    paginatedSlice.hasMore = page < totalPages;

    return paginatedSlice;
  },

  /* ================= GET SERVICES ENTRYPOINT ================= */
  getServices: (filters = {}) => {
    return marketplaceService.filterServices(filters);
  },

  /* ================= GET SINGLE SERVICE BY ID OR SLUG ================= */
  getServiceById: (idOrSlug) => {
    if (!idOrSlug) return null;
    const services = JSON.parse(localStorage.getItem(SERVICES_KEY)) || initialServices;
    const srv = services.find(s => s.id === idOrSlug || s.slug === idOrSlug);
    if (!srv) return null;
    return normalizeService(srv);
  },

  /* ================= CREATE SERVICE (SELLER) ================= */
  createService: (serviceData) => {
    const services = JSON.parse(localStorage.getItem(SERVICES_KEY)) || initialServices;
    const currentUser = authService.getCurrentUser();

    if (!currentUser || currentUser.role !== 'freelancer') {
      throw new Error('Only registered Freelancers can create services.');
    }

    const categories = marketplaceService.getCategories();
    const subcategories = marketplaceService.getSubcategories();

    const category = categories.find(c => c.id === serviceData.categoryId || c.slug === serviceData.categorySlug || c.id === serviceData.category);
    const subcategory = subcategories.find(s => s.id === serviceData.subcategoryId || s.slug === serviceData.subcategorySlug || s.id === serviceData.subcategory);

    const titleSlug = serviceData.title ? serviceData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : `service-${Date.now()}`;

    const newService = {
      id: `srv_${Date.now()}`,
      slug: titleSlug,
      sellerId: currentUser.id,
      categoryId: category ? category.id : 'cat_2',
      categorySlug: category ? category.slug : 'programming-tech',
      subcategoryId: subcategory ? subcategory.id : '',
      subcategorySlug: subcategory ? subcategory.slug : '',
      tags: Array.isArray(serviceData.tags) ? serviceData.tags : (typeof serviceData.tags === 'string' ? serviceData.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
      status: 'published',
      isFeatured: false,
      isTrending: false,
      rating: 5.0,
      reviewCount: 0,
      orderCount: 0,
      createdAt: new Date().toISOString(),
      startingPrice: Number(serviceData.startingPrice || serviceData.price || 50),
      deliveryDays: Number(serviceData.deliveryDays || serviceData.deliveryTime || 3),
      coverImage: serviceData.coverImage || serviceData.image || 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=800&q=80',
      description: serviceData.description || '',
      problemSolved: serviceData.problemSolved || '',
      whoItHelps: serviceData.whoItHelps || '',
      valueCreated: serviceData.valueCreated || '',
      requirementsSchema: serviceData.requirements ? [{ id: 'req_1', question: serviceData.requirements, type: 'long_text', required: true }] : []
    };

    services.push(newService);
    localStorage.setItem(SERVICES_KEY, JSON.stringify(services));
    return normalizeService(newService);
  },

  /* ================= TRUST PROFILE HELPER ================= */
  getTrustProfile: (seller) => {
    if (!seller) return null;
    const rating = Number(seller.rating || seller.sellerRating || 4.9);
    const recentRating = Number(seller.recentRating || Math.min(5.0, Number((rating + 0.05).toFixed(1))));
    const completed = Number(seller.completedProjects || seller.orderCount || 24);
    const onTime = Number(seller.onTimeDeliveryRate || 97);
    const verified = seller.verifiedIdentity !== false;
    const returning = Number(seller.returningClientsCount || Math.round(completed * 0.3) || 12);
    const responseTimeHours = Number(seller.responseTimeHours || 1);

    let growthTier = 'Established';
    if (completed > 60 && rating >= 4.8) growthTier = 'Top Talent';
    else if (completed > 30 && rating >= 4.7) growthTier = 'Expert';
    else if (completed > 10) growthTier = 'Rising';
    else growthTier = 'New';

    return {
      verifiedIdentity: verified,
      completedProjects: completed,
      onTimeDeliveryRate: onTime,
      rating: rating,
      recentRating: recentRating,
      returningClientsCount: returning,
      responseTimeHours: responseTimeHours,
      growthTier: seller.growthTier || growthTier
    };
  },

  /* ================= WORKSTREAM MATCH SCORE CALCULATION ================= */
  calculateWorkStreamMatch: (project, sellerOrService) => {
    if (!sellerOrService) return { totalScore: 85, breakdown: { skills: 85, budget: 90, delivery: 90, rating: 95 }, rationale: 'High recommendation based on overall verified expertise.' };

    const projectSkills = project?.skills ? (Array.isArray(project.skills) ? project.skills : project.skills.split(',').map(s => s.trim())) : [];
    const itemSkills = sellerOrService.skills || sellerOrService.tags || [];

    // 1. Skill Match Score
    let skillScore = 80;
    if (projectSkills.length > 0) {
      const matches = projectSkills.filter(ps => itemSkills.some(is => String(is).toLowerCase().includes(String(ps).toLowerCase())));
      skillScore = Math.min(100, Math.round((matches.length / projectSkills.length) * 100) || 75);
    }

    // 2. Budget Score
    const targetBudget = Number(project?.budget || 500);
    const itemPrice = Number(sellerOrService.startingPrice || sellerOrService.price || 100);
    let budgetScore = 95;
    if (itemPrice <= targetBudget) {
      budgetScore = 100;
    } else {
      const diffRatio = (itemPrice - targetBudget) / targetBudget;
      budgetScore = Math.max(50, Math.round(100 - diffRatio * 80));
    }

    // 3. Delivery Score
    const targetDeadline = Number(project?.deadline || 7);
    const itemDelivery = Number(sellerOrService.deliveryDays || sellerOrService.deliveryTime || 3);
    let deliveryScore = 95;
    if (itemDelivery <= targetDeadline) {
      deliveryScore = 100;
    } else {
      deliveryScore = Math.max(60, 100 - (itemDelivery - targetDeadline) * 10);
    }

    // 4. Rating & Reliability Score
    const ratingVal = Number(sellerOrService.rating || sellerOrService.sellerRating || 4.8);
    const ratingScore = Math.round((ratingVal / 5) * 100);

    // Composite WorkStream Match Calculation
    const totalScore = Math.round(
      skillScore * 0.40 +
      budgetScore * 0.25 +
      deliveryScore * 0.15 +
      ratingScore * 0.20
    );

    const primarySkills = projectSkills.slice(0, 2).join(', ') || 'your requirements';
    const rationale = `Recommended because this provider matches ${primarySkills} within your target budget.`;

    return {
      totalScore,
      breakdown: {
        skills: skillScore,
        budget: budgetScore,
        delivery: deliveryScore,
        rating: ratingScore
      },
      rationale
    };
  },

  /* ================= PROJECT POSTS STORE ================= */
  getProjectPosts: () => {
    try {
      return JSON.parse(localStorage.getItem('workstream_projects')) || [];
    } catch (e) {
      return [];
    }
  },

  createProjectPost: (projectData) => {
    const projects = marketplaceService.getProjectPosts();
    const newProj = {
      id: `proj_${Date.now()}`,
      title: projectData.title,
      description: projectData.description,
      outcomeGoal: projectData.outcomeGoal || 'BUILD YOUR BRAND',
      budget: Number(projectData.budget || 300),
      deadlineDays: Number(projectData.deadline || 7),
      skills: Array.isArray(projectData.skills) ? projectData.skills : (projectData.skills ? projectData.skills.split(',').map(s => s.trim()) : []),
      categoryId: projectData.categoryId || 'cat_2',
      buyerId: projectData.buyerId || 'usr_6',
      createdAt: new Date().toISOString()
    };
    projects.unshift(newProj);
    localStorage.setItem('workstream_projects', JSON.stringify(projects));
    return newProj;
  }
};
