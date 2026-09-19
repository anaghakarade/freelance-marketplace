/**
 * marketplaceService.js — WorkStream Marketplace Service Layer (Phase 4B)
 *
 * ARCHITECTURE:
 *   Components → marketplaceService → API (backend) → Go + PostgreSQL
 *
 * All functions that manage services, categories, and seller service lifecycles
 * (create, update, publish, archive, delete, getMyServices) are ASYNC and call the Go backend API.
 *
 * Functions that manage local preferences (favorites, tags, project posts, trust scores)
 * remain synchronous or hybrid as appropriate.
 */

import { trendingGroups as localTrendingGroups } from '../data/trendingGroups';
import { tags as initialTags } from '../data/tags';
import { categoryApi } from './api/categoryApi';
import {
  getServices as apiGetServices,
  getServiceById as apiGetServiceById,
  createService as apiCreateService,
  updateService as apiUpdateService,
  publishService as apiPublishService,
  archiveService as apiArchiveService,
  deleteService as apiDeleteService,
  getMyServices as apiGetMyServices,
} from './api/serviceApi';

// ─── LocalStorage Keys (preferences & user-generated data only) ──────────────
const FAVORITES_KEY = 'workstream_favorites';
const TAGS_KEY = 'workstream_tags';

// ─── Initialize favorites store if absent ────────────────────────────────────
if (!localStorage.getItem(FAVORITES_KEY)) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([]));
}

/* =============================================================================
   CATEGORIES — from backend API
   ============================================================================= */

/**
 * Fetch all active categories from the backend.
 * @returns {Promise<Array>}
 */
async function getCategories() {
  return categoryApi.getAllCategories();
}

/**
 * Fetch a single category by slug from the backend.
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
async function getCategoryBySlug(slug) {
  if (!slug) return null;
  try {
    return await categoryApi.getCategoryBySlug(slug);
  } catch (err) {
    if (err.message?.includes('404') || err.message?.toLowerCase().includes('not found')) {
      return null;
    }
    throw err;
  }
}

/**
 * Fetch subcategories for a category by slug from the backend.
 * Pass null/undefined to get an empty array.
 * @param {string|null} categorySlug
 * @returns {Promise<Array>}
 */
async function getSubcategories(categorySlug = null) {
  if (!categorySlug) return [];
  try {
    return await categoryApi.getSubcategories(categorySlug);
  } catch (err) {
    if (err.message?.includes('404') || err.message?.toLowerCase().includes('not found')) {
      return [];
    }
    throw err;
  }
}

/**
 * Convenience: return popular categories (first N).
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getPopularCategories(limit = 8) {
  const cats = await getCategories();
  return cats.slice(0, limit);
}

function addCategory(categoryData) {
  console.info('[marketplaceService] addCategory called:', categoryData.name);
  return {
    id: `cat_${Date.now()}`,
    name: categoryData.name,
    slug: categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    description: categoryData.description || '',
    iconName: categoryData.iconName || 'Sparkles',
    sortOrder: 99,
    isActive: true,
  };
}

function deleteCategory(categoryId) {
  console.info('[marketplaceService] deleteCategory called:', categoryId);
  return true;
}

/* =============================================================================
   SERVICES — from backend API
   ============================================================================= */

/**
 * Map frontend filter keys to backend API parameters and fetch services.
 *
 * Accepts the same filter shape used throughout the frontend:
 *   { category, subcategory, search, trendingGroup, trending,
 *     featured, minRating, maxPrice, minPrice, maxDeliveryDays,
 *     sort, sortBy, page, limit }
 *
 * Returns an array with metadata properties attached for backward compat:
 *   result.total, result.page, result.limit, result.totalPages, result.hasMore
 *
 * @param {Object} filters
 * @returns {Promise<Array>}
 */
async function filterServices(filters = {}) {
  // Map trendingGroup from either key
  const trendingGroup =
    filters.trendingGroup ||
    (typeof filters.trending === 'string' && filters.trending.length > 0 && filters.trending !== 'true'
      ? filters.trending
      : undefined);

  // trending boolean
  const isTrending =
    !trendingGroup && (filters.trending === true || filters.trending === 'true')
      ? true
      : undefined;

  // Featured boolean
  const isFeatured =
    filters.featured === true || filters.featured === 'true' ? true : undefined;

  // Pagination: backend uses offset, frontend uses page
  const limit = filters.limit || (filters.paginate ? 24 : 50);
  const page = Math.max(1, parseInt(filters.page) || 1);
  const offset = (page - 1) * limit;

  const results = await apiGetServices({
    category: filters.category || undefined,
    subcategory: filters.subcategory || undefined,
    search: filters.search || undefined,
    featured: isFeatured,
    trending: isTrending,
    trendingGroup: trendingGroup || undefined,
    minRating:
      filters.minRating !== undefined && filters.minRating !== '' && !isNaN(filters.minRating)
        ? Number(filters.minRating)
        : undefined,
    maxPrice:
      filters.maxPrice !== undefined && filters.maxPrice !== '' && !isNaN(filters.maxPrice)
        ? Number(filters.maxPrice)
        : undefined,
    sort: filters.sort || filters.sortBy || undefined,
    limit,
    offset,
  });

  // Backend returns an array directly; attach metadata for backward compat
  const arr = Array.isArray(results) ? results : [];

  // Mark favorites
  const favoriteIds = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  const enriched = arr.map(srv => ({ ...srv, isFavorite: favoriteIds.includes(srv.id) }));

  // Attach pagination metadata to array for dual object/array compatibility
  const total = enriched.length + offset; // best estimate without server total
  const totalPages = Math.ceil((total || enriched.length) / limit) || 1;

  enriched.services = enriched;
  enriched.total = total;
  enriched.page = page;
  enriched.limit = limit;
  enriched.totalPages = totalPages;
  enriched.hasMore = enriched.length === limit;

  return enriched;
}

/**
 * Main services entrypoint — wraps filterServices.
 * @param {Object} filters
 * @returns {Promise<Array>}
 */
async function getServices(filters = {}) {
  return filterServices(filters);
}

/**
 * Fetch a single service by ID or slug from the backend.
 * @param {string} idOrSlug
 * @returns {Promise<Object|null>}
 */
async function getServiceById(idOrSlug) {
  if (!idOrSlug) return null;
  try {
    const srv = await apiGetServiceById(idOrSlug);
    if (!srv) return null;
    const favoriteIds = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    return { ...srv, isFavorite: favoriteIds.includes(srv.id) };
  } catch (err) {
    if (err.message?.includes('404') || err.message?.toLowerCase().includes('not found')) {
      return null;
    }
    throw err;
  }
}

/**
 * Fetch featured services.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getFeaturedServices(limit = 6) {
  return filterServices({ featured: true, limit });
}

/**
 * Fetch trending services.
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getTrendingServices(limit = 6) {
  return filterServices({ trending: true, limit });
}

/**
 * Search services by query string.
 * @param {string} query
 * @returns {Promise<Array>}
 */
async function searchServices(query) {
  return filterServices({ search: query });
}

/**
 * Fetch services belonging to a trending group.
 * @param {string} groupIdOrSlug
 * @returns {Promise<Array>}
 */
async function getServicesByTrendingGroup(groupIdOrSlug) {
  return filterServices({ trendingGroup: groupIdOrSlug });
}

/**
 * Fetch services by category.
 * @param {string} categorySlugOrId
 * @returns {Promise<Array>}
 */
async function getServicesByCategory(categorySlugOrId) {
  return filterServices({ category: categorySlugOrId });
}

/**
 * Fetch related services for a given service (same category, excluding itself).
 * @param {Object} service
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getRelatedServices(service, limit = 4) {
  if (!service) return [];
  const all = await filterServices({ category: service.categorySlug || service.categoryId });
  return all.filter(s => s.id !== service.id).slice(0, limit);
}

/* =============================================================================
   SELLER SERVICE MANAGEMENT (Phase 4B — PostgreSQL Backend)
   ============================================================================= */

/**
 * Create a new service listing in the backend (draft or published).
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
async function createService(serviceData) {
  return apiCreateService(serviceData);
}

/**
 * Update an existing service listing in the backend.
 * @param {string} id
 * @param {Object} serviceData
 * @returns {Promise<Object>}
 */
async function updateService(id, serviceData) {
  return apiUpdateService(id, serviceData);
}

/**
 * Publish a service.
 * @param {string} id
 * @returns {Promise<Object>}
 */
async function publishService(id) {
  return apiPublishService(id);
}

/**
 * Archive a service.
 * @param {string} id
 * @returns {Promise<Object>}
 */
async function archiveService(id) {
  return apiArchiveService(id);
}

/**
 * Delete a draft service.
 * @param {string} id
 * @returns {Promise<Object>}
 */
async function deleteService(id) {
  return apiDeleteService(id);
}

/**
 * Fetch all services belonging to the authenticated seller from the backend.
 * @param {Object} params
 * @param {string} [params.status] - "draft", "published", "archived", "all"
 * @param {number} [params.limit]
 * @param {number} [params.offset]
 * @returns {Promise<{services: Array, total: number, limit: number, offset: number}>}
 */
async function getMyServices(params = {}) {
  return apiGetMyServices(params);
}

/* =============================================================================
   TRENDING GROUPS — local metadata
   ============================================================================= */

function getTrendingGroups() {
  return localTrendingGroups.filter(g => g.isActive !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function getTrendingGroupBySlug(slugOrId) {
  if (!slugOrId) return null;
  return localTrendingGroups.find(g => g.slug === slugOrId || g.id === slugOrId) || null;
}

/* =============================================================================
   TAGS — local data
   ============================================================================= */

function getTags() {
  return JSON.parse(localStorage.getItem(TAGS_KEY)) || initialTags;
}

/* =============================================================================
   FAVORITES — LocalStorage IDs, service data from API
   ============================================================================= */

async function getFavorites() {
  const ids = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  if (ids.length === 0) return [];
  const results = await Promise.allSettled(ids.map(id => getServiceById(id)));
  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}

function toggleFavorite(serviceId) {
  let ids = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  if (ids.includes(serviceId)) {
    ids = ids.filter(id => id !== serviceId);
  } else {
    ids.push(serviceId);
  }
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  return ids.includes(serviceId);
}

/* =============================================================================
   TRUST PROFILE — computed from seller data
   ============================================================================= */

function getTrustProfile(seller) {
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
    rating,
    recentRating,
    returningClientsCount: returning,
    responseTimeHours,
    growthTier: seller.growthTier || growthTier,
  };
}

/* =============================================================================
   WORKSTREAM MATCH SCORE — computed locally
   ============================================================================= */

function calculateWorkStreamMatch(project, sellerOrService) {
  if (!sellerOrService) {
    return {
      totalScore: 85,
      breakdown: { skills: 85, budget: 90, delivery: 90, rating: 95 },
      rationale: 'High recommendation based on overall verified expertise.',
    };
  }

  const projectSkills = project?.skills
    ? Array.isArray(project.skills)
      ? project.skills
      : project.skills.split(',').map(s => s.trim())
    : [];
  const itemSkills = sellerOrService.skills || sellerOrService.tags || [];

  let skillScore = 80;
  if (projectSkills.length > 0) {
    const matches = projectSkills.filter(ps =>
      itemSkills.some(is => String(is).toLowerCase().includes(String(ps).toLowerCase()))
    );
    skillScore = Math.min(100, Math.round((matches.length / projectSkills.length) * 100) || 75);
  }

  const targetBudget = Number(project?.budget || 500);
  const itemPrice = Number(sellerOrService.startingPrice || sellerOrService.price || 100);
  let budgetScore = 95;
  if (itemPrice <= targetBudget) {
    budgetScore = 100;
  } else {
    const diffRatio = (itemPrice - targetBudget) / targetBudget;
    budgetScore = Math.max(50, Math.round(100 - diffRatio * 80));
  }

  const targetDeadline = Number(project?.deadline || 7);
  const itemDelivery = Number(sellerOrService.deliveryDays || sellerOrService.deliveryTime || 3);
  let deliveryScore = 95;
  if (itemDelivery <= targetDeadline) {
    deliveryScore = 100;
  } else {
    deliveryScore = Math.max(60, 100 - (itemDelivery - targetDeadline) * 10);
  }

  const ratingVal = Number(sellerOrService.rating || sellerOrService.sellerRating || 4.8);
  const ratingScore = Math.round((ratingVal / 5) * 100);

  const totalScore = Math.round(
    skillScore * 0.4 + budgetScore * 0.25 + deliveryScore * 0.15 + ratingScore * 0.2
  );

  const primarySkills = projectSkills.slice(0, 2).join(', ') || 'your requirements';
  const rationale = `Recommended because this provider matches ${primarySkills} within your target budget.`;

  return {
    totalScore,
    breakdown: { skills: skillScore, budget: budgetScore, delivery: deliveryScore, rating: ratingScore },
    rationale,
  };
}

/* =============================================================================
   PROJECT POSTS — LocalStorage only (unchanged)
   ============================================================================= */

function getProjectPosts() {
  try {
    return JSON.parse(localStorage.getItem('workstream_projects')) || [];
  } catch {
    return [];
  }
}

function createProjectPost(projectData) {
  const projects = getProjectPosts();
  const newProj = {
    id: `proj_${Date.now()}`,
    title: projectData.title,
    description: projectData.description,
    outcomeGoal: projectData.outcomeGoal || 'BUILD YOUR BRAND',
    budget: Number(projectData.budget || 300),
    deadlineDays: Number(projectData.deadline || 7),
    skills: Array.isArray(projectData.skills)
      ? projectData.skills
      : projectData.skills
      ? projectData.skills.split(',').map(s => s.trim())
      : [],
    categoryId: projectData.categoryId || 'cat_2',
    buyerId: projectData.buyerId || 'usr_6',
    createdAt: new Date().toISOString(),
  };
  projects.unshift(newProj);
  localStorage.setItem('workstream_projects', JSON.stringify(projects));
  return newProj;
}

/* =============================================================================
   SORTING UTILITY
   ============================================================================= */

function sortServices(servicesList, sortBy = 'recommended') {
  const list = [...servicesList];
  if (sortBy === 'price_asc') list.sort((a, b) => (a.startingPrice || 0) - (b.startingPrice || 0));
  else if (sortBy === 'price_desc') list.sort((a, b) => (b.startingPrice || 0) - (a.startingPrice || 0));
  else if (sortBy === 'best_rated' || sortBy === 'rating')
    list.sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0));
  else if (sortBy === 'most_reviewed') list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
  else if (sortBy === 'newest')
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  else if (sortBy === 'trending')
    list.sort(
      (a, b) => (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0) || (b.orderCount || 0) - (a.orderCount || 0)
    );
  return list;
}

/* =============================================================================
   EXPORT
   ============================================================================= */

export const marketplaceService = {
  // Categories (async — from API)
  getCategories,
  getCategoryBySlug,
  getPopularCategories,
  addCategory,
  deleteCategory,

  // Subcategories (async — from API)
  getSubcategories,

  // Services (async — from API)
  getServices,
  filterServices,
  getServiceById,
  getFeaturedServices,
  getTrendingServices,
  searchServices,
  getServicesByTrendingGroup,
  getServicesByCategory,
  getRelatedServices,
  sortServices,

  // Seller operations (async — from PostgreSQL API, Phase 4B)
  createService,
  updateService,
  publishService,
  archiveService,
  deleteService,
  getMyServices,

  // Trending Groups (sync — local metadata; services come from API)
  getTrendingGroups,
  getTrendingGroupBySlug,

  // Tags (sync — local)
  getTags,

  // Favorites (toggleFavorite sync; getFavorites async)
  getFavorites,
  toggleFavorite,

  // Project posts (sync — LocalStorage)
  getProjectPosts,
  createProjectPost,

  // Utility
  getTrustProfile,
  calculateWorkStreamMatch,
};

export default marketplaceService;
