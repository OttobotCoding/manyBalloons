/**
 * client/src/types/index.ts
 * Shared TypeScript interfaces describing API data structures.
 * These mirror the Mongoose schemas / JSON responses on the server
 * (see server/models/*.ts) and the shapes assembled in server/routes/*.ts.
 */

export type Relationship = 'friend' | 'family' | 'colleague' | 'acquaintance' | 'other';
export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface UserSummary {
  _id: string;
  username: string;
  displayName?: string;
}

export interface User {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string | null;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Friend {
  _id: string;
  owner: UserSummary | string;
  sharedWith: string[];
  sharedWithGroups: string[];
  name: string;
  birthday: string;
  phone: string;
  email: string;
  address: string;
  relationship: Relationship;
  photo: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  // Virtuals computed server-side
  age: number | null;
  daysUntilBirthday: number | null;
  nextBirthday: string | null;
}

export interface Group {
  _id: string;
  name: string;
  description: string;
  owner: UserSummary | string;
  members: UserSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  _id: string;
  notificationEmail: string;
  notifyDaysBefore: number;
  notificationsEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  createdAt: string;
  updatedAt: string;
}

export type ActivityAction =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_changed'
  | 'setup_completed'
  | 'login_blocked_unapproved'
  | 'friend_created'
  | 'friend_updated'
  | 'friend_deleted'
  | 'user_created'
  | 'user_deleted'
  | 'user_role_changed'
  | 'user_password_reset'
  | 'user_registered'
  | 'user_approved'
  | 'user_rejected'
  | 'group_created'
  | 'group_updated'
  | 'group_deleted'
  | 'settings_updated'
  | 'notification_sent'
  | 'notification_failed';

export interface ActivityLogEntry {
  _id: string;
  user: UserSummary | string | null;
  username: string;
  action: ActivityAction;
  description: string;
  // Freeform metadata whose shape varies by action — see server/models/ActivityLog.ts.
  // TODO: narrow this to a discriminated union keyed by `action` if the shape
  // of `meta` ever needs to be relied on programmatically in the UI.
  meta: any;
  ip: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalFriends: number;
  totalGroups: number;
  birthdayThisMonth: number;
  notificationsEnabled: boolean;
  smtpConfigured: boolean;
  recentFriends: Friend[];
  friendsByRelationship: { _id: Relationship; count: number }[];
  usersByRole: { _id: UserRole; count: number }[];
  uptime: number;
  nodeVersion: string;
  environment: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ── API envelope shapes ─────────────────────────────────────────────────────
export interface ApiSuccess<T> {
  success: true;
  data: T;
  count?: number;
  message?: string;
  pagination?: Pagination;
}

export interface SetupStatusResponse {
  success: true;
  needsSetup: boolean;
}

export interface MessageResponse {
  success: true;
  message: string;
}