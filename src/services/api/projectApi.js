/**
 * projectApi.js — Buyer Projects & Freelancer Proposals API Adapter (Phase 5)
 *
 * Communicates with Go + Gin + PostgreSQL backend:
 *   GET    /api/projects                  — public open projects discovery
 *   GET    /api/projects/:id              — single project detail
 *   POST   /api/projects                  — buyer creates project
 *   GET    /api/projects/my               — buyer views their projects
 *   PUT    /api/projects/:id              — buyer updates project
 *   PATCH  /api/projects/:id/status       — buyer updates project status
 *   DELETE /api/projects/:id              — buyer deletes project
 *   POST   /api/projects/:id/proposals    — freelancer submits proposal
 *   GET    /api/projects/:id/proposals    — buyer views project proposals
 *   GET    /api/proposals/my              — freelancer views submitted proposals
 *   DELETE /api/proposals/:id             — freelancer withdraws proposal
 *   PATCH  /api/proposals/:id/shortlist   — buyer shortlists proposal
 *   PATCH  /api/proposals/:id/reject      — buyer rejects proposal
 *   PATCH  /api/proposals/:id/accept      — buyer accepts proposal (atomic)
 */

import { apiClient } from './apiClient';

/**
 * Fetch open projects with discovery filters
 */
export async function getProjects({
  category,
  subcategory,
  experienceLevel,
  budgetType,
  minBudget,
  maxBudget,
  search,
  skills,
  sort,
  limit = 20,
  offset = 0,
} = {}) {
  const params = new URLSearchParams();

  if (category) params.set('category', category);
  if (subcategory) params.set('subcategory', subcategory);
  if (experienceLevel && experienceLevel !== 'all') params.set('experience_level', experienceLevel);
  if (budgetType && budgetType !== 'all') params.set('budget_type', budgetType);
  if (minBudget !== undefined && minBudget !== '' && !isNaN(minBudget)) params.set('min_budget', String(minBudget));
  if (maxBudget !== undefined && maxBudget !== '' && !isNaN(maxBudget)) params.set('max_budget', String(maxBudget));
  if (search && search.trim()) params.set('search', search.trim());
  if (skills && skills.length > 0) params.set('skills', Array.isArray(skills) ? skills.join(',') : skills);
  if (sort) params.set('sort', sort);
  if (limit) params.set('limit', String(limit));
  if (offset) params.set('offset', String(offset));

  const query = params.toString();
  const endpoint = `/projects${query ? `?${query}` : ''}`;
  const response = await apiClient.get(endpoint);
  return response || { projects: [], total: 0 };
}

/**
 * Fetch single project by ID (with resilient offline/cache fallback)
 */
export async function getProjectById(id) {
  try {
    const response = await apiClient.get(`/projects/${id}`);
    const proj = response?.data ?? response;
    if (proj && (proj.id || proj.title)) return proj;
  } catch (err) {
    console.warn('[projectApi] Failed to fetch project from backend:', err.message);
  }

  // Fallback 1: Check cached buyer projects
  try {
    const cachedMy = JSON.parse(localStorage.getItem('workstream_cached_my_projects')) || [];
    const found = cachedMy.find(p => p.id === id);
    if (found) return found;
  } catch {
    // ignore
  }

  // Fallback 2: Check localStorage 'workstream_projects'
  try {
    const localProjects = JSON.parse(localStorage.getItem('workstream_projects')) || [];
    const found = localProjects.find(p => p.id === id);
    if (found) return found;
  } catch {
    // ignore
  }

  throw new Error(`Project with ID ${id} not found.`);
}

/**
 * Buyer creates a new project
 */
export async function createProject(data) {
  const response = await apiClient.post('/projects', data);
  return response?.data ?? response;
}

/**
 * Buyer gets their own projects
 */
export async function getMyProjects() {
  const response = await apiClient.get('/projects/my');
  return response?.projects || response?.data?.projects || (Array.isArray(response) ? response : []);
}

/**
 * Buyer updates a project
 */
export async function updateProject(id, data) {
  const response = await apiClient.put(`/projects/${id}`, data);
  return response?.data ?? response;
}

/**
 * Buyer updates a project's status (open, closed, cancelled)
 */
export async function updateProjectStatus(id, status) {
  const response = await apiClient.patch(`/projects/${id}/status`, { status });
  return response?.data ?? response;
}

/**
 * Buyer deletes a project
 */
export async function deleteProject(id) {
  const response = await apiClient.delete(`/projects/${id}`);
  return response?.data ?? response;
}

/**
 * Freelancer submits a proposal to a project
 */
export async function submitProposal(projectId, data) {
  const response = await apiClient.post(`/projects/${projectId}/proposals`, data);
  return response?.data ?? response;
}

/**
 * Freelancer views all their submitted proposals
 */
export async function getMyProposals() {
  const response = await apiClient.get('/proposals/my');
  return response?.proposals || response?.data?.proposals || (Array.isArray(response) ? response : []);
}

/**
 * Buyer views all proposals on their project (enriched with Match Scores)
 */
export async function getProjectProposals(projectId) {
  const response = await apiClient.get(`/projects/${projectId}/proposals`);
  return response?.proposals || response?.data?.proposals || (Array.isArray(response) ? response : []);
}

/**
 * Freelancer withdraws their proposal
 */
export async function withdrawProposal(proposalId) {
  const response = await apiClient.delete(`/proposals/${proposalId}`);
  return response?.data ?? response;
}

/**
 * Buyer shortlists a proposal
 */
export async function shortlistProposal(proposalId) {
  const response = await apiClient.patch(`/proposals/${proposalId}/shortlist`);
  return response?.data ?? response;
}

/**
 * Buyer rejects a proposal
 */
export async function rejectProposal(proposalId) {
  const response = await apiClient.patch(`/proposals/${proposalId}/reject`);
  return response?.data ?? response;
}

/**
 * Buyer accepts a proposal (atomic workflow)
 */
export async function acceptProposal(proposalId) {
  const response = await apiClient.patch(`/proposals/${proposalId}/accept`);
  return response?.data ?? response;
}

export const projectApi = {
  getProjects,
  getProjectById,
  createProject,
  getMyProjects,
  updateProject,
  updateProjectStatus,
  deleteProject,
  submitProposal,
  getMyProposals,
  getProjectProposals,
  withdrawProposal,
  shortlistProposal,
  rejectProposal,
  acceptProposal,
};
