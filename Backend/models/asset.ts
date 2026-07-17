import mongoose, { Schema, Document } from 'mongoose';

export interface IAsset extends Document {
  name: string;
  code: string;
  category: string;
  location: string;
  condition: string;
  status: 'Operational' | 'Issue Reported' | 'Under Inspection' | 'Under Maintenance' | 'Out of Service' | 'Retired';
  lastServiceDate: Date;
  nextServiceDate: Date;
  assignedTechnician?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssetSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    location: { type: String, required: true },
    condition: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['Operational', 'Issue Reported', 'Under Inspection', 'Under Maintenance', 'Out of Service', 'Retired'],
      default: 'Operational',
    },
    lastServiceDate: { type: Date, required: true },
    nextServiceDate: { type: Date, required: true },
    assignedTechnician: { type: String },
  },
  { timestamps: true }
);

export const Asset = mongoose.models.Asset || mongoose.model<IAsset>('Asset', AssetSchema);
