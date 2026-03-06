import mongoose, { Schema } from 'mongoose';
import { IElectionUpdate } from '../types/index';

const ElectionUpdateSchema = new Schema<IElectionUpdate>({
  source: { 
    type: String, 
    enum: ['official', 'ekantipur', 'onlinekhabar', 'other'],
    required: true 
  },
  sourceUrl: { type: String, trim: true },
  updateType: { 
    type: String, 
    enum: ['party-standings', 'constituency-result', 'candidate-update', 'candidate-scrape', 'general'],
    required: true 
  },
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  data: Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now, required: true },
  isVerified: { type: Boolean, default: false },
  verifiedBy: { 
    type: String, 
    enum: ['official', 'cross-reference', 'manual']
  }
}, {
  timestamps: true
});

ElectionUpdateSchema.index({ timestamp: -1 });
ElectionUpdateSchema.index({ source: 1, timestamp: -1 });
ElectionUpdateSchema.index({ updateType: 1, timestamp: -1 });
ElectionUpdateSchema.index({ isVerified: 1 });

export default mongoose.model<IElectionUpdate>('ElectionUpdate', ElectionUpdateSchema);
