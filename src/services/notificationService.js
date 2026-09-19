import { authService } from './authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { communicationApi } from './api/communicationApi';

const NOTIFICATIONS_KEY = 'workstream_notifications';

export const notificationService = {
  getNotifications: async (userId) => {
    try {
      const data = await communicationApi.notifications();
      return data.notifications || [];
    } catch (error) {
      // Keep the existing offline/demo fallback available when the API is unavailable.
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    }

    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)) || [
      {
        id: 'notif_1',
        userId,
        title: 'Order Status Update',
        message: 'Your order #ORD-8921 has been marked as Active.',
        type: 'order',
        link: '/buyer/orders',
        isRead: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'notif_2',
        userId,
        title: 'New Message',
        message: 'Alex K. sent you a message regarding your design brief.',
        type: 'message',
        link: '/messages',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    return all.filter(n => n.userId === userId);
  },

  getUnreadCount: async (userId) => {
    try {
      const data = await communicationApi.notifications();
      return data.unread_count || 0;
    } catch (error) {
      // fall through to offline data
    }
    const list = await notificationService.getNotifications(userId);
    return list.filter(n => !n.isRead).length;
  },

  markAsRead: async (notificationId) => {
    try {
      await communicationApi.markNotificationRead(notificationId);
      return true;
    } catch (error) {
      // fall through to the legacy offline store
    }
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      return true;
    }

    const currentUser = authService.getCurrentUser();
    if (!currentUser) return false;

    const all = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY)) || [];
    const index = all.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      all[index].isRead = true;
      localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(all));
    }
    return true;
  },

  subscribeToNotifications: (userId, onNotification) => {
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => onNotification(payload.new)
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
    return () => {};
  },
};

export default notificationService;
