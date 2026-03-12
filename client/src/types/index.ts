export interface Party {
  _id: string;
  name: string;
  nameNepali?: string;
  shortName?: string;
  symbol?: string;
  color: string;
  seatsWon: number;
  seatsLeading: number;
  totalVotes: number;
  votePercentage: number;
  lastUpdated: string;
  sources: Source[];
}

export interface Constituency {
  _id: string;
  name: string;
  nameNepali?: string;
  constituencyNumber: number;
  province: string;
  provinceNumber: number;
  totalVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  countingStatus: 'not-started' | 'in-progress' | 'completed';
  winningCandidate?: Candidate;
  leadingCandidate?: Candidate;
  lastUpdated: string;
}

export interface Candidate {
  _id: string;
  name: string;
  nameNepali?: string;
  party: Party | string;
  constituency: Constituency | string;
  votesReceived: number;
  votePercentage: number;
  status: 'leading' | 'won' | 'lost' | 'counting';
  rank: number;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  lastUpdated: string;
  sources: Source[];
}

export interface ElectionUpdate {
  _id: string;
  source: 'official' | 'ekantipur' | 'onlinekhabar' | 'other';
  sourceUrl?: string;
  updateType: 'party-standings' | 'constituency-result' | 'candidate-update' | 'general';
  title: string;
  description?: string;
  data?: any;
  timestamp: string;
  isVerified: boolean;
  verifiedBy?: 'official' | 'cross-reference' | 'manual';
}

export interface Source {
  name: 'official' | 'ekantipur' | 'onlinekhabar' | 'other';
  url?: string;
  timestamp?: string;
  seatsWon?: number;
  seatsLeading?: number;
  totalVotes?: number;
}

export interface OverviewData {
  summary: {
    totalConstituencies: number;
    completedConstituencies: number;
    countingInProgress: number;
    totalCandidates: number;
    totalSeatsWon: number;
    totalSeatsLeading: number;
  };
  parties: Party[];
  lastUpdated: string;
}

export interface PartyStanding {
  rank: number;
  _id: string;
  name: string;
  nameNepali?: string;
  shortName?: string;
  color: string;
  seatsWon: number;
  seatsLeading: number;
  totalVotes: number;
  votePercentage: number;
}
