import { Request, Response } from 'express';
import Party from '../models/Party';
import Candidate from '../models/Candidate';

export const getAllParties = async (_req: Request, res: Response): Promise<void> => {
  try {
    const parties = await Party.find().sort({ name: 1 });
    res.json({ parties, total: parties.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parties', message: (error as Error).message });
  }
};

export const getPartyStandings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const parties = await Party.find()
      .sort({ seatsWon: -1, seatsLeading: -1, totalVotes: -1 });

    const standings = parties.map((party, index) => ({
      rank: index + 1,
      ...party.toObject()
    }));

    res.json({ standings, total: standings.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch party standings', message: (error as Error).message });
  }
};

export const getPartyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const party = await Party.findById(req.params.id);
    
    if (!party) {
      res.status(404).json({ error: 'Party not found' });
      return;
    }

    const candidates = await Candidate.find({ party: party._id })
      .populate('constituency')
      .sort({ votesReceived: -1 });

    const winningCandidates = candidates.filter(c => c.status === 'won');
    const leadingCandidates = candidates.filter(c => c.status === 'leading');

    res.json({
      party,
      candidates: {
        total: candidates.length,
        winning: winningCandidates.length,
        leading: leadingCandidates.length,
        list: candidates
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch party details', message: (error as Error).message });
  }
};
