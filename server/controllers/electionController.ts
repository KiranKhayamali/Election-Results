import { Request, Response } from 'express';
import Party from '../models/Party';
import Constituency from '../models/Constituency';
import Candidate from '../models/Candidate';
import ElectionUpdate from '../models/ElectionUpdate';
import { fetchAllSources } from '../services/aggregationService';

export const getOverallResults = async (_req: Request, res: Response): Promise<void> => {
  try {
    const parties = await Party.find().sort({ seatsWon: -1, seatsLeading: -1 });
    const dbConstituencies = await Constituency.countDocuments();
    const dbCompleted = await Constituency.countDocuments({ countingStatus: 'completed' });
    const totalCandidates = await Candidate.countDocuments();

    const latestOfficialUpdate = await ElectionUpdate.findOne({
      source: 'official',
      'data.resultsDeclared': { $exists: true },
      'data.partyStandings.0': { $exists: true }
    }).sort({ timestamp: -1 });

    const officialDeclared = Number(latestOfficialUpdate?.data?.resultsDeclared);
    const officialTotal = Number(latestOfficialUpdate?.data?.totalConstituencies);

    const totalConstituencies = Number.isFinite(officialTotal) && officialTotal > 0
      ? officialTotal
      : dbConstituencies;

    const completedConstituenciesRaw = Number.isFinite(officialDeclared) && officialDeclared >= 0
      ? officialDeclared
      : dbCompleted;
    
    const officialPartyStandings: Array<{ name: string; seatsWon: number; seatsLeading: number }> =
      (latestOfficialUpdate?.data?.partyStandings as Array<{ name: string; seatsWon: number; seatsLeading: number }> | undefined)
      || [];

    const partyByName = new Map(parties.map((party) => [party.name, party]));

    const mergedParties = parties.map((party) => {
      const official = officialPartyStandings.find((p) => p.name === party.name);
      if (!official) return party;

      const merged = party.toObject();
      merged.seatsWon = official.seatsWon;
      merged.seatsLeading = official.seatsLeading;
      return merged;
    });

    // Include official-only rows even if a party hasn't been created yet in Party collection.
    for (const official of officialPartyStandings) {
      if (!partyByName.has(official.name)) {
        mergedParties.push({
          _id: `official-${official.name}`,
          name: official.name,
          color: '#808080',
          seatsWon: official.seatsWon,
          seatsLeading: official.seatsLeading,
          totalVotes: 0,
          votePercentage: 0,
          lastUpdated: latestOfficialUpdate?.timestamp || new Date(),
          sources: []
        } as any);
      }
    }

    mergedParties.sort((a: any, b: any) => (b.seatsWon - a.seatsWon) || (b.seatsLeading - a.seatsLeading));

    const totalSeatsWon = mergedParties.reduce((sum: number, party: any) => sum + Number(party.seatsWon || 0), 0);
    const totalSeatsLeading = mergedParties.reduce((sum: number, party: any) => sum + Number(party.seatsLeading || 0), 0);
    const completedConstituencies = Math.max(completedConstituenciesRaw, totalSeatsWon);

    res.json({
      summary: {
        totalConstituencies,
        completedConstituencies,
        countingInProgress: Math.max(totalConstituencies - completedConstituencies, 0),
        totalCandidates,
        totalSeatsWon,
        totalSeatsLeading
      },
      parties: mergedParties.slice(0, 10), // Top 10 parties with official seats merged
      lastUpdated: latestOfficialUpdate?.timestamp || parties[0]?.lastUpdated || new Date()
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

export const getLatestOfficialProvinceResults = async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestProvinceUpdate = await ElectionUpdate.findOne({
      source: 'official',
      title: 'Official Province Results Sync',
      'data.provinces.0': { $exists: true }
    }).sort({ timestamp: -1 });

    if (!latestProvinceUpdate) {
      res.status(404).json({
        error: 'No official province results found',
        message: 'Run `npm run scrape:official:provinces` to populate province results.'
      });
      return;
    }

    res.json({
      source: latestProvinceUpdate.source,
      sourceUrl: latestProvinceUpdate.sourceUrl,
      timestamp: latestProvinceUpdate.timestamp,
      provinces: latestProvinceUpdate.data?.provinces || [],
      fetchedConstituencyFiles: latestProvinceUpdate.data?.fetchedConstituencyFiles || 0,
      skippedConstituencyFiles: latestProvinceUpdate.data?.skippedConstituencyFiles || 0
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch official province results',
      message: (error as Error).message
    });
  }
};

export const getLatestEkantipurProvinceResults = async (_req: Request, res: Response): Promise<void> => {
  try {
    const latestProvinceUpdate = await ElectionUpdate.findOne({
      source: 'ekantipur',
      title: 'Ekantipur Province Results Sync',
      'data.provinces.0': { $exists: true }
    }).sort({ timestamp: -1 });

    if (!latestProvinceUpdate) {
      res.status(404).json({
        error: 'No Ekantipur province results found',
        message: 'Run `npm run scrape:ekantipur:provinces` to populate province results.'
      });
      return;
    }

    res.json({
      source: latestProvinceUpdate.source,
      sourceUrl: latestProvinceUpdate.sourceUrl,
      timestamp: latestProvinceUpdate.timestamp,
      provinces: latestProvinceUpdate.data?.provinces || []
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch Ekantipur province results',
      message: (error as Error).message
    });
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

      // Calculate leading candidates per constituency with full details
      const constituenciesWithDetails: any[] = [];
      for (const constituency of constituencies) {
        const candidsInConstit = allCandidates.filter(
          c => (typeof c.constituency === 'object' ? c.constituency._id : c.constituency).toString() === constituency._id.toString()
        );
        
        const constituencyData: any = {
          constituencyNumber: constituency.constituencyNumber,
          constituencyName: constituency.name,
          totalVoters: constituency.totalVoters,
          votesCast: constituency.totalVotesCast,
          countingStatus: constituency.countingStatus
        };

        if (candidsInConstit.length > 0) {
          const leader = candidsInConstit[0];
          const second = candidsInConstit[1];
          
          constituencyData.leadingCandidate = {
            candidateName: leader.name,
            partyName: typeof leader.party === 'object' && leader.party && 'name' in leader.party ? leader.party.name : 'Unknown',
            partyColor: typeof leader.party === 'object' && leader.party && 'color' in leader.party ? leader.party.color : '#667eea',
            votes: leader.votesReceived,
            votesPercentage: constituency.totalVotesCast > 0 
              ? Number(((leader.votesReceived / constituency.totalVotesCast) * 100).toFixed(2))
              : 0,
            voteDifference: second ? leader.votesReceived - second.votesReceived : leader.votesReceived,
            secondPlaceName: second ? second.name : 'N/A',
            secondPlaceVotes: second ? second.votesReceived : 0,
            constituentName: constituency.name
          };
        }
        
        constituenciesWithDetails.push(constituencyData);
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
        constituencies: constituenciesWithDetails,
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
