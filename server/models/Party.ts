import mongoose, { Schema } from 'mongoose';
import { IParty } from '../types/index';

const SourceSchema = new Schema({
  name: { type: String, enum: ['official', 'ekantipur', 'onlinekhabar', 'other'], required: true },
  url: String,
  timestamp: { type: Date, default: Date.now },
  seatsWon: Number,
  seatsLeading: Number,
  totalVotes: Number
}, { _id: false });

const PartySchema = new Schema<IParty>({
  name: { type: String, required: true, unique: true, trim: true },
  nameNepali: { type: String, trim: true },
  shortName: { type: String, trim: true },
  symbol: String,
  color: { type: String, default: '#808080' },
  seatsWon: { type: Number, default: 0, min: 0 },
  seatsLeading: { type: Number, default: 0, min: 0 },
  totalVotes: { type: Number, default: 0, min: 0 },
  votePercentage: { type: Number, default: 0, min: 0, max: 100 },
  lastUpdated: { type: Date, default: Date.now },
  sources: [SourceSchema]
}, {
  timestamps: true
});

PartySchema.index({ name: 1 });
PartySchema.index({ seatsWon: -1, seatsLeading: -1 });

export default mongoose.model<IParty>('Party', PartySchema);
