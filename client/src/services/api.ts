import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
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

// Events
export const eventsAPI = {
  getAll: () => api.get('/events'),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: { name: string; description?: string; participant_ids?: string[] }) =>
    api.post('/events', data),
  update: (id: string, data: { name: string; description?: string }) =>
    api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  inviteUser: (id: string, email: string) =>
    api.post(`/events/${id}/invite`, { email }),
  getMyInvites: () => api.get('/events/invites'),
  acceptInvite: (inviteId: string) =>
    api.post(`/events/invites/${inviteId}/accept`),
  declineInvite: (inviteId: string) =>
    api.post(`/events/invites/${inviteId}/decline`),
  removeParticipant: (id: string, userId: string) =>
    api.delete(`/events/${id}/participants/${userId}`),
};

// Splits
export const splitsAPI = {
  getAll: (params?: { event_id?: string }) =>
    api.get('/splits', { params }),
  getById: (id: string) => api.get(`/splits/${id}`),
  create: (data: {
    event_id: string;
    title: string;
    amount: number;
    currency?: string;
    paid_by: string;
    date: string;
    notes?: string;
    participant_ids: string[];
  }) => api.post('/splits', data),
  update: (id: string, data: any) => api.put(`/splits/${id}`, data),
  delete: (id: string) => api.delete(`/splits/${id}`),
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