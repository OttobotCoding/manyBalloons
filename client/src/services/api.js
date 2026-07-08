/**
 * client/src/services/api.js
 * Centralised Axios instance + all API call functions.
 */

import axios from 'axios';

const api = axios.create({
  baseURL:         '/api',
  headers:         { 'Content-Type': 'application/json' },
  timeout:         15000,
  withCredentials: true, // send cookies on every request
});

// Unwrap { success, data } envelope; extract error message on failure
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
export const setupAccount     = (payload) => api.post('/auth/setup', payload);
export const loginUser        = (payload) => api.post('/auth/login', payload);
export const logoutUser       = ()        => api.post('/auth/logout');
export const getMe            = ()        => api.get('/auth/me');
export const changePassword   = (payload) => api.put('/auth/password', payload);

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
export const getSettings    = ()        => api.get('/settings');
export const updateSettings = (payload) => api.put('/settings', payload);
export const sendTestEmail  = ()        => api.post('/settings/test');