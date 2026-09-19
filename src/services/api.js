/**
 * api.js — Central API configuration re-export
 *
 * This file is the single import point for all backend API calls.
 * Components should prefer marketplaceService.js over calling this directly.
 *
 * Usage:
 *   import api from '../services/api';
 *   const data = await api.get('/categories');
 */

export { apiClient as default, apiClient, getStoredToken, setStoredToken, request } from './api/apiClient';
