/**
 * adminApi.js — Admin governance, moderation, reports & audit API client
 * All endpoints use the shared apiClient which auto-injects JWT.
 */
import { apiClient } from './apiClient';

export const adminApi = {
  // ─── Platform Analytics ──────────────────────────────────────────────────
  getAnalytics: () => apiClient.get('/admin/analytics'),

  // ─── User Management ─────────────────────────────────────────────────────
  listUsers: ({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) =>
    apiClient.get(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&role=${role}&status=${status}`),

  getUser: (id) => apiClient.get(`/admin/users/${id}`),

  suspendUser: (id, reason) =>
    apiClient.patch(`/admin/users/${id}/suspend`, { reason }),

  reactivateUser: (id) =>
    apiClient.patch(`/admin/users/${id}/reactivate`, {}),

  // ─── Service Moderation ───────────────────────────────────────────────────
  listServices: ({ page = 1, limit = 20, search = '', status = '' } = {}) =>
    apiClient.get(`/admin/services?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`),

  getService: (id) => apiClient.get(`/admin/services/${id}`),

  approveService: (id) =>
    apiClient.patch(`/admin/services/${id}/approve`, {}),

  rejectService: (id, reason) =>
    apiClient.patch(`/admin/services/${id}/reject`, { reason }),

  suspendService: (id, reason) =>
    apiClient.patch(`/admin/services/${id}/suspend`, { reason }),

  // ─── Project Moderation ───────────────────────────────────────────────────
  listProjects: ({ page = 1, limit = 20, search = '', status = '' } = {}) =>
    apiClient.get(`/admin/projects?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${status}`),

  getProject: (id) => apiClient.get(`/admin/projects/${id}`),

  suspendProject: (id, reason) =>
    apiClient.patch(`/admin/projects/${id}/suspend`, { reason }),

  // ─── Reports & Moderation Tickets ─────────────────────────────────────────
  listReports: ({ page = 1, limit = 20, status = '' } = {}) =>
    apiClient.get(`/admin/reports?page=${page}&limit=${limit}&status=${status}`),

  getReport: (id) => apiClient.get(`/admin/reports/${id}`),

  reviewReport: (id) =>
    apiClient.patch(`/admin/reports/${id}/review`, {}),

  resolveReport: (id, note = '') =>
    apiClient.patch(`/admin/reports/${id}/resolve`, { note }),

  dismissReport: (id, note = '') =>
    apiClient.patch(`/admin/reports/${id}/dismiss`, { note }),

  // ─── User-Submitted Reports (any authenticated user) ─────────────────────
  submitReport: ({ targetType, targetId, reason, description = '' }) =>
    apiClient.post('/reports', { targetType, targetId, reason, description }),

  // ─── Audit Logs ───────────────────────────────────────────────────────────
  listAuditLogs: ({ page = 1, limit = 20, action = '', entityType = '' } = {}) =>
    apiClient.get(`/admin/audit-logs?page=${page}&limit=${limit}&action=${action}&entityType=${entityType}`),
};

export default adminApi;
