import mongoose, { Schema } from 'mongoose';
import { IConstituency } from '../types/index';

const ConstituencySchema = new Schema<IConstituency>({
  name: { type: String, required: true, trim: true },
  nameNepali: { type: String, trim: true },
  constituencyNumber: { type: Number, required: true },
  province: { type: String, required: true, trim: true },
  provinceNumber: { type: Number, required: true, min: 1, max: 7 },
  totalVoters: { type: Number, default: 0, min: 0 },
  totalVotesCast: { type: Number, default: 0, min: 0 },
  turnoutPercentage: { type: Number, default: 0, min: 0, max: 100 },
  countingStatus: { 
    type: String, 
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started'
  },
  winningCandidate: { type: Schema.Types.ObjectId, ref: 'Candidate' },
  leadingCandidate: { type: Schema.Types.ObjectId, ref: 'Candidate' },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

ConstituencySchema.index({ constituencyNumber: 1, provinceNumber: 1 }, { unique: true });
ConstituencySchema.index({ provinceNumber: 1 });
ConstituencySchema.index({ countingStatus: 1 });

export default mongoose.model<IConstituency>('Constituency', ConstituencySchema);
