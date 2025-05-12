import { Schema } from 'mongoose';

export interface Chat {
  _id: string;
  userId: string;
  agentId?: string;
  title: string;
  createdAt: string;
}

export interface Message {
  _id: string;
  chatId: string;
  agentId?: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
} 