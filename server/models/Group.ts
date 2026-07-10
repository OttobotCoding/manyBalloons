/**
 * server/models/Group.ts
 * A named group of users (e.g. "Family", "Work").
 * Friends can be shared with an entire group at once.
 * Groups are created and managed by any user.
 */

import mongoose, { Document, Model, Schema, Types } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description: string;
  owner: Types.ObjectId;
  members: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
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
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    // All users who are members of this group (includes owner)
    members: [
      {
        type: Schema.Types.ObjectId,
        ref:  'User',
      },
    ],
  },
  { timestamps: true }
);

const Group: Model<IGroup> = mongoose.model<IGroup>('Group', GroupSchema);

export default Group;
