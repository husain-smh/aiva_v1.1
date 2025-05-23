import mongoose, { Schema, models } from 'mongoose';

export interface IUserPreference {
  _id: string;
  userId: string;
  preferences: Record<string, string>;
  lastUpdated: Date;
}

const userPreferenceSchema = new Schema<IUserPreference>({
  userId: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  preferences: {
    type: Map,
    of: String,
    default: {},
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
},{timestamps: true }); //for createdAt and updatedAt

export const UserPreference = models.UserPreference || mongoose.model('UserPreference', userPreferenceSchema); 