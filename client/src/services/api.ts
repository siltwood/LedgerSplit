import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true,
});

// Auth
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  getGoogleAuthUrl: () => api.get('/auth/google'),
  requestPasswordReset: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  requestPasswordChange: () => api.post('/auth/change-password'),
  deleteAccount: () => api.delete('/auth/account'),
};

// Groups
export const groupsAPI = {
  getAll: () => api.get('/groups'),
  getById: (id: string) => api.get(`/groups/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post('/groups', data),
  update: (id: string, data: { name: string; description?: string }) =>
    api.put(`/groups/${id}`, data),
  delete: (id: string) => api.delete(`/groups/${id}`),
  inviteUser: (id: string, email: string) =>
    api.post(`/groups/${id}/invite`, { email }),
  getMyInvites: () => api.get('/groups/invites'),
  acceptInvite: (inviteId: string) =>
    api.post(`/groups/invites/${inviteId}/accept`),
  declineInvite: (inviteId: string) =>
    api.post(`/groups/invites/${inviteId}/decline`),
  removeMember: (id: string, userId: string) =>
    api.delete(`/groups/${id}/members/${userId}`),
};

// Expenses
export const expensesAPI = {
  getAll: (params?: { group_id?: string; user_id?: string }) =>
    api.get('/expenses', { params }),
  getById: (id: string) => api.get(`/expenses/${id}`),
  create: (data: {
    group_id?: string;
    description: string;
    amount: number;
    currency?: string;
    paid_by: string;
    date: string;
    notes?: string;
    splits: Array<{ user_id: string; amount_owed: number }>;
  }) => api.post('/expenses', data),
  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: string) => api.delete(`/expenses/${id}`),
  restore: (id: string) => api.post(`/expenses/${id}/restore`),
};

// Settlements
export const settlementsAPI = {
  getAll: (params?: { group_id?: string; user_id?: string }) =>
    api.get('/settlements', { params }),
  create: (data: {
    group_id?: string;
    paid_by: string;
    paid_to: string;
    amount: number;
    currency?: string;
    date?: string;
    notes?: string;
  }) => api.post('/settlements', data),
};

// Friends
export const friendsAPI = {
  getAll: () => api.get('/friends'),
  getPending: () => api.get('/friends/pending'),
  sendRequest: (email: string) => api.post('/friends/invite', { email }),
  accept: (id: string) => api.put(`/friends/${id}/accept`),
  remove: (id: string) => api.delete(`/friends/${id}`),
  block: (id: string) => api.put(`/friends/${id}/block`),
  unblock: (id: string) => api.put(`/friends/${id}/unblock`),
};

// Balances
export const balancesAPI = {
  getUserBalance: (userId: string) => api.get(`/balances/user/${userId}`),
  getBalanceBetween: (userId1: string, userId2: string) =>
    api.get(`/balances/between/${userId1}/${userId2}`),
  getGroupBalances: (groupId: string) =>
    api.get(`/balances/group/${groupId}`),
};

// Upload
export const uploadAPI = {
  uploadReceipt: (file: File) => {
    const formData = new FormData();
    formData.append('receipt', file);
    return api.post('/upload/receipt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;