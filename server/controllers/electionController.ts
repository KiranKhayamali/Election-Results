import { Request, Response } from 'express';
import Party from '../models/Party';
import Constituency from '../models/Constituency';
import Candidate from '../models/Candidate';
import ElectionUpdate from '../models/ElectionUpdate';
import { fetchAllSources } from '../services/aggregationService';

export const getOverallResults = async (_req: Request, res: Response): Promise<void> => {
  try {
    const parties = await Party.find().sort({ seatsWon: -1, seatsLeading: -1 });
    const totalConstituencies = await Constituency.countDocuments();
    const completedConstituencies = await Constituency.countDocuments({ countingStatus: 'completed' });
    const totalCandidates = await Candidate.countDocuments();
    
    const totalSeatsWon = parties.reduce((sum, party) => sum + party.seatsWon, 0);
    const totalSeatsLeading = parties.reduce((sum, party) => sum + party.seatsLeading, 0);

    res.json({
      summary: {
        totalConstituencies,
        completedConstituencies,
        countingInProgress: totalConstituencies - completedConstituencies,
        totalCandidates,
        totalSeatsWon,
        totalSeatsLeading
      },
      parties: parties.slice(0, 10), // Top 10 parties
      lastUpdated: parties[0]?.lastUpdated || new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overall results', message: (error as Error).message });
  }
};

export const getRecentUpdates = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = parseInt(req.query.skip as string) || 0;
    const source = req.query.source as string;

    const query: any = {};
    if (source) {
      query.source = source;
    }

    const updates = await ElectionUpdate.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip);

    const total = await ElectionUpdate.countDocuments(query);

    res.json({
      updates,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch updates', message: (error as Error).message });
  }
};

export const getProvinceResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const provinceNumber = parseInt(req.params.provinceNumber);

    if (isNaN(provinceNumber) || provinceNumber < 1 || provinceNumber > 7) {
      res.status(400).json({ error: 'Invalid province number. Must be between 1 and 7.' });
      return;
    }

    const constituencies = await Constituency.find({ provinceNumber })
      .populate('winningCandidate')
      .populate('leadingCandidate')
      .sort({ constituencyNumber: 1 });

    const constituencyIds = constituencies.map(c => c._id);
    const candidates = await Candidate.find({ constituency: { $in: constituencyIds } })
      .populate('party')
      .sort({ votesReceived: -1 });

    res.json({
      provinceNumber,
      constituencies,
      totalConstituencies: constituencies.length,
      completed: constituencies.filter(c => c.countingStatus === 'completed').length,
      topCandidates: candidates.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch province results', message: (error as Error).message });
  }
};

export const triggerManualUpdate = async (req: Request, res: Response): Promise<void> => {
  try {
    const io = req.app.get('io');
    const results = await fetchAllSources(io);
    
    res.json({
      message: 'Manual update triggered successfully',
      results
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger update', message: (error as Error).message });
  }
};

export const getLeadingCandidates = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Get all candidates grouped by constituency
    const constituencies = await Constituency.find().select('_id name constituencyNumber');
    
    const leadingCandidatesData: any[] = [];

    for (const constituency of constituencies) {
      // Get top 2 candidates in this constituency
      const topCandidates = await Candidate.find({ constituency: constituency._id })
        .populate('party')
        .sort({ votesReceived: -1 })
        .limit(2);

      if (topCandidates.length > 0) {
        const leading = topCandidates[0];
        const second = topCandidates[1];
        
        const voteDifference = second ? leading.votesReceived - second.votesReceived : leading.votesReceived;

        leadingCandidatesData.push({
          _id: leading._id,
          name: leading.name,
          party: leading.party,
          constituency: {
            _id: constituency._id,
            name: constituency.name,
            constituencyNumber: constituency.constituencyNumber
          },
          votesReceived: leading.votesReceived,
          votePercentage: leading.votePercentage,
          voteDifference, // Votes leading by
          secondPlaceVotes: second ? second.votesReceived : 0,
          secondPlaceName: second ? second.name : 'N/A',
          status: 'leading' as const
        });
      }
    }

    // Sort by votes leading with (largest leads first)
    leadingCandidatesData.sort((a, b) => b.voteDifference - a.voteDifference);

    res.json({
      candidates: leadingCandidatesData.slice(0, 12), // Top 12 leading candidates
      total: leadingCandidatesData.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leading candidates', message: (error as Error).message });
  }
};

export const getAllProvincesResults = async (_req: Request, res: Response): Promise<void> => {
  try {
    const provincesData = [];

    for (let provinceNum = 1; provinceNum <= 7; provinceNum++) {
      const constituencies = await Constituency.find({ provinceNumber: provinceNum })
        .populate('winningCandidate')
        .populate('leadingCandidate')
        .sort({ constituencyNumber: 1 });

      const constituencyIds = constituencies.map(c => c._id);
      
      // Get all candidates for this province
      const allCandidates = await Candidate.find({ constituency: { $in: constituencyIds } })
        .populate('party')
        .sort({ votesReceived: -1 });

      // Calculate leading candidates per constituency
      const leadingByConstituency: any[] = [];
      for (const constituency of constituencies) {
        const candidsInConstit = allCandidates.filter(
          c => (typeof c.constituency === 'object' ? c.constituency._id : c.constituency).toString() === constituency._id.toString()
        );
        
        if (candidsInConstit.length > 0) {
          const leader = candidsInConstit[0];
          const second = candidsInConstit[1];
          
          leadingByConstituency.push({
            constituency: constituency.name,
            constituencyNumber: constituency.constituencyNumber,
            leadingCandidate: leader.name,
            leadingParty: typeof leader.party === 'object' ? leader.party.name : 'Unknown',
            leadingVotes: leader.votesReceived,
            secondPlaceCandidate: second ? second.name : 'N/A',
            secondPlaceVotes: second ? second.votesReceived : 0,
            voteDifference: second ? leader.votesReceived - second.votesReceived : leader.votesReceived,
            countingStatus: constituency.countingStatus
          });
        }
      }

      // Province summary stats
      const completed = constituencies.filter(c => c.countingStatus === 'completed').length;
      const inProgress = constituencies.filter(c => c.countingStatus === 'in-progress').length;
      
      // Get top candidates in this province
      const topCandidates = allCandidates.slice(0, 8);

      provincesData.push({
        provinceNumber: provinceNum,
        provinceName: getProvinceName(provinceNum),
        totalConstituencies: constituencies.length,
        completedCount: completed,
        inProgressCount: inProgress,
        notStartedCount: constituencies.length - completed - inProgress,
        constituencies: leadingByConstituency,
        topCandidates: topCandidates,
        allCandidatesCount: allCandidates.length
      });
    }

    res.json({
      provinces: provincesData,
      totalProvinces: 7,
      lastUpdated: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch all provinces results', message: (error as Error).message });
  }
};

// Helper function to get province name
function getProvinceName(provinceNumber: number): string {
  const provinces: { [key: number]: string } = {
    1: 'Koshi',
    2: 'Madhesh',
    3: 'Bagmati',
    4: 'Gandaki',
    5: 'Lumbini',
    6: 'Karnali',
    7: 'Sudurpashchim'
  };
  return provinces[provinceNumber] || `Province ${provinceNumber}`;
}
