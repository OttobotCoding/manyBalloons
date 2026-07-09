/**
 * server/models/Friend.js
 * Friend record with ownership and sharing support.
 * A friend is visible to: its owner, users in sharedWith, members of
 * shared groups, and admins.
 */

const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema(
  {
    // ── Ownership ─────────────────────────────────────────────────────────────
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    // Individual users this friend is shared with
    sharedWith: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    ],
    // Groups this friend is shared with
    sharedWithGroups: [
      { type: mongoose.Schema.Types.ObjectId, ref: 'Group' }
    ],

    // ── Core info ─────────────────────────────────────────────────────────────
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    birthday: {
      type:     Date,
      required: [true, 'Birthday is required'],
      validate: {
        validator: (v) => v <= new Date(),
        message:   'Birthday cannot be in the future',
      },
    },

    // ── Contact ───────────────────────────────────────────────────────────────
    phone: {
      type:      String,
      trim:      true,
      default:   '',
      maxlength: [20, 'Phone number too long'],
    },
    email: {
      type:      String,
      trim:      true,
      lowercase: true,
      default:   '',
      match:     [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },
    address: {
      type:      String,
      trim:      true,
      default:   '',
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },

    // ── Relationship ──────────────────────────────────────────────────────────
    relationship: {
      type:    String,
      enum:    ['friend', 'family', 'colleague', 'acquaintance', 'other'],
      default: 'friend',
    },

    // ── Media / notes ─────────────────────────────────────────────────────────
    photo: { type: String, default: '' },
    notes: {
      type:      String,
      trim:      true,
      default:   '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getBirthParts(birthday) {
  return {
    month: birthday.getUTCMonth(),
    day:   birthday.getUTCDate(),
    year:  birthday.getUTCFullYear(),
  };
}

// ── Virtuals ──────────────────────────────────────────────────────────────────
FriendSchema.virtual('age').get(function () {
  if (!this.birthday) return null;
  const { month, day, year } = getBirthParts(this.birthday);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() < month || (today.getMonth() === month && today.getDate() < day)) age--;
  return age;
});

FriendSchema.virtual('daysUntilBirthday').get(function () {
  if (!this.birthday) return null;
  const { month, day } = getBirthParts(this.birthday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), month, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
});

FriendSchema.virtual('nextBirthday').get(function () {
  if (!this.birthday) return null;
  const { month, day } = getBirthParts(this.birthday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), month, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return next;
});

// ── Indexes ───────────────────────────────────────────────────────────────────
FriendSchema.index({ owner:      1 });
FriendSchema.index({ sharedWith: 1 });
FriendSchema.index({ name:       'text' });
FriendSchema.index({ birthday:   1 });

module.exports = mongoose.model('Friend', FriendSchema);