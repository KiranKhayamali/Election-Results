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
