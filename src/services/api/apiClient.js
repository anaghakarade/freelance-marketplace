/**
 * apiClient.js — Centralized HTTP client for WorkStream Go Backend
 *
 * Configured for REST API communication with http://localhost:8081/api.
 * Automatically injects Authorization: Bearer <token> when a JWT is stored.
 * Includes JSON header management and standard error parsing.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';
const TOKEN_KEY = 'workstream_token';

/**
 * Get the stored JWT token from localStorage
 */
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

/**
 * Store a JWT token in localStorage
 */
export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Automatically attach JWT token if present in localStorage
  const token = getStoredToken();
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.message || `HTTP error ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    return data?.data !== undefined ? data.data : data;
  } catch (err) {
    console.error(`[API Client Error] ${options.method || 'GET'} ${url}:`, err);
    throw err;
  }
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) =>
    request(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body, options) =>
    request(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;
