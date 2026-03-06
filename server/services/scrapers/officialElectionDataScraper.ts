import axios from 'axios';
import * as cheerio from 'cheerio';
import type { AxiosResponse } from 'axios';
import Party from '../../models/Party';
import Candidate from '../../models/Candidate';
import ElectionUpdate from '../../models/ElectionUpdate';

// Official election data structure
interface OfficialElectionStats {
  totalConstituencies: number;
  resultsDeclared: number;
  countingInProgress: number;
  totalCandidates: number;
  lastUpdated: Date;
  parties: {
    name: string;
    seatsWon: number;
    seatsLeading: number;
  }[];
}

interface OfficialPartyJsonRow {
  PartyId: number;
  PoliticalPartyName: string;
  TotWin: number;
  TotLead: number;
  TotWinLead: number;
  SymbolID?: number;
}

const OFFICIAL_NAME_MAP: Record<string, string> = {
  'राष्ट्रिय स्वतन्त्र पार्टी': 'Rastriya Swatantra Party',
  'नेपाली काँग्रेस': 'Nepali Congress',
  'नेपाली कांग्रेस': 'Nepali Congress',
  'नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)': 'CPN-UML',
  'नेपाली कम्युनिष्ट पार्टी': 'Nepali Communist Party',
  'राष्ट्रिय प्रजातन्त्र पार्टी': 'Rastriya Prajatantra Party',
  'प्रगतिशील लोकतान्त्रिक पार्टी': 'Pragatishil Loktantrik Party',
  'श्रम संस्कृति पार्टी': 'Shram Sanskriti Party',
  'स्वतन्त्र': 'Independent'
};

const OFFICIAL_PARTY_ID_MAP: Record<number, string> = {
  158: 'Rastriya Swatantra Party',
  2: 'Nepali Congress',
  1: 'CPN-UML',
  166: 'Nepali Communist Party',
  3: 'Rastriya Prajatantra Party',
  4: 'Pragatishil Loktantrik Party',
  179: 'Shram Sanskriti Party',
  9999: 'Independent'
};

const normalizeOfficialPartyName = (name: string): string => {
  const trimmed = name.trim();
  return OFFICIAL_NAME_MAP[trimmed] || trimmed;
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

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const decodePossiblyMojibake = (value: string): string => {
  if (!value) return value;
  if (/[\u0900-\u097F]/.test(value)) return value;

  try {
    const decoded = Buffer.from(value, 'latin1').toString('utf8');
    return decoded || value;
  } catch {
    return value;
  }
};

const extractCsrfToken = (setCookieHeaders: string[] = []): string | null => {
  for (const cookieLine of setCookieHeaders) {
    const match = cookieLine.match(/CsrfToken=([^;]+)/i);
    if (match) return match[1];
  }
  return null;
};

const buildCookieHeader = (setCookieHeaders: string[] = []): string => {
  return setCookieHeaders
    .map((line) => line.split(';')[0])
    .filter(Boolean)
    .join('; ');
};

const fetchOfficialPartyStandingsJson = async (): Promise<OfficialElectionStats['parties']> => {
  const homeUrl = 'https://result.election.gov.np/';
  const jsonUrl = 'https://result.election.gov.np/Handlers/SecureJson.ashx?file=JSONFiles/Election2082/Common/HORPartyTop5.txt';

  const homeResp = await axios.get(homeUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    timeout: 12000
  });

  const setCookieHeaders = (homeResp.headers['set-cookie'] || []) as string[];
  const csrfToken = extractCsrfToken(setCookieHeaders);
  const cookieHeader = buildCookieHeader(setCookieHeaders);

  if (!csrfToken || !cookieHeader) {
    throw new Error('Official site CSRF/cookie not available for SecureJson request');
  }

  const jsonResp = await axios.get<OfficialPartyJsonRow[]>(jsonUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json, text/plain, */*',
      'X-CSRF-Token': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: homeUrl,
      Cookie: cookieHeader
    },
    timeout: 12000
  });

  const rows = Array.isArray(jsonResp.data) ? jsonResp.data : [];

  return rows
    .map((row) => {
      const decodedName = decodePossiblyMojibake(row.PoliticalPartyName || '').trim();
      const mappedName = OFFICIAL_PARTY_ID_MAP[row.PartyId] || normalizeOfficialPartyName(decodedName);
      return {
        name: mappedName,
        seatsWon: Number(row.TotWin) || 0,
        seatsLeading: Number(row.TotLead) || 0
      };
    })
    .filter((row) => row.name && (row.seatsWon > 0 || row.seatsLeading > 0));
};

/**
 * Fetch official election results from result.election.gov.np
 * This scrapes real-time data from the official Election Commission website
 */
export async function scrapeOfficialElectionData(): Promise<OfficialElectionStats | null> {
  try {
    console.log('🔄 Fetching official election data from result.election.gov.np...');

    const candidateUrls = [
      'https://result.election.gov.np/MapElectionResult2082.aspx',
      'https://result.election.gov.np/',
      'https://result.election.gov.np/FPTPWLChartResult2082.aspx'
    ];

    let response: AxiosResponse<string> | null = null;
    let lastError: unknown = null;

    for (const url of candidateUrls) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            },
            timeout: 12000
          });
          break;
        } catch (err) {
          lastError = err;
          if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      if (response) {
        break;
      }
    }

    if (!response) {
      throw lastError;
    }
    
    const $ = cheerio.load(response.data);
    
    // Parse total constituencies and results declared from page text (supports Nepali digits).
    const bodyText = normalizeDigits($('body').text().replace(/\s+/g, ' '));

    let resultsDeclared = 0;
    let totalConstituencies = 165;

    const hsMatch = bodyText.match(/प्रतिनिधि सभा\s*\((\d+)\s*\/?\s*(\d+)\)/);
    if (hsMatch) {
      resultsDeclared = parseInt(hsMatch[1], 10) || 0;
      totalConstituencies = parseInt(hsMatch[2], 10) || 165;
    }

    const declaredMatch = bodyText.match(/विजयी\s*:?\s*(\d+)/);
    if (declaredMatch) {
      resultsDeclared = parseInt(declaredMatch[1], 10) || resultsDeclared;
    }
    
    // Parse party standings data
    const parties: OfficialElectionStats['parties'] = [];
    const partyMap = new Map<string, { seatsWon: number; seatsLeading: number }>();

    // Preferred source: official JSON feed used by the website itself.
    try {
      const jsonStandings = await fetchOfficialPartyStandingsJson();
      for (const party of jsonStandings) {
        partyMap.set(party.name, { seatsWon: party.seatsWon, seatsLeading: party.seatsLeading });
      }
    } catch (jsonError) {
      console.log('⚠️ Could not fetch official SecureJson standings, falling back to table/text parsing.');
    }
    
    if (partyMap.size === 0) {
      // Extract party data from tables
      const rows = $('table tr');
      rows.each((_index, row) => {
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          const partyName = $(cells[0]).text().trim();
          const won = parseLocalizedInt($(cells[1]).text());
          const leading = parseLocalizedInt($(cells[2]).text());
          
          if (partyName && (won > 0 || leading > 0)) {
            const normalizedName = normalizeOfficialPartyName(partyName);
            partyMap.set(normalizedName, { seatsWon: won, seatsLeading: leading });
          }
        }
      });
    }

    // Fallback parser: pull party rows directly from full text using known Nepali names.
    if (partyMap.size === 0) {
      for (const [nepaliName, englishName] of Object.entries(OFFICIAL_NAME_MAP)) {
        const regex = new RegExp(`${escapeRegExp(normalizeDigits(nepaliName))}\\s+(\\d+)\\s+(\\d+)`, 'i');
        const match = bodyText.match(regex);
        if (match) {
          const won = parseLocalizedInt(match[1]);
          const leading = parseLocalizedInt(match[2]);
          if (won > 0 || leading > 0) {
            partyMap.set(englishName, { seatsWon: won, seatsLeading: leading });
          }
        }
      }
    }

    partyMap.forEach((value, key) => {
      parties.push({
        name: key,
        seatsWon: value.seatsWon,
        seatsLeading: value.seatsLeading
      });
    });
    
    if (parties.length === 0) {
      console.log('⚠️ Official page fetched but no party standings could be parsed this cycle.');
    }

    // Fallback: derive declared count from party won seats if header parsing misses it.
    const seatsWonSum = parties.reduce((sum, p) => sum + p.seatsWon, 0);
    if (resultsDeclared <= 0 && seatsWonSum > 0) {
      resultsDeclared = seatsWonSum;
    }
    
    // Get total candidates from database (since this doesn't change much)
    const totalCandidates = await Candidate.countDocuments();
    
    const stats: OfficialElectionStats = {
      totalConstituencies,
      resultsDeclared,
      countingInProgress: totalConstituencies - resultsDeclared,
      totalCandidates,
      lastUpdated: new Date(),
      parties
    };
    
    console.log(`✅ Official data fetched:
      - Results Declared: ${stats.resultsDeclared}/${stats.totalConstituencies}
      - Counting in Progress: ${stats.countingInProgress}
      - Total Candidates: ${stats.totalCandidates}
      - Parties with data: ${stats.parties.length}`);
    
    return stats;
  } catch (error) {
    console.error('❌ Error fetching official election data:', error);
    return null;
  }
}

/**
 * Update party data from official election stats
 */
export async function updatePartiesFromOfficialData(stats: OfficialElectionStats): Promise<void> {
  try {
    console.log('📝 Updating party data from official election source...');
    
    for (const partyData of stats.parties) {
      // Find party by name (try different name variations)
      let party = await Party.findOne({ name: partyData.name });
      
      if (!party) {
        // Try to find with partial name match
        party = await Party.findOne({
          name: { $regex: partyData.name.substring(0, 10), $options: 'i' }
        });
      }
      
      if (party) {
        // Update with official data (but keep vote counts from other sources)
        const oldWon = party.seatsWon;
        const oldLeading = party.seatsLeading;
        
        party.seatsWon = partyData.seatsWon;
        party.seatsLeading = partyData.seatsLeading;
        party.lastUpdated = new Date();
        
        await party.save();
        
        if (oldWon !== partyData.seatsWon || oldLeading !== partyData.seatsLeading) {
          console.log(`  ✅ Updated ${party.name}: Won ${partyData.seatsWon}, Leading ${partyData.seatsLeading}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error updating parties from official data:', error);
  }
}

/**
 * Log election update to database
 */
export async function logElectionUpdate(
  title: string,
  description: string,
  data: any
): Promise<void> {
  try {
    await ElectionUpdate.create({
      source: 'official',
      sourceUrl: 'https://result.election.gov.np/MapElectionResult2082.aspx',
      updateType: 'general',
      title,
      description,
      data,
      timestamp: new Date(),
      isVerified: true,
      verifiedBy: 'official'
    });
  } catch (error) {
    console.error('❌ Error logging election update:', error);
  }
}

/**
 * Run a complete official data sync
 */
export async function syncOfficialElectionData(io?: any): Promise<OfficialElectionStats | null> {
  try {
    // Fetch official data
    const stats = await scrapeOfficialElectionData();
    
    if (!stats) {
      console.log('⚠️ Could not fetch official data, skipping update');
      return null;
    }

    if (!stats.parties || stats.parties.length === 0) {
      console.log('⚠️ Official data contained no party standings, skipping write for this cycle');
      return null;
    }
    
    // Update parties with official data
    await updatePartiesFromOfficialData(stats);
    
    // Log the update
    await logElectionUpdate(
      'Official Election Data Sync',
      `Updated official seat counts and election statistics`,
      {
        resultsDeclared: stats.resultsDeclared,
        totalConstituencies: stats.totalConstituencies,
        countingInProgress: stats.countingInProgress,
        totalCandidates: stats.totalCandidates,
        partyCount: stats.parties.length,
        partyStandings: stats.parties
      }
    );
    
    // Broadcast to all connected clients
    if (io) {
      io.emit('data-update', {
        type: 'official-sync',
        stats,
        timestamp: new Date()
      });
      console.log('📡 Broadcasted official data update to clients');
    }
    
    return stats;
  } catch (error) {
    console.error('❌ Error in syncOfficialElectionData:', error);
    return null;
  }
}
