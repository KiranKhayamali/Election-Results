import { Document, Types } from 'mongoose';

export interface IParty extends Document {
  name: string;
  nameNepali?: string;
  shortName?: string;
  symbol?: string;
  color: string;
  seatsWon: number;
  seatsLeading: number;
  totalVotes: number;
  votePercentage: number;
  lastUpdated: Date;
  sources: ISource[];
}

export interface IConstituency extends Document {
  name: string;
  nameNepali?: string;
  constituencyNumber: number;
  province: string;
  provinceNumber: number;
  district?: string;
  totalVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  countingStatus: 'not-started' | 'in-progress' | 'completed';
  winningCandidate?: Types.ObjectId | string;
  leadingCandidate?: Types.ObjectId | string;
  lastUpdated: Date;
}

export interface ICandidate extends Document {
  name: string;
  nameNepali?: string;
  party: Types.ObjectId | string;
  constituency: Types.ObjectId | string;
  votesReceived: number;
  votePercentage: number;
  status: 'leading' | 'won' | 'lost' | 'counting';
  rank: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  lastUpdated: Date;
  sources: ISource[];
}

export interface IElectionUpdate extends Document {
  source: 'official' | 'ekantipur' | 'onlinekhabar' | 'other';
  sourceUrl?: string;
  updateType: 'party-standings' | 'constituency-result' | 'candidate-update' | 'candidate-scrape' | 'general';
  title: string;
  description?: string;
  data?: any;
  timestamp: Date;
  isVerified: boolean;
  verifiedBy?: 'official' | 'cross-reference' | 'manual';
}

export interface ISource {
  name: 'official' | 'ekantipur' | 'onlinekhabar' | 'other';
  url?: string;
  timestamp?: Date;
  seatsWon?: number;
  seatsLeading?: number;
  totalVotes?: number;
  votesReceived?: number;
  status?: string;
}

export interface ScrapedPartyData {
  name: string;
  nameNepali?: string;
  seatsWon: number;
  seatsLeading: number;
  totalVotes?: number;
  source: string;
}

export interface ScrapedCandidateData {
  name: string;
  nameNepali?: string;
  partyName: string;
  constituencyName: string;
  votesReceived: number;
  status: string;
  source: string;
}

export interface AggregationResult {
  success: boolean;
  source: string;
  partiesUpdated?: number;
  candidatesUpdated?: number;
  error?: string;
}
