/**
 * client/src/services/api.js
 * Centralised Axios instance + all API call functions.
 */

import axios from 'axios';

const api = axios.create({
  baseURL:         '/api',
  headers:         { 'Content-Type': 'application/json' },
  timeout:         15000,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message =
      err.response?.data?.message ||
      err.response?.data?.errors?.join(', ') ||
      err.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const checkSetupNeeded = () => api.get('/auth/setup-status');
export const setupAccount     = (p)  => api.post('/auth/setup', p);
export const loginUser        = (p)  => api.post('/auth/login', p);
export const logoutUser       = ()   => api.post('/auth/logout');
export const getMe            = ()   => api.get('/auth/me');
export const changePassword   = (p)  => api.put('/auth/password', p);

// ── Friends ───────────────────────────────────────────────────────────────────
export const getFriends           = (params = {}) => api.get('/friends', { params });
export const getUpcomingBirthdays = (days = 30)   => api.get('/friends/upcoming', { params: { days } });
export const getFriendById        = (id)           => api.get(`/friends/${id}`);

export const createFriend = (payload) => {
  const isFormData = payload instanceof FormData;
  return api.post('/friends', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
};

export const updateFriend = (id, payload) => {
  const isFormData = payload instanceof FormData;
  return api.put(`/friends/${id}`, payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
};

export const deleteFriend = (id) => api.delete(`/friends/${id}`);

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSettings    = ()  => api.get('/settings');
export const updateSettings = (p) => api.put('/settings', p);
export const sendTestEmail  = ()  => api.post('/settings/test');

// ── Groups ────────────────────────────────────────────────────────────────────
export const getGroups    = ()       => api.get('/groups');
export const createGroup  = (p)      => api.post('/groups', p);
export const updateGroup  = (id, p)  => api.put(`/groups/${id}`, p);
export const deleteGroup  = (id)     => api.delete(`/groups/${id}`);

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getAdminStats    = ()           => api.get('/admin/stats');
export const getAdminUsers    = ()           => api.get('/admin/users');
export const createAdminUser  = (p)          => api.post('/admin/users', p);
export const updateUserRole   = (id, role)   => api.put(`/admin/users/${id}/role`, { role });
export const resetUserPassword= (id, p)      => api.put(`/admin/users/${id}/password`, p);
export const deleteAdminUser  = (id)         => api.delete(`/admin/users/${id}`);
export const getActivityLogs  = (params = {})=> api.get('/admin/logs', { params });