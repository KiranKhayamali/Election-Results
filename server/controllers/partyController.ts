import { Request, Response } from 'express';
import Party from '../models/Party';
import Candidate from '../models/Candidate';
import ElectionUpdate from '../models/ElectionUpdate';

const mergeWithOfficialStandings = async (parties: any[]): Promise<any[]> => {
  const latestOfficialUpdate = await ElectionUpdate.findOne({
    source: 'official',
    'data.partyStandings.0': { $exists: true }
  }).sort({ timestamp: -1 });

  const officialPartyStandings: Array<{ name: string; seatsWon: number; seatsLeading: number }> =
    (latestOfficialUpdate?.data?.partyStandings as Array<{ name: string; seatsWon: number; seatsLeading: number }> | undefined)
    || [];

  if (officialPartyStandings.length === 0) {
    return parties;
  }

  const partyByName = new Map(parties.map((party) => [party.name, party]));
  const merged = parties.map((party) => {
    const official = officialPartyStandings.find((p) => p.name === party.name);
    if (!official) return party;

    const obj = party.toObject ? party.toObject() : { ...party };
    obj.seatsWon = official.seatsWon;
    obj.seatsLeading = official.seatsLeading;
    return obj;
  });

  for (const official of officialPartyStandings) {
    if (!partyByName.has(official.name)) {
      merged.push({
        _id: `official-${official.name}`,
        name: official.name,
        color: '#808080',
        seatsWon: official.seatsWon,
        seatsLeading: official.seatsLeading,
        totalVotes: 0,
        votePercentage: 0,
        sources: []
      });
    }
  }

  merged.sort((a: any, b: any) => (b.seatsWon - a.seatsWon) || (b.seatsLeading - a.seatsLeading) || (b.totalVotes - a.totalVotes));
  return merged;
};

export const getAllParties = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rawParties = await Party.find().sort({ name: 1 });
    const parties = await mergeWithOfficialStandings(rawParties as any[]);
    res.json({ parties, total: parties.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch parties', message: (error as Error).message });
  }
};

export const getPartyStandings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rawParties = await Party.find()
      .sort({ seatsWon: -1, seatsLeading: -1, totalVotes: -1 });

    const parties = await mergeWithOfficialStandings(rawParties as any[]);

    const standings = parties.map((party, index) => ({
      rank: index + 1,
      ...(party.toObject ? party.toObject() : party)
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
