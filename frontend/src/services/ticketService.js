import api from './api';

export const ticketService = {
  createTicket: async (ticketData) => {
    const response = await api.post('/tickets', ticketData);
    return response.data;
  },

  checkDuplicate: async (categoryId, title) => {
    const response = await api.get('/tickets/check-duplicate', {
      params: { category_id: categoryId, title },
    });
    return response.data;
  },

  getTickets: async (params = {}) => {
    const response = await api.get('/tickets', { params });
    return response.data;
  },

  getTicketById: async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  updateStatus: async (id, statusData) => {
    const response = await api.patch(`/tickets/${id}/status`, statusData);
    return response.data;
  },

  resolveTicket: async (id, resolution_notes) => {
    const response = await api.post(`/tickets/${id}/resolve`, { resolution_notes });
    return response.data;
  },

  reopenTicket: async (id, note) => {
    const response = await api.post(`/tickets/${id}/reopen`, { note });
    return response.data;
  },

  submitJustification: async (id, justificationData) => {
    const response = await api.post(`/tickets/${id}/justification`, justificationData);
    return response.data;
  },

  addComment: async (id, commentData) => {
    const response = await api.post(`/tickets/${id}/comments`, commentData);
    return response.data;
  },
};
