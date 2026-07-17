import mongoose, { Schema, Document } from 'mongoose';

export interface IIssue extends Document {
  issueNumber: string;
  assetCode: string;
  asset?: mongoose.Types.ObjectId | any;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  status: 'Reported' | 'Assigned' | 'Inspection Started' | 'Maintenance In Progress' | 'Waiting for Parts' | 'Resolved' | 'Closed' | 'Reopened';
  reporterName: string;
  reporterEmail: string;
  assignedTechnician?: string;
  maintenanceNotes?: string;
  partsReplaced?: string;
  maintenanceCost?: number;
  isAISuggested?: boolean;
  isUserEdited?: boolean;
  budget?: number;
  createdAt: Date;
  updatedAt: Date;
}

const IssueSchema: Schema = new Schema(
  {
    issueNumber: { type: String, required: true, unique: true, index: true },
    assetCode: { type: String, required: true, index: true },
    asset: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    priority: {
      type: String,
      required: true,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium',
    },
    category: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['Reported', 'Assigned', 'Inspection Started', 'Maintenance In Progress', 'Waiting for Parts', 'Resolved', 'Closed', 'Reopened'],
      default: 'Reported',
    },
    reporterName: { type: String, required: true },
    reporterEmail: { type: String, required: true },
    assignedTechnician: { type: String },
    maintenanceNotes: { type: String, default: '' },
    partsReplaced: { type: String, default: '' },
    maintenanceCost: { type: Number, default: 0 },
    isAISuggested: { type: Boolean, default: false },
    isUserEdited: { type: Boolean, default: false },
    budget: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Issue = mongoose.models.Issue || mongoose.model<IIssue>('Issue', IssueSchema);
