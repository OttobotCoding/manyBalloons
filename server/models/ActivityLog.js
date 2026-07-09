/**
 * server/models/ActivityLog.js
 * Immutable audit log of significant actions in the app.
 * Documents are never updated — only inserted and read.
 */

const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema(
  {
    // Who performed the action (null for system actions like scheduler)
    user: {
      type: mongoose.Schema.Types.ObjectId,
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
        // Friends
        'friend_created',
        'friend_updated',
        'friend_deleted',
        // Users (admin)
        'user_created',
        'user_deleted',
        'user_role_changed',
        'user_password_reset',
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
      type:    mongoose.Schema.Types.Mixed,
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
ActivityLogSchema.statics.log = async function (data) {
  try {
    await this.create(data);
  } catch (err) {
    console.error('ActivityLog write failed:', err.message);
  }
};

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);