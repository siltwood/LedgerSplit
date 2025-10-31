import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? 'https://api.ledgersplit.com/api' : '/api',
  withCredentials: true,
});

// Add response interceptor to suppress console errors for expected 4xx errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only suppress console errors for expected client errors (4xx)
    // Still log server errors (5xx) and network errors
    if (error.response && error.response.status >= 400 && error.response.status < 500) {
      // Silently return the error without logging to console
      return Promise.reject(error);
    }
    // For 5xx errors and network errors, let axios log them
    return Promise.reject(error);
  }
);

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
  updateProfile: (data: { venmo_username?: string }) =>
    api.put('/auth/profile', data),
  deleteAccount: () => api.delete('/auth/account'),
  exportData: () => api.get('/auth/export-data'),
};

// Events
export const eventsAPI = {
  getAll: () => api.get('/events'),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: { name: string; description?: string; participant_ids?: string[] }) =>
    api.post('/events', data),
  update: (id: string, data: { name?: string; description?: string; is_dismissed?: boolean; is_settled?: boolean }) =>
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
  leaveEvent: (id: string) =>
    api.post(`/events/${id}/leave`),
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
    category?: string;
    participant_ids?: string[];
  }) => api.post('/splits', data),
  update: (id: string, data: any) => api.put(`/splits/${id}`, data),
  delete: (id: string) => api.delete(`/splits/${id}`),
};

// Payments
export const paymentsAPI = {
  getAll: (params: { event_id: string }) =>
    api.get('/payments', { params }),
  create: (data: {
    event_id: string;
    from_user_id: string;
    to_user_id: string;
    amount: number;
    notes?: string;
    payment_date?: string;
  }) => api.post('/payments', data),
  delete: (id: string) => api.delete(`/payments/${id}`),
};

// Settled Confirmations
export const settledAPI = {
  toggleConfirmation: (eventId: string) =>
    api.post(`/events/${eventId}/settled/toggle`),
  getConfirmations: (eventId: string) =>
    api.get(`/events/${eventId}/settled`),
};

export default api;