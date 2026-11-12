import api from './api';

export const departmentService = {
  getDepartments: async () => {
    const response = await api.get('/departments');
    return response.data;
  },

  getCategories: async (departmentId = null) => {
    const params = departmentId ? { department_id: departmentId } : {};
    const response = await api.get('/categories', { params });
    return response.data;
  },

  getDepartmentMembers: async () => {
    const response = await api.get('/users/department-members');
    return response.data;
  },
};
