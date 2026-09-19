import { apiClient } from './apiClient';

export const communicationApi = {
  notifications: (unread = false) => apiClient.get(`/notifications?limit=30${unread ? '&unread=true' : ''}`),
  markNotificationRead: (id) => apiClient.patch(`/notifications/${id}/read`, {}),
  markAllNotificationsRead: () => apiClient.post('/notifications/read-all', {}),
  conversations: () => apiClient.get('/conversations'),
  createConversation: (projectId, freelancerId) => apiClient.post('/conversations', { projectId, freelancerId }),
  messages: (id) => apiClient.get(`/conversations/${id}/messages?limit=50`),
  sendMessage: (id, message) => apiClient.post(`/conversations/${id}/messages`, { message }),
  markMessagesRead: (id) => apiClient.patch(`/conversations/${id}/messages/read`, {}),
  activity: (kind, id) => apiClient.get(`/${kind}s/${id}/activity?limit=50`),
};
