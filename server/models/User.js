/**
 * server/models/User.js
 * Admin and standard user accounts.
 * Password hashed with bcrypt. Role controls access to admin routes.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type:      String,
      required:  [true, 'Username is required'],
      trim:      true,
      lowercase: true,
      unique:    true,
      minlength: [3,  'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match:     [/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    role: {
      type:    String,
      enum:    ['admin', 'user'],
      default: 'user',
    },
    lastLogin: {
      type:    Date,
      default: null,
    },
    // Display name shown in the UI — defaults to username if not set
    displayName: {
      type:    String,
      trim:    true,
      default: '',
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },
  },
  { timestamps: true }
);

// ── Hash password before saving ───────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare plain-text password against stored hash ───────────────────────────
UserSchema.methods.comparePassword = async function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

// ── Never expose password hash in responses ───────────────────────────────────
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);