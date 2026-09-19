/**
 * apiClient.js — Centralized HTTP client for WorkStream Go Backend
 *
 * Base URL: VITE_API_BASE_URL (defaults to http://localhost:8082/api)
 * Automatically injects Authorization: Bearer <token> when a JWT is stored.
 * Includes JSON header management and standard error parsing.
 *
 * On 401: dispatches a global 'authUnauthorized' event so the auth service
 * can clear the session without creating a circular import dependency.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api';

const TOKEN_KEY = 'workstream_token';

/**
 * Get the stored JWT token from localStorage
 */
export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || null;
}

/**
 * Store or remove a JWT token in localStorage
 */
export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/**
 * Core request function.
 * Returns the parsed data payload on success.
 * Throws an Error with a meaningful message on failure.
 */
export async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Automatically attach JWT token if present
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

  const response = await fetch(url, config);

  // Handle 401 — notify auth layer without a circular import
  if (response.status === 401) {
    setStoredToken(null);
    window.dispatchEvent(new Event('authUnauthorized'));
  }

  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return null;
  }

  if (!response.ok) {
    const errorMsg =
      data?.message || `HTTP error ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  // Backend wraps payloads in { success, data, message } via RespondSuccess
  return data?.data !== undefined ? data.data : data;
}

export const apiClient = {
  get: (endpoint, options) =>
    request(endpoint, { ...options, method: 'GET' }),

  post: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: (endpoint, body, options) =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (endpoint, options) =>
    request(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;
