import mongoose, { Schema, models } from 'mongoose';

interface IAgent {
  name: string;
  description: string;
  context: string;
  instructions: string;
  connectedApps: string[];
  userId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const agentSchema = new Schema<IAgent>({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  context: {
    type: String,
    required: true,
  },
  instructions: {
    type: String,
    required: true,
  },
  connectedApps: {
    type: [String],
    default: [],
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, { timestamps: true });

export const Agent = models.Agent || mongoose.model('Agent', agentSchema);