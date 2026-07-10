/**
 * server/models/Friend.ts
 * Friend record with ownership and sharing support.
 * A friend is visible to: its owner, users in sharedWith, members of
 * shared groups, and admins.
 */

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export type Relationship = 'friend' | 'family' | 'colleague' | 'acquaintance' | 'other';

export interface IFriend extends Document {
  owner: Types.ObjectId;
  sharedWith: Types.ObjectId[];
  sharedWithGroups: Types.ObjectId[];
  name: string;
  birthday: Date;
  phone: string;
  email: string;
  address: string;
  relationship: Relationship;
  photo: string;
  notes: string;
  createdAt: Date;
  updatedAt: Date;

  // ── Virtuals ──────────────────────────────────────────────────────────────
  readonly age: number | null;
  readonly daysUntilBirthday: number | null;
  readonly nextBirthday: Date | null;
}

interface BirthParts {
  month: number;
  day: number;
  year: number;
}

const FriendSchema = new Schema<IFriend>(
  {
    // ── Ownership ─────────────────────────────────────────────────────────────
    owner: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    // Individual users this friend is shared with
    sharedWith: [
      { type: Schema.Types.ObjectId, ref: 'User' }
    ],
    // Groups this friend is shared with
    sharedWithGroups: [
      { type: Schema.Types.ObjectId, ref: 'Group' }
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
        validator: (v: Date) => v <= new Date(),
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
function getBirthParts(birthday: Date): BirthParts {
  return {
    month: birthday.getUTCMonth(),
    day:   birthday.getUTCDate(),
    year:  birthday.getUTCFullYear(),
  };
}

// ── Virtuals ──────────────────────────────────────────────────────────────────
FriendSchema.virtual('age').get(function (this: IFriend): number | null {
  if (!this.birthday) return null;
  const { month, day, year } = getBirthParts(this.birthday);
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() < month || (today.getMonth() === month && today.getDate() < day)) age--;
  return age;
});

FriendSchema.virtual('daysUntilBirthday').get(function (this: IFriend): number | null {
  if (!this.birthday) return null;
  const { month, day } = getBirthParts(this.birthday);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(today.getFullYear(), month, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
});

FriendSchema.virtual('nextBirthday').get(function (this: IFriend): Date | null {
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

const Friend: Model<IFriend> = mongoose.model<IFriend>('Friend', FriendSchema);

export default Friend;
