/**
 * server/models/Group.js
 * A named group of users (e.g. "Family", "Work").
 * Friends can be shared with an entire group at once.
 * Groups are created and managed by any user.
 */

const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Group name is required'],
      trim:      true,
      maxlength: [50, 'Group name cannot exceed 50 characters'],
    },
    description: {
      type:    String,
      trim:    true,
      default: '',
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    // User who created the group
    owner: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    // All users who are members of this group (includes owner)
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'User',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Group', GroupSchema);