import { authService } from './authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const MESSAGES_KEY = 'workstream_messages';
const CONVERSATIONS_KEY = 'workstream_conversations';

export const messagingService = {
  getConversations: async (userId) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          buyer:buyer_id(id, name, avatar_url),
          seller:seller_id(id, name, avatar_url)
        `)
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('last_message_at', { ascending: false });

      if (!error && data) return data;
    }

    const conversations = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY)) || [
      {
        id: 'conv_1',
        buyerId: 'usr_2',
        sellerId: 'usr_1',
        buyerName: 'David Miller',
        sellerName: 'Sarah Jenkins',
        lastMessage: 'Let us discuss the Figma layout milestones.',
        lastMessageAt: new Date().toISOString(),
        unreadCount: 1,
      },
    ];

    return conversations.filter(c => c.buyerId === userId || c.sellerId === userId);
  },

  getMessages: async (conversationId) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data) return data;
    }

    const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY)) || [
      {
        id: 'msg_1',
        conversationId: 'conv_1',
        senderId: 'usr_2',
        text: 'Hi Sarah! Excited to work on the app redesign.',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        isRead: true,
      },
      {
        id: 'msg_2',
        conversationId: 'conv_1',
        senderId: 'usr_1',
        text: 'Hi David! Thank you for placing the order. I have received the requirements.',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        isRead: true,
      },
    ];

    return allMessages.filter(m => m.conversationId === conversationId);
  },

  sendMessage: async (conversationId, text, attachments = []) => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error('Authentication required to send messages.');

    const newMsg = {
      id: `msg_${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      text,
      attachments,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          text,
          attachment_urls: attachments,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // LocalStorage fallback
    const allMessages = JSON.parse(localStorage.getItem(MESSAGES_KEY)) || [];
    allMessages.push(newMsg);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(allMessages));
    return newMsg;
  },

  markAsRead: async (conversationId, userId) => {
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);
    }
    return true;
  },

  subscribeToMessages: (conversationId, onNewMessage) => {
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          (payload) => onNewMessage(payload.new)
        )
        .subscribe();

      return () => supabase.removeChannel(channel);
    }
    return () => {};
  },
};

export default messagingService;
