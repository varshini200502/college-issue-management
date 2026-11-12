import api from './api';

export const analyticsService = {
  getPrincipalAnalytics: async (filters = {}) => {
    const response = await api.get('/analytics/principal', { params: filters });
    return response.data;
  },

  getDepartmentAnalytics: async (departmentId = null) => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await api.get('/analytics/department', { params });
    return response.data;
  },

  getReporterAnalytics: async () => {
    const response = await api.get('/analytics/reporter');
    return response.data;
  },
};
