/**
 * server/models/User.ts
 * Admin and standard user accounts.
 * Password hashed with bcrypt. Role controls access to admin routes.
 */

import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: Date | null;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(plainText: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
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
    // Used to deliver account notifications (e.g. pending-approval email on
    // self-registration). Optional so setup/admin-created accounts, which
    // never collect it, still validate.
    email: {
      type:      String,
      trim:      true,
      lowercase: true,
      default:   '',
      match:     [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
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
    // 'pending' only for self-registered accounts awaiting admin review —
    // accounts created via setup or by an admin default straight to 'approved'.
    status: {
      type:    String,
      enum:    ['pending', 'approved', 'rejected'],
      default: 'approved',
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
UserSchema.methods.comparePassword = async function (plainText: string): Promise<boolean> {
  return bcrypt.compare(plainText, this.password);
};

// ── Never expose password hash in responses ───────────────────────────────────
UserSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, any>) => {
    delete ret.password;
    return ret;
  },
});

const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);

export default User;