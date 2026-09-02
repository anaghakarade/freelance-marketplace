/**
 * authApi.js — WorkStream Authentication API Layer
 *
 * Communicates with the Go backend auth endpoints:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   GET  /api/auth/me
 *   POST /api/auth/logout
 *
 * Handles token storage via apiClient helpers.
 */

import { apiClient, setStoredToken, getStoredToken } from './apiClient';

/**
 * Register a new buyer or seller account
 * @param {Object} userData - { name, email, password, role, accountType }
 * @returns {Promise<{ token: string, user: Object }>}
 */
export async function register(userData) {
  const response = await apiClient.post('/auth/register', {
    name: userData.name,
    email: userData.email,
    password: userData.password,
    role: userData.role || 'buyer',
    accountType: userData.accountType || 'individual',
  });

  // Store the token for future requests
  if (response?.token) {
    setStoredToken(response.token);
  }

  return response;
}

/**
 * Log in with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ token: string, user: Object }>}
 */
export async function login(email, password) {
  const response = await apiClient.post('/auth/login', { email, password });

  // Store the token for future requests
  if (response?.token) {
    setStoredToken(response.token);
  }

  return response;
}

/**
 * Get the currently authenticated user's profile
 * @returns {Promise<Object>} User object
 */
export async function getMe() {
  return apiClient.get('/auth/me');
}

/**
 * Log out (clears stored token; server-side is stateless)
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await apiClient.post('/auth/logout', {});
  } catch (_err) {
    // Even if the request fails, clear the token locally
  } finally {
    setStoredToken(null);
  }
}

/**
 * Check if the user is currently authenticated (has a stored token)
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getStoredToken();
}

export default { register, login, getMe, logout, isAuthenticated };
