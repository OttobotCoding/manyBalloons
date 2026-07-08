/**
 * server/models/User.js
 * Single admin user document. Only one user ever exists in this collection.
 * Password is hashed with bcrypt before saving — never stored in plain text.
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
      minlength: [3,  'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match:     [/^[a-z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    password: {
      type:     String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
  },
  { timestamps: true }
);

// ── Hash password before saving ───────────────────────────────────────────────
UserSchema.pre('save', async function (next) {
  // Only hash if the password field was modified
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Instance method: compare a plain-text password against the stored hash ────
UserSchema.methods.comparePassword = async function (plainText) {
  return bcrypt.compare(plainText, this.password);
};

// ── Never include the password hash in JSON responses ─────────────────────────
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);