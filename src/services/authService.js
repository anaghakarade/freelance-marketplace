/**
 * authService.js — WorkStream Authentication Service
 *
 * Phase 2: Integrates with Go backend via authApi.
 * Graceful fallback to LocalStorage for offline / demo mode (prototype quick-login).
 *
 * Token Management:
 *   - JWT stored in 'workstream_token' via apiClient.setStoredToken
 *   - Current user profile stored in 'workstream_current_user'
 *   - Auth state changes broadcast via window Event('authChange')
 *
 * Role Normalization:
 *   - Backend canonical roles: buyer, seller, admin
 *   - Frontend may use 'freelancer' as an alias for 'seller'
 */

import { users as initialUsers } from '../data/users';
import * as authApi from './api/authApi';
import { setStoredToken } from './api/apiClient';

const USERS_KEY = 'workstream_users';
const CURRENT_USER_KEY = 'workstream_current_user';

// Initialize seed users in localStorage if not present (for demo / prototype)
if (!localStorage.getItem(USERS_KEY)) {
  localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
}

// Set default current user as the first user if not logged in (demo mode)
if (!localStorage.getItem(CURRENT_USER_KEY)) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY));
  const defaultUser = users.find(u => u.id === 'usr_1');
  if (defaultUser) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultUser));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns true if the Go backend is reachable (best-effort check via stored token)
 * We always try the backend first; if it fails we fall back to localStorage.
 */
function _isBackendMode() {
  // Try backend when env specifies it, or always attempt first (with fallback)
  return true;
}

/**
 * Normalize role for consistent frontend use
 * Backend sends 'seller', frontend expects either 'seller' or 'freelancer'
 */
function _normalizeUserRole(user) {
  if (!user) return user;
  // Keep role as-is — ProtectedRoute handles both 'seller' and 'freelancer' checks
  return user;
}

// ─── Auth Service ─────────────────────────────────────────────────────────────

export const authService = {
  /**
   * Get all users from localStorage (demo/prototype mode)
   */
  getUsers: () => {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  },

  /**
   * Get the currently authenticated user from localStorage
   */
  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
    } catch {
      return null;
    }
  },

  /**
   * Manually set the current user and broadcast auth state change
   */
  setCurrentUser: (user) => {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    window.dispatchEvent(new Event('authChange'));
  },

  /**
   * Quick role switcher for prototype / demo mode
   * Switches to the first user with the given role in the seed data
   */
  switchRole: (role) => {
    const users = authService.getUsers();
    let targetUser;
    if (role === 'admin') {
      targetUser = users.find(u => u.role === 'admin');
    } else if (role === 'buyer') {
      targetUser = users.find(u => u.role === 'buyer');
    } else {
      // seller / freelancer
      targetUser = users.find(u => u.role === 'freelancer' || u.role === 'seller');
    }

    if (targetUser) {
      authService.setCurrentUser(targetUser);
    }
  },

  /**
   * Login with email and password.
   * Tries the Go backend first; falls back to localStorage on network error.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>} User object
   */
  login: async (email, password = '') => {
    // ── Backend attempt ──────────────────────────────────────────────────────
    try {
      const { token, user } = await authApi.login(email, password);
      const normalizedUser = _normalizeUserRole(user);
      // Merge token claim into user object so Navbar & ProtectedRoute work
      const sessionUser = { ...normalizedUser, token };
      authService.setCurrentUser(sessionUser);
      return sessionUser;
    } catch (backendErr) {
      // Network failures (backend not running) → fall through to localStorage
      if (backendErr.message && !backendErr.message.includes('fetch')) {
        // Backend responded with an error (e.g., wrong password) — do NOT fallback
        throw backendErr;
      }
      // Backend unreachable — use LocalStorage fallback for demo
      console.warn('[AuthService] Backend unreachable, using LocalStorage fallback:', backendErr.message);
    }

    // ── LocalStorage fallback ────────────────────────────────────────────────
    const users = authService.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      if (user.status === 'suspended') {
        throw new Error('This account has been suspended by administrator.');
      }
      authService.setCurrentUser(user);
      return user;
    }
    throw new Error('Email address not found.');
  },

  /**
   * Register a new buyer or seller account.
   * Tries the Go backend first; falls back to localStorage on network error.
   *
   * @param {Object} userData
   * @returns {Promise<Object>} Created user object
   */
  register: async (userData) => {
    // ── Backend attempt ──────────────────────────────────────────────────────
    try {
      const { token, user } = await authApi.register(userData);
      const normalizedUser = _normalizeUserRole(user);
      const sessionUser = { ...normalizedUser, token };
      authService.setCurrentUser(sessionUser);
      return sessionUser;
    } catch (backendErr) {
      if (backendErr.message && !backendErr.message.includes('fetch')) {
        // Backend error (validation, duplicate email, etc.) — propagate to UI
        throw backendErr;
      }
      console.warn('[AuthService] Backend unreachable, using LocalStorage fallback:', backendErr.message);
    }

    // ── LocalStorage fallback ────────────────────────────────────────────────
    const users = authService.getUsers();
    if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('Email already registered.');
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role === 'freelancer' ? 'seller' : (userData.role || 'buyer'),
      accountType: userData.accountType || 'individual',
      avatar: '',
      status: 'active',
      isActive: true,
      createdDate: new Date().toISOString().split('T')[0],
      ...(userData.role === 'freelancer' || userData.role === 'seller'
        ? {
            title: userData.title || 'Professional Freelancer',
            location: userData.location || 'Global Remote',
            rating: 5.0,
            reviewsCount: 0,
            skills: userData.skills || [],
            about: userData.about || '',
            languages: ['English'],
            completedProjects: 0,
            startingPrice: parseInt(userData.startingPrice) || 50,
          }
        : {}),
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    authService.setCurrentUser(newUser);
    return newUser;
  },

  /**
   * Log out the current user. Clears JWT token and user from localStorage.
   */
  logout: async () => {
    try {
      await authApi.logout();
    } catch (_err) {
      // Ignore backend logout errors — still clear local state
    }
    // Clear JWT token
    setStoredToken(null);
    // Clear user session
    localStorage.removeItem(CURRENT_USER_KEY);
    window.dispatchEvent(new Event('authChange'));
  },

  /**
   * Get the current auth session (returns null for localStorage mode)
   */
  getSession: async () => {
    return null;
  },

  /**
   * Subscribe to auth state changes.
   * Returns an object with an unsubscribe() method.
   *
   * @param {Function} callback - Called with (event, user) on auth changes
   */
  onAuthStateChange: (callback) => {
    const handler = () => callback('AUTH_STATE_CHANGE', authService.getCurrentUser());
    window.addEventListener('authChange', handler);
    return { unsubscribe: () => window.removeEventListener('authChange', handler) };
  },
};

export default authService;
