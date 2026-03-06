import axios from 'axios';
import * as cheerio from 'cheerio';
import Party from '../../models/Party';
import ElectionUpdate from '../../models/ElectionUpdate';
import { AggregationResult } from '../../types';

const EKANTIPUR_URL = process.env.EKANTIPUR_URL || 'https://election.ekantipur.com/?lng=eng';

const PARTY_NAME_ALIASES: Record<string, string[]> = {
  'CPN-UML': ['CPN-UML'],
  'Nepali Congress': ['Nepali Congress'],
  'Nepal Communist Party (Maoist)': ['CPN (Maoist Center)', 'Nepal Communist Party (Maoist)'],
  'Rastriya Swatantra Party': ['Rastriya Swatantra Party', 'National Independence Party'],
  'Rastriya Prajatantra Party': ['Rastriya Prajatantra Party'],
  'Janata Samjbadi Party-Nepal': ['Janata Samajbadi Party'],
  'Janamat Party': ['Janamat Party'],
  'Nagarik Unmukti Party': ['Nagarik Unmukti Party'],
  'Nepali Communist Party': ['Nepali Communist Party', 'CPN'],
  'Ujaylo Nepal Party': ['Ujaylo Nepal Party'],
  'Shram Sanskriti Party': ['Shram Sanskriti Party']
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseVote = (raw: string): number => {
  const cleaned = raw.replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractPartyVotesFromEkantipur = (html: string): Map<string, number> => {
  const $ = cheerio.load(html);
  const votesByParty = new Map<string, number>();

  $('a[href="javascript:void(0)"]').each((_idx, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    const match = text.match(/^(.*)\s+([\d,]{4,})$/);
    if (!match) return;

    const scrapedName = match[1].trim();
    const votes = parseVote(match[2]);
    if (!votes) return;

    const matchedParty = Object.keys(PARTY_NAME_ALIASES).find((partyName) => {
      if (partyName.toLowerCase() === scrapedName.toLowerCase()) return true;
      const aliases = PARTY_NAME_ALIASES[partyName] || [];
      return aliases.some((alias) => alias.toLowerCase() === scrapedName.toLowerCase());
    });

    if (matchedParty) {
      votesByParty.set(matchedParty, votes);
    }
  });

  if (votesByParty.size > 0) {
    return votesByParty;
  }

  const pageText = $('body').text().replace(/\s+/g, ' ');

  for (const [partyName, aliases] of Object.entries(PARTY_NAME_ALIASES)) {
    const allNames = [partyName, ...aliases];
    for (const alias of allNames) {
      const regex = new RegExp(`${escapeRegExp(alias)}\\s+([\\d,]{4,})`, 'i');
      const match = pageText.match(regex);
      if (match) {
        const votes = parseVote(match[1]);
        if (votes > 0) {
          votesByParty.set(partyName, votes);
          break;
        }
      }
    }
  }

  return votesByParty;
};

export const scrapeEkantipurSource = async (): Promise<AggregationResult> => {
  try {
    console.log('Scraping Ekantipur source:', EKANTIPUR_URL);

    const response = await axios.get(EKANTIPUR_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const votesMap = extractPartyVotesFromEkantipur(response.data);

    if (votesMap.size === 0) {
      return {
        success: false,
        source: 'ekantipur',
        error: 'No party vote rows could be parsed from Ekantipur page'
      };
    }

    const totalVotes = Array.from(votesMap.values()).reduce((sum, votes) => sum + votes, 0);
    let partiesUpdated = 0;

    for (const [partyName, votes] of votesMap.entries()) {
      const votePercentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
      let party = await Party.findOne({ name: partyName });

      if (!party) {
        party = await Party.create({
          name: partyName,
          seatsWon: 0,
          seatsLeading: 0,
          totalVotes: votes,
          votePercentage,
          lastUpdated: new Date(),
          sources: [{
            name: 'ekantipur',
            url: EKANTIPUR_URL,
            timestamp: new Date(),
            totalVotes: votes
          }]
        });
      } else {
        party.totalVotes = votes;
        party.votePercentage = votePercentage;
        party.lastUpdated = new Date();

        const sourceIdx = party.sources.findIndex((s) => s.name === 'ekantipur');
        if (sourceIdx >= 0) {
          party.sources[sourceIdx] = {
            name: 'ekantipur',
            url: EKANTIPUR_URL,
            timestamp: new Date(),
            totalVotes: votes
          };
        } else {
          party.sources.push({
            name: 'ekantipur',
            url: EKANTIPUR_URL,
            timestamp: new Date(),
            totalVotes: votes
          });
        }

        await party.save();
      }

      partiesUpdated++;
    }

    await ElectionUpdate.create({
      source: 'ekantipur',
      sourceUrl: EKANTIPUR_URL,
      updateType: 'party-standings',
      title: 'Ekantipur Vote Totals Update',
      description: `Updated ${partiesUpdated} parties from Ekantipur`,
      timestamp: new Date(),
      isVerified: false,
      data: {
        partyCount: partiesUpdated,
        parsedTotalVotes: totalVotes
      }
    });

    console.log(`Ekantipur source: Updated ${partiesUpdated} parties`);

    return {
      success: true,
      source: 'ekantipur',
      partiesUpdated,
      candidatesUpdated: 0
    };
  } catch (error) {
    console.error('Error scraping Ekantipur source:', error);
    return {
      success: false,
      source: 'ekantipur',
      error: (error as Error).message
    };
  }
};
