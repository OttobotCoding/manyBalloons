/**
 * server/models/ActivityLog.ts
 * Immutable audit log of significant actions in the app.
 * Documents are never updated — only inserted and read.
 */

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type ActivityAction =
  // Auth
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_changed'
  | 'setup_completed'
  | 'login_blocked_unapproved'
  // Friends
  | 'friend_created'
  | 'friend_updated'
  | 'friend_deleted'
  // Users (admin)
  | 'user_created'
  | 'user_deleted'
  | 'user_role_changed'
  | 'user_password_reset'
  | 'user_registered'
  | 'user_approved'
  | 'user_rejected'
  // Groups
  | 'group_created'
  | 'group_updated'
  | 'group_deleted'
  // Settings
  | 'settings_updated'
  // Notifications
  | 'notification_sent'
  | 'notification_failed';

export interface IActivityLog extends Document {
  user: Types.ObjectId | null;
  username: string;
  action: ActivityAction;
  description: string;
  // Arbitrary extra data (friend name, old/new role, etc.) — genuinely
  // unstructured across the many call sites that populate it (see routes/*.ts),
  // so a precise type isn't practical here.
  // TODO: narrow this to a discriminated union keyed by `action` if the
  // shape of `meta` ever needs to be relied on programmatically.
  meta: any;
  ip: string;
  createdAt: Date;
}

export interface ActivityLogInput {
  user?: Types.ObjectId | string | null;
  username?: string;
  action: ActivityAction;
  description?: string;
  meta?: any;
  ip?: string;
}

interface IActivityLogModel extends Model<IActivityLog> {
  /**
   * Static helper to create a log entry without throwing on failure.
   * Logging should never crash the app.
   */
  log(data: ActivityLogInput): Promise<void>;
}

const ActivityLogSchema = new Schema<IActivityLog, IActivityLogModel>(
  {
    // Who performed the action (null for system actions like scheduler)
    user: {
      type: Schema.Types.ObjectId,
      ref:  'User',
      default: null,
    },
    // Username snapshot — preserved even if user is deleted later
    username: {
      type:    String,
      default: 'system',
    },
    // Action category
    action: {
      type:     String,
      required: true,
      enum: [
        // Auth
        'login_success',
        'login_failed',
        'logout',
        'password_changed',
        'setup_completed',
        'login_blocked_unapproved',
        // Friends
        'friend_created',
        'friend_updated',
        'friend_deleted',
        // Users (admin)
        'user_created',
        'user_deleted',
        'user_role_changed',
        'user_password_reset',
        'user_registered',
        'user_approved',
        'user_rejected',
        // Groups
        'group_created',
        'group_updated',
        'group_deleted',
        // Settings
        'settings_updated',
        // Notifications
        'notification_sent',
        'notification_failed',
      ],
    },
    // Human-readable description
    description: {
      type:    String,
      default: '',
    },
    // Optional extra data (friend name, old/new role, etc.)
    meta: {
      type:    Schema.Types.Mixed,
      default: {},
    },
    // Request IP address
    ip: {
      type:    String,
      default: '',
    },
  },
  {
    // Use createdAt as the timestamp — no updatedAt needed
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Index for efficient querying by user and action
ActivityLogSchema.index({ user:      -1 });
ActivityLogSchema.index({ action:    1  });
ActivityLogSchema.index({ createdAt: -1 });

/**
 * Static helper to create a log entry without throwing on failure.
 * Logging should never crash the app.
 */
ActivityLogSchema.statics.log = async function (data: ActivityLogInput): Promise<void> {
  try {
    await this.create(data);
  } catch (err) {
    console.error('ActivityLog write failed:', (err as Error).message);
  }
};

const ActivityLog = mongoose.model<IActivityLog, IActivityLogModel>('ActivityLog', ActivityLogSchema);

export default ActivityLog;
