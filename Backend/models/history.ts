import mongoose, { Schema, Document } from 'mongoose';

export interface IHistory extends Document {
  timestamp: Date;
  action: string;
  actor: string;
  assetCode: string;
  asset?: mongoose.Types.ObjectId | any;
  issueNumber?: string;
  details?: string;
}

const HistorySchema: Schema = new Schema({
  timestamp: { type: Date, required: true, default: Date.now },
  action: { type: String, required: true },
  actor: { type: String, required: true },
  assetCode: { type: String, required: true, index: true },
  asset: { type: Schema.Types.ObjectId, ref: 'Asset', index: true },
  issueNumber: { type: String },
  details: { type: String },
});

// Non-editable restriction is usually enforced in controllers/services, rather than in DB level.
// We make sure the schema represents this.
export const History = mongoose.models.History || mongoose.model<IHistory>('History', HistorySchema);
