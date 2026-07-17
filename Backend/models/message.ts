import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  issueNumber: string;
  senderName: string;
  senderEmail: string;
  role: 'Admin' | 'Technician' | 'User';
  message: string;
  timestamp: Date;
}

const MessageSchema: Schema = new Schema({
  issueNumber: { type: String, required: true, index: true },
  senderName: { type: String, required: true },
  senderEmail: { type: String, required: true },
  role: { type: String, required: true, enum: ['Admin', 'Technician', 'User'] },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

export const Message = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);
