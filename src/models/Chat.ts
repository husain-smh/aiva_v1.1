import mongoose, { Schema, models } from 'mongoose';

export interface IChat {
  _id: string;
  userId: string;
  agentId: Schema.Types.ObjectId;
  title: string;
  createdAt: Date;
}

const chatSchema = new Schema<IChat>({
  userId: {
    type: String,
    required: true,
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'Agent',
    required: false,
  },
  title: {
    type: String,
    required: true,
    default: 'New Chat',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
},{timestamps: true }); //for createdAt and updatedAt

export const Chat = models.Chat || mongoose.model('Chat', chatSchema); 