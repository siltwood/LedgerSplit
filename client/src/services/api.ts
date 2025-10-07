import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? 'https://api.ledgersplit.com/api' : '/api',
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
  inviteToEvent: (id: string, userId: string) =>
    api.post(`/events/${id}/invite`, { user_id: userId }),
  getMyInvites: () => api.get('/events/invites'),
  acceptInvite: (inviteId: string) =>
    api.post(`/events/invites/${inviteId}/accept`),
  acceptInviteByToken: (token: string) =>
    api.post(`/events/invites/token/${token}/accept`),
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

export default api;