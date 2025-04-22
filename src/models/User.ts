import mongoose, { Schema, models } from 'mongoose';

interface IUser {
  _id: string;
  name: string;
  email: string;
  image: string;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  image: String,
}, { timestamps: true });

export const User = models.User || mongoose.model('User', userSchema); 