import axios from 'axios';
import * as cheerio from 'cheerio';
import Constituency from '../../models/Constituency';
import Candidate from '../../models/Candidate';
import Party from '../../models/Party';
import ElectionUpdate from '../../models/ElectionUpdate';

const EKANTIPUR_BASE = 'https://election.ekantipur.com';

// Province number to Ekantipur format
const PROVINCE_MAP: Record<number, string> = {
  1: 'pradesh-1',
  2: 'pradesh-2',
  3: 'pradesh-3',
  4: 'pradesh-4',
  5: 'pradesh-5',
  6: 'pradesh-6',
  7: 'pradesh-7'
};

// Known district slug variants used by Ekantipur URLs.
const DISTRICT_ALIASES: Record<string, string[]> = {
  'Dhanusha': ['dhanusa', 'dhanusha'],
  'Rautahat': ['rautahat', 'rauthat'],
  'Kavrepalanchok': ['kavrepalanchowk', 'kavrepalanchok', 'kavre'],
  'Sindhupalchok': ['sindhupalchowk', 'sindhupalchok'],
  'Nawalparasi-East': ['nawalparasieast', 'nawalparasi-east', 'nawalparasi'],
  'Nawalparasi-West': ['nawalparasiwest', 'nawalparasi-west', 'nawalparasi'],
  'Rukum-East': ['rukumeast', 'rukum-east', 'rukum'],
  'Rukum-West': ['rukumwest', 'rukum-west', 'rukum']
};

// Some constituencies are stored with incorrect province in local seed data.
const DISTRICT_PROVINCE_OVERRIDE: Record<string, number> = {
  'Sindhuli': 3
};

// District name normalization for URL
const normalizeDistrictForURL = (district: string): string => {
  return district
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()]/g, '');
};

// Party name mappings (Nepali to English)
const PARTY_NAME_MAP: Record<string, string> = {
  'राष्ट्रिय स्वतन्त्र पार्टी': 'Rastriya Swatantra Party',
  'नेपाली कांग्रेस': 'Nepali Congress',
  'नेपाली कांग्र': 'Nepali Congress',
  'नेकपा एमाले': 'CPN-UML',
  'नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)': 'CPN-UML',
  'नेपाली कम्युनिष्ट पार्टी': 'Nepali Communist Party',
  'राष्ट्रिय प्रजातन्त्र पार्टी': 'Rastriya Prajatantra Party',
  'जनता समाजवादी पार्टी, नेपाल': 'Janata Samjbadi Party-Nepal',
  'जनमत पार्टी': 'Janamat Party',
  'नागरिक उन्मुक्ति पार्टी': 'Nagarik Unmukti Party',
  'उज्यालो नेपाल पार्टी': 'Ujaylo Nepal Party',
  'श्रम संस्कृति पार्टी': 'Shram Sanskriti Party',
  'नेपाल मजदूर किसान पार्टी': 'Nepal Majdoor Kisan Party',
  'लोकतान्त्रिक समाजवादी पार्टी': 'Democratic Socialist Party',
  'स्वतन्त्र': 'Independent'
};

const normalizeDigits = (value: string): string => {
  const devanagariDigits = '०१२३४५६७८९';
  return value.replace(/[०-९]/g, (d) => String(devanagariDigits.indexOf(d)));
};

const parseVotes = (value: string): number => {
  const normalized = normalizeDigits(value).replace(/,/g, '').trim();
  const parsed = parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePartyName = (partyName: string): string => {
  const trimmed = partyName.trim();
  
  // Check exact match first
  if (PARTY_NAME_MAP[trimmed]) {
    return PARTY_NAME_MAP[trimmed];
  }
  
  // Check partial match
  for (const [nepali, english] of Object.entries(PARTY_NAME_MAP)) {
    if (trimmed.includes(nepali) || nepali.includes(trimmed)) {
      return english;
    }
  }
  
  // Return original if no match
  return trimmed;
};

const getDistrictVariants = (district: string): string[] => {
  const raw = district.trim();
  const normalized = normalizeDistrictForURL(raw);
  const aliases = DISTRICT_ALIASES[raw] || [];
  const merged = [normalized, ...aliases.map((a) => normalizeDistrictForURL(a))];
  return Array.from(new Set(merged.filter(Boolean)));
};

const buildConstituencyURLCandidates = (
  provinceNumber: number,
  district: string,
  constituencyNum: number
): string[] => {
  const provinceCandidates = [provinceNumber];
  const overrideProvince = DISTRICT_PROVINCE_OVERRIDE[district];
  if (overrideProvince && !provinceCandidates.includes(overrideProvince)) {
    provinceCandidates.push(overrideProvince);
  }

  const districtVariants = getDistrictVariants(district);
  const urls: string[] = [];

  for (const p of provinceCandidates) {
    const provincePart = PROVINCE_MAP[p];
    if (!provincePart) continue;

    for (const d of districtVariants) {
      urls.push(`${EKANTIPUR_BASE}/${provincePart}/district-${d}/constituency-${constituencyNum}?lng=eng`);
    }
  }

  return Array.from(new Set(urls));
};

interface CandidateData {
  name: string;
  party: string;
  votes: number;
  rank: number;
}

const parseConstituencyPage = async (url: string): Promise<CandidateData[]> => {
  try {
    const response = await axios.get(url, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const candidates: CandidateData[] = [];
    
    // Find table rows (skip header row)
    $('table tr').each((index, row) => {
      if (index === 0) return; // Skip header
      
      const cells = $(row).find('td');
      if (cells.length < 3) return;
      
      const candidateName = $(cells[0]).text().trim();
      const partyName = $(cells[1]).text().trim();
      const votesText = $(cells[2]).text().trim();
      
      if (!candidateName || !partyName) return;
      
      const votes = parseVotes(votesText);
      const normalizedParty = normalizePartyName(partyName);
      
      candidates.push({
        name: candidateName,
        party: normalizedParty,
        votes,
        rank: index  // Row index as rank
      });
    });
    
    return candidates;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return [];
  }
};

const parseConstituencyFromCandidates = async (urls: string[]): Promise<{ candidates: CandidateData[]; matchedUrl?: string }> => {
  for (const url of urls) {
    const candidates = await parseConstituencyPage(url);
    if (candidates.length > 0) {
      return { candidates, matchedUrl: url };
    }
  }

  return { candidates: [] };
};

export const scrapeEkantipurCandidates = async (): Promise<{
  success: boolean;
  candidatesProcessed: number;
  constituenciesProcessed: number;
  errors: string[];
}> => {
  console.log('🔍 Starting Ekantipur candidate scraping...');
  
  const constituencies = await Constituency.find({}).sort({ provinceNumber: 1, constituencyNumber: 1 });
  console.log(`Found ${constituencies.length} constituencies in database`);
  
  let candidatesProcessed = 0;
  let constituenciesProcessed = 0;
  const errors: string[] = [];
  
  for (const constituency of constituencies) {
    try {
      // Extract constituency number from name (e.g., "Bhaktapur-1" => 1)
      const nameMatch = constituency.name.match(/-(\d+)$/);
      if (!nameMatch) {
        console.warn(`Cannot parse constituency number from: ${constituency.name}`);
        continue;
      }
      
      const constituencyNum = parseInt(nameMatch[1], 10);
      
      // Extract district from constituency name (e.g., "Taplejung-1" => "Taplejung")
      const district = constituency.district || constituency.name.split('-')[0].trim();
      
      const urlCandidates = buildConstituencyURLCandidates(
        constituency.provinceNumber,
        district,
        constituencyNum
      );

      console.log(`\nProcessing: ${constituency.name}`);
      console.log(`  URL attempts: ${urlCandidates.length}`);

      const { candidates, matchedUrl } = await parseConstituencyFromCandidates(urlCandidates);
      
      if (candidates.length === 0) {
        console.warn(`  No candidates found for ${constituency.name}`);
        continue;
      }

      if (matchedUrl) {
        console.log(`  Matched URL: ${matchedUrl}`);
      }
      
      console.log(`  Found ${candidates.length} candidates`);
      
      // Process each candidate
      for (const candData of candidates) {
        try {
          // Find or create party
          let party = await Party.findOne({ name: candData.party });
          if (!party) {
            party = await Party.create({
              name: candData.party,
              seatsWon: 0,
              seatsLeading: 0,
              totalVotes: 0,
              votePercentage: 0,
              lastUpdated: new Date(),
              sources: [{
                name: 'ekantipur',
                url: EKANTIPUR_BASE,
                timestamp: new Date()
              }]
            });
            console.log(`    Created new party: ${candData.party}`);
          }
          
          // Find or create candidate
          let candidate = await Candidate.findOne({
            name: candData.name,
            constituency: constituency._id
          });
          
          if (!candidate) {
            candidate = await Candidate.create({
              name: candData.name,
              party: party._id,
              constituency: constituency._id,
              votesReceived: candData.votes,
              rank: candData.rank,
              status: candData.rank === 1 ? 'leading' : 'counting',
              lastUpdated: new Date(),
              sources: [{
                name: 'ekantipur',
                url: matchedUrl || urlCandidates[0],
                timestamp: new Date(),
                votesReceived: candData.votes,
                status: candData.rank === 1 ? 'leading' : 'counting'
              }]
            });
          } else {
            // Update existing candidate
            candidate.party = party._id;
            candidate.votesReceived = candData.votes;
            candidate.rank = candData.rank;
            candidate.status = candData.rank === 1 ? 'leading' : 'counting';
            candidate.lastUpdated = new Date();
            
            const sourceIdx = candidate.sources.findIndex(s => s.name === 'ekantipur');
            if (sourceIdx >= 0) {
              candidate.sources[sourceIdx] = {
                name: 'ekantipur',
                url: matchedUrl || urlCandidates[0],
                timestamp: new Date(),
                votesReceived: candData.votes,
                status: candData.rank === 1 ? 'leading' : 'counting'
              };
            } else {
              candidate.sources.push({
                name: 'ekantipur',
                url: matchedUrl || urlCandidates[0],
                timestamp: new Date(),
                votesReceived: candData.votes,
                status: candData.rank === 1 ? 'leading' : 'counting'
              });
            }
            
            await candidate.save();
          }
          
          candidatesProcessed++;
        } catch (err) {
          const errMsg = `Error processing candidate ${candData.name}: ${(err as Error).message}`;
          console.error(`    ${errMsg}`);
          errors.push(errMsg);
        }
      }
      
      // Update constituency with leading candidate
      if (candidates.length > 0) {
        const leadingCand = candidates[0];
        const leadingCandidateDoc = await Candidate.findOne({
          name: leadingCand.name,
          constituency: constituency._id
        });
        
        if (leadingCandidateDoc) {
          constituency.leadingCandidate = leadingCandidateDoc._id as any;
          constituency.countingStatus = 'in-progress';
          constituency.lastUpdated = new Date();
          await constituency.save();
        }
      }
      
      constituenciesProcessed++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      const errMsg = `Error processing constituency ${constituency.name}: ${(err as Error).message}`;
      console.error(errMsg);
      errors.push(errMsg);
    }
  }
  
  // Log update
  await ElectionUpdate.create({
    source: 'ekantipur',
    sourceUrl: EKANTIPUR_BASE,
    updateType: 'candidate-scrape',
    title: 'Ekantipur Candidate Data Scrape',
    description: `Scraped ${candidatesProcessed} candidates from ${constituenciesProcessed} constituencies`,
    timestamp: new Date(),
    isVerified: false,
    data: {
      candidatesProcessed,
      constituenciesProcessed,
      errorCount: errors.length
    }
  });
  
  console.log(`\n✅ Scraping complete:`);
  console.log(`   Constituencies: ${constituenciesProcessed}/${constituencies.length}`);
  console.log(`   Candidates: ${candidatesProcessed}`);
  console.log(`   Errors: ${errors.length}`);
  
  return {
    success: errors.length < constituencies.length,
    candidatesProcessed,
    constituenciesProcessed,
    errors
  };
};
