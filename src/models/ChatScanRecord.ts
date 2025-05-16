import mongoose, { Schema, models } from 'mongoose';

export interface IChatScanRecord {
  _id?: mongoose.Types.ObjectId | string; // Make _id optional with ?
  chatId: string;
  userId: string;
  lastScannedAt: Date;
  lastMessageTimestamp: Date;
  scanVersion: number;
  scannedMessageCount: number;
}

const chatScanRecordSchema = new Schema<IChatScanRecord>({
  chatId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
    index: true,
  },
  lastScannedAt: {
    type: Date,
    default: Date.now,
  },
  lastMessageTimestamp: {
    type: Date,
    default: Date.now,
  },
  scanVersion: {
    type: Number,
    default: 1,
  },
  scannedMessageCount: {
    type: Number,
    default: 0,
  },
},{timestamps: true }); //for createdAt and updatedAt

export const ChatScanRecord = models.ChatScanRecord || mongoose.model('ChatScanRecord', chatScanRecordSchema); 