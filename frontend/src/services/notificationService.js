import api from './api';

export const notificationService = {
  getNotifications: async (limit = 30) => {
    const response = await api.get('/notifications', { params: { limit } });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  markRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllRead: async () => {
    const response = await api.post('/notifications/read-all');
    return response.data;
  },
};
