import { Request, Response } from 'express';
import Candidate from '../models/Candidate';

export const getAllCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const candidates = await Candidate.find()
      .populate('party')
      .populate('constituency')
      .sort({ votesReceived: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Candidate.countDocuments();

    res.json({
      candidates,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + limit < total
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates', message: (error as Error).message });
  }
};

export const searchCandidates = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = req.query.q as string;
    
    if (!searchTerm) {
      res.status(400).json({ error: 'Search term required' });
      return;
    }

    const candidates = await Candidate.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { nameNepali: { $regex: searchTerm, $options: 'i' } }
      ]
    })
      .populate('party')
      .populate('constituency')
      .limit(20);

    res.json({ candidates, total: candidates.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to search candidates', message: (error as Error).message });
  }
};

export const getCandidatesByParty = async (req: Request, res: Response): Promise<void> => {
  try {
    const candidates = await Candidate.find({ party: req.params.partyId })
      .populate('constituency')
      .sort({ votesReceived: -1 });

    res.json({ candidates, total: candidates.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates', message: (error as Error).message });
  }
};

export const getCandidatesByConstituency = async (req: Request, res: Response): Promise<void> => {
  try {
    const candidates = await Candidate.find({ constituency: req.params.constituencyId })
      .populate('party')
      .sort({ votesReceived: -1 });

    res.json({ candidates, total: candidates.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidates', message: (error as Error).message });
  }
};

export const getCandidateById = async (req: Request, res: Response): Promise<void> => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('party')
      .populate('constituency');

    if (!candidate) {
      res.status(404).json({ error: 'Candidate not found' });
      return;
    }

    res.json({ candidate });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch candidate', message: (error as Error).message });
  }
};
