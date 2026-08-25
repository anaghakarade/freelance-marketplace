import { users as initialUsers } from '../data/users';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const USERS_KEY = 'workstream_users';
const CURRENT_USER_KEY = 'workstream_current_user';

// Initialize users database in localStorage if not present
if (!localStorage.getItem(USERS_KEY)) {
  localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
}

// Set default current user as freelancer 'usr_1' initially if unset
if (!localStorage.getItem(CURRENT_USER_KEY)) {
  const users = JSON.parse(localStorage.getItem(USERS_KEY));
  const defaultUser = users.find(u => u.id === 'usr_1');
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultUser));
}

export const authService = {
  getUsers: () => {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  },

  getCurrentUser: () => {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
  },

  setCurrentUser: (user) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('authChange'));
  },

  switchRole: (role) => {
    const users = authService.getUsers();
    let targetUser;
    if (role === 'admin') {
      targetUser = users.find(u => u.role === 'admin');
    } else if (role === 'buyer') {
      targetUser = users.find(u => u.role === 'buyer');
    } else {
      targetUser = users.find(u => u.role === 'freelancer');
    }
    
    if (targetUser) {
      authService.setCurrentUser(targetUser);
    }
  },

  login: async (email, password = '') => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const userObj = profile || {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || email.split('@')[0],
        role: data.user.user_metadata?.role || 'buyer',
      };

      authService.setCurrentUser(userObj);
      return userObj;
    }

    // LocalStorage fallback
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

  register: async (userData) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password || 'workstream123',
        options: {
          data: {
            name: userData.name,
            role: userData.role || 'buyer',
          },
        },
      });
      if (error) throw error;

      const newUser = {
        id: data.user?.id || `usr_${Date.now()}`,
        name: userData.name,
        email: userData.email,
        role: userData.role || 'buyer',
        accountType: userData.accountType || 'individual',
        status: 'active',
        createdDate: new Date().toISOString().split('T')[0],
      };

      authService.setCurrentUser(newUser);
      return newUser;
    }

    // LocalStorage fallback
    const users = authService.getUsers();
    if (users.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
      throw new Error('Email already registered.');
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      accountType: userData.accountType,
      avatar: '',
      status: 'active',
      createdDate: new Date().toISOString().split('T')[0],
      ...(userData.role === 'freelancer' ? {
        title: userData.title || 'Professional Freelancer',
        location: userData.location || 'Global Remote',
        rating: 5.0,
        reviewsCount: 0,
        skills: userData.skills || [],
        about: userData.about || '',
        languages: ['English'],
        completedProjects: 0,
        startingPrice: parseInt(userData.startingPrice) || 50
      } : {})
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    authService.setCurrentUser(newUser);
    return newUser;
  },

  logout: async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(CURRENT_USER_KEY);
    window.dispatchEvent(new Event('authChange'));
  },

  getSession: async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      return data.session;
    }
    return null;
  },

  onAuthStateChange: (callback) => {
    if (isSupabaseConfigured && supabase) {
      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
      });
      return listener.subscription;
    }
    // Fallback window listener
    const handler = () => callback('STORAGE_AUTH_CHANGE', authService.getCurrentUser());
    window.addEventListener('authChange', handler);
    return { unsubscribe: () => window.removeEventListener('authChange', handler) };
  },
};

export default authService;
