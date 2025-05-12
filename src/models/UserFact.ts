import mongoose, { Schema, models } from 'mongoose';

interface IUserFact {
  _id: string;
  userId: string;
  facts: Record<string, string>;
  lastUpdated: Date;
}

const userFactSchema = new Schema<IUserFact>({
  userId: {
    type: String,
    required: true,
    index: true,
    unique: true,
  },
  facts: {
    type: Map,
    of: String,
    default: {},
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

export const UserFact = models.UserFact || mongoose.model('UserFact', userFactSchema); 