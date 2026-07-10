/**
 * client/src/services/api.ts
 * Centralised Axios instance + all API call functions.
 */

import axios, { AxiosResponse } from 'axios';
import {
  ApiSuccess, SetupStatusResponse, MessageResponse,
  User, Friend, Group, Settings, ActivityLogEntry, AdminStats,
} from '../types';

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

// The response interceptor above rewrites every resolved value from
// AxiosResponse<T> to just T (res.data), which axios's own type signatures
// don't model. This helper documents/casts that runtime behaviour in one
// place so every exported call below can have an accurate return type.
function unwrap<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  return promise as unknown as Promise<T>;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const checkSetupNeeded = (): Promise<SetupStatusResponse> =>
  unwrap(api.get('/auth/setup-status'));

export const setupAccount = (p: { username: string; password: string; confirmPassword: string }): Promise<ApiSuccess<User>> =>
  unwrap(api.post('/auth/setup', p));

export const loginUser = (p: { username: string; password: string; rememberMe: boolean }): Promise<ApiSuccess<User>> =>
  unwrap(api.post('/auth/login', p));

export const logoutUser = (): Promise<MessageResponse> =>
  unwrap(api.post('/auth/logout'));

export const getMe = (): Promise<ApiSuccess<User>> =>
  unwrap(api.get('/auth/me'));

export const changePassword = (p: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<MessageResponse> =>
  unwrap(api.put('/auth/password', p));

// ── Friends ───────────────────────────────────────────────────────────────────
export interface FriendsQueryParams {
  search?: string;
  relationship?: string;
  sort?: string;
}

export const getFriends = (params: FriendsQueryParams = {}): Promise<ApiSuccess<Friend[]>> =>
  unwrap(api.get('/friends', { params }));

export const getUpcomingBirthdays = (days: number = 30): Promise<ApiSuccess<Friend[]>> =>
  unwrap(api.get('/friends/upcoming', { params: { days } }));

export const getFriendById = (id: string): Promise<ApiSuccess<Friend>> =>
  unwrap(api.get(`/friends/${id}`));

export const createFriend = (payload: FormData | Record<string, unknown>): Promise<ApiSuccess<Friend>> => {
  const isFormData = payload instanceof FormData;
  return unwrap(api.post('/friends', payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }));
};

export const updateFriend = (id: string, payload: FormData | Record<string, unknown>): Promise<ApiSuccess<Friend>> => {
  const isFormData = payload instanceof FormData;
  return unwrap(api.put(`/friends/${id}`, payload, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }));
};

export const deleteFriend = (id: string): Promise<MessageResponse> =>
  unwrap(api.delete(`/friends/${id}`));

// ── Settings ──────────────────────────────────────────────────────────────────
export const getSettings = (): Promise<ApiSuccess<Settings>> =>
  unwrap(api.get('/settings'));

export const updateSettings = (p: Partial<Settings>): Promise<ApiSuccess<Settings>> =>
  unwrap(api.put('/settings', p));

export const sendTestEmail = (): Promise<MessageResponse> =>
  unwrap(api.post('/settings/test'));

// ── Groups ────────────────────────────────────────────────────────────────────
export interface GroupInput {
  name: string;
  description?: string;
  memberUsernames?: string[];
}

export const getGroups = (): Promise<ApiSuccess<Group[]>> =>
  unwrap(api.get('/groups'));

export const createGroup = (p: GroupInput): Promise<ApiSuccess<Group>> =>
  unwrap(api.post('/groups', p));

export const updateGroup = (id: string, p: Partial<GroupInput>): Promise<ApiSuccess<Group>> =>
  unwrap(api.put(`/groups/${id}`, p));

export const deleteGroup = (id: string): Promise<MessageResponse> =>
  unwrap(api.delete(`/groups/${id}`));

// ── Admin ─────────────────────────────────────────────────────────────────────
export interface CreateUserInput {
  username: string;
  password: string;
  role?: 'admin' | 'user';
  displayName?: string;
}

export interface ActivityLogsQueryParams {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
}

export const getAdminStats = (): Promise<ApiSuccess<AdminStats>> =>
  unwrap(api.get('/admin/stats'));

export const getAdminUsers = (): Promise<ApiSuccess<User[]>> =>
  unwrap(api.get('/admin/users'));

export const createAdminUser = (p: CreateUserInput): Promise<ApiSuccess<User>> =>
  unwrap(api.post('/admin/users', p));

export const updateUserRole = (id: string, role: 'admin' | 'user'): Promise<ApiSuccess<User>> =>
  unwrap(api.put(`/admin/users/${id}/role`, { role }));

export const resetUserPassword = (id: string, p: { newPassword: string }): Promise<MessageResponse> =>
  unwrap(api.put(`/admin/users/${id}/password`, p));

export const deleteAdminUser = (id: string): Promise<MessageResponse> =>
  unwrap(api.delete(`/admin/users/${id}`));

export const getActivityLogs = (params: ActivityLogsQueryParams = {}): Promise<ApiSuccess<ActivityLogEntry[]>> =>
  unwrap(api.get('/admin/logs', { params }));
