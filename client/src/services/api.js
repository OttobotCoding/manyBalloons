/**
 * client/src/services/api.js
 * Centralised Axios instance + all API call functions.
 * Components should import from here, never call fetch/axios directly.
 */

import axios from 'axios';

// Base instance — proxy in package.json forwards /api → http://localhost:5000
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Response interceptor: unwrap { success, data } envelope ──────────────────
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

// ── Friends API ───────────────────────────────────────────────────────────────

/**
 * Fetch all friends. Optionally filter by search string or relationship.
 * @param {{ search?: string, relationship?: string, sort?: string }} params
 */
export const getFriends = (params = {}) =>
  api.get('/friends', { params });

/**
 * Fetch friends with birthdays within `days` days (default 30).
 */
export const getUpcomingBirthdays = (days = 30) =>
  api.get('/friends/upcoming', { params: { days } });

/**
 * Fetch a single friend by Mongo _id.
 */
export const getFriendById = (id) =>
  api.get(`/friends/${id}`);

/**
 * Create a new friend. Accepts a FormData object (for photo upload)
 * or a plain JS object (no photo).
 */
export const createFriend = (payload) => {
  const isFormData = payload instanceof FormData;
  return api.post('/friends', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
};

/**
 * Update an existing friend by id.
 */
export const updateFriend = (id, payload) => {
  const isFormData = payload instanceof FormData;
  return api.put(`/friends/${id}`, payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  });
};

/**
 * Delete a friend by id.
 */
export const deleteFriend = (id) =>
    api.delete(`/friends/${id}`);

//---- Settings API ------------------------------------------------------------
export const getSettings = () =>
    api.get('/settings');

export const updateSettings = (payload) =>
    api.put('/settings', payload);

export const sendTestEmail = () =>
    api.post('/settings/test');