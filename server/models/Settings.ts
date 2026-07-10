/**
 * server/models/Settings.ts
 * Singleton document that stores app-wide user preferences.
 * Only one document ever exists — we always upsert with the key { _id: 'app' }.
 */

import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISettings extends Omit<Document, '_id'> {
  _id: string;
  notificationEmail: string;
  notifyDaysBefore: number;
  notificationsEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    _id: { type: String, default: 'app' },

    // Notification recipient email
    notificationEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      match: [/^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'],
    },

    // How many days before a birthday to send the notification (1–7)
    notifyDaysBefore: {
      type: Number,
      default: 1,
      min: [1, 'Must be at least 1 day'],
      max: [7, 'Cannot exceed 7 days'],
    },

    // Master toggle — false disables all email sending
    notificationsEnabled: {
      type: Boolean,
      default: false,
    },

    // SMTP configuration (stored encrypted in a real app — fine for self-hosted)
    smtpHost:     { type: String, default: 'smtp.gmail.com', trim: true },
    smtpPort:     { type: Number, default: 587 },
    smtpUser:     { type: String, default: '', trim: true },
    smtpPass:     { type: String, default: '' },
    smtpFrom:     { type: String, default: '', trim: true },
  },
  {
    _id: false,   // We manage _id ourselves
    timestamps: true,
  }
);

const Settings: Model<ISettings> = mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
