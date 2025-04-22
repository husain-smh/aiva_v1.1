import mongoose, { Schema, models } from 'mongoose';

interface IMessage {
  _id: string;
  chatId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>({
  chatId: {
    type: String,
    required: true,
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
});

export const Message = models.Message || mongoose.model('Message', messageSchema); 