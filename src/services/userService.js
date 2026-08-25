import { authService } from './authService';
import { marketplaceService } from './marketplaceService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const userService = {
  getFreelancers: () => {
    const users = authService.getUsers();
    return users.filter(u => u.role === 'freelancer' && u.status !== 'suspended');
  },

  getProfile: async (userId) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (!error && data) return data;
    }

    const users = authService.getUsers();
    return users.find(u => u.id === userId) || null;
  },

  updateProfile: async (userId, profileData) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const users = authService.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      users[index] = { ...users[index], ...profileData };
      localStorage.setItem('workstream_users', JSON.stringify(users));
      if (authService.getCurrentUser()?.id === userId) {
        authService.setCurrentUser(users[index]);
      }
      return users[index];
    }
    throw new Error('User not found.');
  },

  getSellerProfile: async (userId) => {
    const profile = await userService.getProfile(userId);
    const services = marketplaceService.getServices().filter(s => s.sellerId === userId);
    return {
      ...profile,
      services,
      responseRate: '98%',
      completionRate: '100%',
    };
  },

  getSellerServices: (userId) => {
    return marketplaceService.getServices().filter(s => s.sellerId === userId);
  },

  updateSkills: async (userId, skills = []) => {
    return userService.updateProfile(userId, { skills });
  },

  updatePortfolio: async (userId, portfolioItems = []) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('portfolio_items')
        .upsert(portfolioItems.map(item => ({ user_id: userId, ...item })));
      if (error) throw error;
      return data;
    }
    return userService.updateProfile(userId, { portfolio: portfolioItems });
  },
};

export default userService;
