import { Request, Response } from 'express';
import Constituency from '../models/Constituency';
import Candidate from '../models/Candidate';

export const getAllConstituencies = async (_req: Request, res: Response): Promise<void> => {
  try {
    const constituencies = await Constituency.find()
      .sort({ provinceNumber: 1, constituencyNumber: 1 });
    
    res.json({ constituencies, total: constituencies.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch constituencies', message: (error as Error).message });
  }
};

export const getConstituenciesByProvince = async (req: Request, res: Response): Promise<void> => {
  try {
    const provinceNumber = parseInt(req.params.provinceNumber);
    
    if (isNaN(provinceNumber) || provinceNumber < 1 || provinceNumber > 7) {
      res.status(400).json({ error: 'Invalid province number' });
      return;
    }

    const constituencies = await Constituency.find({ provinceNumber })
      .sort({ constituencyNumber: 1 });
    
    res.json({ 
      provinceNumber,
      constituencies,
      total: constituencies.length 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch constituencies', message: (error as Error).message });
  }
};

export const getConstituencyById = async (req: Request, res: Response): Promise<void> => {
  try {
    const constituency = await Constituency.findById(req.params.id)
      .populate('winningCandidate')
      .populate('leadingCandidate');
    
    if (!constituency) {
      res.status(404).json({ error: 'Constituency not found' });
      return;
    }

    res.json({ constituency });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch constituency', message: (error as Error).message });
  }
};

export const getConstituencyResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const constituency = await Constituency.findById(req.params.id);
    
    if (!constituency) {
      res.status(404).json({ error: 'Constituency not found' });
      return;
    }

    const candidates = await Candidate.find({ constituency: constituency._id })
      .populate('party')
      .sort({ votesReceived: -1 });

    res.json({
      constituency,
      candidates,
      totalCandidates: candidates.length,
      votesCountedPercentage: constituency.totalVoters > 0 
        ? (constituency.totalVotesCast / constituency.totalVoters) * 100 
        : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch constituency results', message: (error as Error).message });
  }
};
