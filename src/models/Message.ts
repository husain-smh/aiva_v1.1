import mongoose, { Schema, models } from 'mongoose';

interface IMessage {
  _id: string;
  chatId: string;
  agentId?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  chatId: {
    type: String,
    required: true,
  },
  agentId: {
    type: String,
    required: false,
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
},{timestamps: true }); //for createdAt and updatedAt

export const Message = models.Message || mongoose.model('Message', messageSchema); 