import axios from 'axios';
import * as cheerio from 'cheerio';
import Party from '../../models/Party';
import Candidate from '../../models/Candidate';
import Constituency from '../../models/Constituency';
import ElectionUpdate from '../../models/ElectionUpdate';
import { AggregationResult } from '../../types';

const ONLINEKHABAR_URL = process.env.ONLINEKHABAR_URL || 'https://election.onlinekhabar.com/candidate-list';

const PARTY_NAME_MAP: Record<string, string> = {
  'राष्ट्रिय स्वतन्त्र पार्टी': 'Rastriya Swatantra Party',
  'नेपाली कांग्रेस': 'Nepali Congress',
  'नेपाली कांग्र': 'Nepali Congress',
  'नेकपा एमाले': 'CPN-UML',
  'नेपाली कम्युनिस्ट पार्टी': 'Nepali Communist Party',
  'नेपाली कम्युनिष्ट पार्टी': 'Nepali Communist Party',
  'राष्ट्रिय प्रजातन्त्र पार्टी': 'Rastriya Prajatantra Party',
  'जनता समाजवादी पार्टी, नेपाल': 'Janata Samjbadi Party-Nepal',
  'जनमत पार्टी': 'Janamat Party',
  'नागरिक उन्मुक्ति पार्टी, नेपाल': 'Nagarik Unmukti Party',
  'उज्यालो नेपाल पार्टी': 'Ujaylo Nepal Party',
  'श्रम संस्कृति पार्टी': 'Shram Sanskriti Party'
};

const normalizeDigits = (value: string): string => {
  const devanagariDigits = '०१२३४५६७८९';
  return value.replace(/[०-९]/g, (d) => String(devanagariDigits.indexOf(d)));
};

const parseLocalizedInt = (value: string): number => {
  const normalized = normalizeDigits(value).replace(/,/g, '').trim();
  const parsed = parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTitleCase = (value: string): string => value
  .split('-')
  .filter(Boolean)
  .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
  .join(' ');

const slugToConstituencyName = (href: string): string | null => {
  const match = href.match(/\/central-chetra\/([a-z-]+?)(\d+)\/?$/i);
  if (!match) return null;

  const districtPart = toTitleCase(match[1]).replace(/\s+/g, ' ').trim();
  const seatNo = Number(match[2]);
  if (!districtPart || !Number.isFinite(seatNo) || seatNo <= 0) return null;

  return `${districtPart}-${seatNo}`;
};

const parseLeadingEntry = (text: string): { name: string; party: string; votes: number; status: 'leading' | 'won' } | null => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const status: 'leading' | 'won' = normalized.includes('Result Declared') ? 'won' : 'leading';

  const statusPrefixMatch = normalized.match(/(?:Counting\.\.|Result Declared)\s+(.+?)\s+(?:अग्रता|विजयी)/);
  if (!statusPrefixMatch) return null;

  const entryText = statusPrefixMatch[1].trim();
  const voteMatch = entryText.match(/([०-९\d,]+)\s*$/);
  if (!voteMatch) return null;

  const votes = parseLocalizedInt(voteMatch[1]);
  if (!votes) return null;

  const nameAndParty = entryText.slice(0, voteMatch.index).trim();
  let partyName = '';
  let candidateName = '';

  const matchedPartyNep = Object.keys(PARTY_NAME_MAP)
    .sort((a, b) => b.length - a.length)
    .find((party) => nameAndParty.includes(party));

  if (matchedPartyNep) {
    const idx = nameAndParty.indexOf(matchedPartyNep);
    candidateName = nameAndParty.slice(0, idx).trim();
    partyName = PARTY_NAME_MAP[matchedPartyNep] || matchedPartyNep;
  }

  if (!candidateName || !partyName) return null;

  return {
    name: candidateName,
    party: partyName,
    votes,
    status
  };
};

export const scrapeOnlineKhabarSource = async (): Promise<AggregationResult> => {
  try {
    console.log('Scraping OnlineKhabar source:', ONLINEKHABAR_URL);

    const response = await axios.get(ONLINEKHABAR_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const cards = $('.okel-candidate-card').toArray();

    if (cards.length === 0) {
      return {
        success: false,
        source: 'onlinekhabar',
        error: 'No candidate cards were found on candidate-list page'
      };
    }

    let candidatesUpdated = 0;
    const touchedParties = new Set<string>();

    for (const card of cards) {
      try {
        const cardNode = $(card);
        const href = cardNode.find('.linked-patch a').first().attr('href') || '';
        const constituencyName = slugToConstituencyName(href);

        if (!constituencyName) continue;

        const constituency = await Constituency.findOne({ name: constituencyName });
        if (!constituency) {
          // Skip if this constituency doesn't exist locally yet.
          continue;
        }

        const cardText = cardNode.text().replace(/\s+/g, ' ').trim();
        const parsed = parseLeadingEntry(cardText);
        if (!parsed) continue;

        let party = await Party.findOne({ name: parsed.party });
        if (!party) {
          party = await Party.create({
            name: parsed.party,
            seatsWon: 0,
            seatsLeading: 0,
            totalVotes: 0,
            votePercentage: 0,
            lastUpdated: new Date(),
            sources: [{
              name: 'onlinekhabar',
              url: ONLINEKHABAR_URL,
              timestamp: new Date()
            }]
          });
        }

        const existing = await Candidate.findOne({
          name: parsed.name,
          constituency: constituency._id
        });

        let candidateId: string | null = null;

        if (!existing) {
          const created = await Candidate.create({
            name: parsed.name,
            party: party._id,
            constituency: constituency._id,
            votesReceived: parsed.votes,
            status: parsed.status,
            sources: [{
              name: 'onlinekhabar',
              url: ONLINEKHABAR_URL,
              timestamp: new Date(),
              votesReceived: parsed.votes,
              status: parsed.status
            }]
          });
          candidateId = created._id.toString();
        } else {
          existing.party = party._id;
          existing.votesReceived = parsed.votes;
          existing.status = parsed.status;
          existing.lastUpdated = new Date();

          const sourceIdx = existing.sources.findIndex((s) => s.name === 'onlinekhabar');
          if (sourceIdx >= 0) {
            existing.sources[sourceIdx] = {
              name: 'onlinekhabar',
              url: ONLINEKHABAR_URL,
              timestamp: new Date(),
              votesReceived: parsed.votes,
              status: parsed.status
            };
          } else {
            existing.sources.push({
              name: 'onlinekhabar',
              url: ONLINEKHABAR_URL,
              timestamp: new Date(),
              votesReceived: parsed.votes,
              status: parsed.status
            });
          }

          await existing.save();
          candidateId = existing._id.toString();
        }

        if (candidateId) {
          constituency.leadingCandidate = candidateId as any;
        }
        if (parsed.status === 'won') {
          constituency.winningCandidate = candidateId as any;
          constituency.countingStatus = 'completed';
        }
        constituency.countingStatus = parsed.status === 'won' ? 'completed' : 'in-progress';
        constituency.lastUpdated = new Date();
        await constituency.save();

        touchedParties.add(parsed.party);
        candidatesUpdated++;
      } catch (err) {
        console.error('Error processing OnlineKhabar candidate card:', err);
      }
    }

    await ElectionUpdate.create({
      source: 'onlinekhabar',
      sourceUrl: ONLINEKHABAR_URL,
      updateType: 'candidate-update',
      title: 'OnlineKhabar Candidate List Update',
      description: `Parsed ${cards.length} cards; updated ${candidatesUpdated} candidates`,
      timestamp: new Date(),
      isVerified: false,
      data: {
        cardCount: cards.length,
        candidatesUpdated,
        partyCount: touchedParties.size
      }
    });

    console.log(`OnlineKhabar source: Updated ${candidatesUpdated} candidates from ${cards.length} cards`);

    return {
      success: true,
      source: 'onlinekhabar',
      partiesUpdated: touchedParties.size,
      candidatesUpdated
    };
  } catch (error) {
    console.error('Error scraping OnlineKhabar source:', error);
    return {
      success: false,
      source: 'onlinekhabar',
      error: (error as Error).message
    };
  }
};
