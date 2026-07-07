/**
 * server/models/Friend.js
 * Mongoose schema and model for a Friend record.
 * Age is stored as a virtual (computed from birthday) — never persisted to DB.
 */

const mongoose = require('mongoose');

const FriendSchema = new mongoose.Schema(
  {
    // ── Core info ─────────────────────────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    birthday: {
      type: Date,
      required: [true, 'Birthday is required'],
      validate: {
        validator: (v) => v <= new Date(),
        message: 'Birthday cannot be in the future',
      },
    },

    // ── Contact info ──────────────────────────────────────────────────────────
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [20, 'Phone number too long'],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },

    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },

    // ── Relationship ──────────────────────────────────────────────────────────
    relationship: {
      type: String,
      enum: ['friend', 'family', 'colleague', 'acquaintance', 'other'],
      default: 'friend',
    },

    // ── Photo ─────────────────────────────────────────────────────────────────
    // Stored as a URL path (e.g. "/uploads/abc123.jpg") or a base64 data URI
    photo: {
      type: String,
      default: '',
    },

    // ── Miscellaneous ─────────────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,   // Adds createdAt / updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──────────────────────────────────────────────────────────────────

/**
 * Helper: extract the birth month/day without any UTC shift.
 * MongoDB stores as UTC midnight.  We pull the UTC values directly
 * so that a birthday of "1990-06-15" is always treated as June 15,
 * regardless of the server's local timezone
 */
function getBirthParts(birthday) {
    return {
        month: birthday.getUTCMonth(),  // 0-indexed
        day: birthday.getUTCDate(),
        year: birthday.getUTCFullYear(),
    };
}

/**
 * age — calculated from birthday at query time.
 */
FriendSchema.virtual('age').get(function () {
  if (!this.birthday) return null;
    const { month, day, year } = getBirthParts(this.birthday);
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();

    let age = todayYear - year;

    if (
        todayMonth < month ||
        (todayMonth === month && todayDay < day)
    ) {
        age--;
    }

    return age;
 });

/**
 * daysUntilBirthday — calendar days until next birthday (0 = today).
 */
FriendSchema.virtual('daysUntilBirthday').get(function () {
  if (!this.birthday) return null;

    const { month, day } = getBirthParts(this.birthday);

    const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build this year's birthday in local time
  const next = new Date(today.getFullYear(), month, day);

  // If it already passed this year, advance to next year
  if (next < today) next.setFullYear(today.getFullYear() + 1);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((next - today) / msPerDay);
});

/**
 * nextBirthday — the actual Date of the next upcoming birthday.
 */
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
FriendSchema.index({ name: 'text' });      // Full-text search on name
FriendSchema.index({ birthday: 1 });       // Range queries for upcoming birthdays

module.exports = mongoose.model('Friend', FriendSchema);