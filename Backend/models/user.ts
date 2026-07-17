import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  uid?: string;
  email: string;
  name: string;
  role: 'Admin' | 'Technician' | 'User';
  password?: string;
  category?: string; // Specialty category for Technicians
  isOnline?: boolean; // Online status for Technicians
  otp?: string;       // For Password reset
  otpExpires?: Date;  // OTP expiration time
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    uid: { type: String, unique: true, sparse: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    password: { type: String },
    category: { type: String, default: 'General' },
    isOnline: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
    role: {
      type: String,
      required: true,
      enum: ['Admin', 'Technician', 'User'],
      default: 'User',
    },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
