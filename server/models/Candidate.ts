import mongoose, { Schema } from 'mongoose';
import { ICandidate } from '../types/index';

const CandidateSourceSchema = new Schema({
  name: { type: String, enum: ['official', 'ekantipur', 'onlinekhabar', 'other'], required: true },
  url: String,
  timestamp: { type: Date, default: Date.now },
  votesReceived: Number,
  status: String
}, { _id: false });

const CandidateSchema = new Schema<ICandidate>({
  name: { type: String, required: true, trim: true },
  nameNepali: { type: String, trim: true },
  party: { type: Schema.Types.ObjectId, ref: 'Party', required: true },
  constituency: { type: Schema.Types.ObjectId, ref: 'Constituency', required: true },
  votesReceived: { type: Number, default: 0, min: 0 },
  votePercentage: { type: Number, default: 0, min: 0, max: 100 },
  status: { 
    type: String, 
    enum: ['leading', 'won', 'lost', 'counting'],
    default: 'counting'
  },
  rank: { type: Number, default: 0, min: 0 },
  age: { type: Number, min: 18 },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  lastUpdated: { type: Date, default: Date.now },
  sources: [CandidateSourceSchema]
}, {
  timestamps: true
});

CandidateSchema.index({ party: 1 });
CandidateSchema.index({ constituency: 1 });
CandidateSchema.index({ status: 1 });
CandidateSchema.index({ constituency: 1, rank: 1 });

export default mongoose.model<ICandidate>('Candidate', CandidateSchema);
