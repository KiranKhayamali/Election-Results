import axios from 'axios';
import Party from '../../models/Party';
import Candidate from '../../models/Candidate';
import Constituency from '../../models/Constituency';
import ElectionUpdate from '../../models/ElectionUpdate';

interface HORConstituencyData {
  ConstituencyId: number;
  ConstituencyName: string;
  ConstituencyNameNepali: string;
  ProvinceId: number;
  ProvinceName: string;
  ProvinceNameNepali: string;
  DistrictId: number;
  DistrictName: string;
  CandidateCount: number;
  WonCandidatePartyId: number;
  WonCandidatePartyName: string;
  LeadingCandidatePartyId: number;
  LeadingCandidatePartyName: string;
  ResultStatus: string;
}

interface HORCandidateData {
  CandidateId: number;
  CandidateName: string;
  CandidateNameNepali: string;
  ConstituencyId: number;
  ConstituencyName: string;
  PartyId: number;
  PoliticalPartyName: string;
  PoliticalPartyNameNepali: string;
  Votes: number;
  VotesNepali: string;
  Rank: number;
  IsWon: boolean;
  IsLeading: boolean;
}

interface HORPartyData {
  PartyId: number;
  PoliticalPartyName: string;
  PoliticalPartyNameNepali: string;
  TotWin: number;
  TotLead: number;
  TotWinLead: number;
}

const PROVINCE_MAP: Record<number, { name: string; provinceNumber: number }> = {
  1: { name: 'Koshi', provinceNumber: 1 },
  2: { name: 'Madhesh', provinceNumber: 2 },
  3: { name: 'Bagmati', provinceNumber: 3 },
  4: { name: 'Gandaki', provinceNumber: 4 },
  5: { name: 'Lumbini', provinceNumber: 5 },
  6: { name: 'Karnali', provinceNumber: 6 },
  7: { name: 'Sudurpashchim', provinceNumber: 7 }
};

const PARTY_NAME_MAP: Record<string, string> = {
  'राष्ट्रिय स्वतन्त्र पार्टी': 'Rastriya Swatantra Party',
  'नेपाली काँग्रेस': 'Nepali Congress',
  'नेपाली कांग्रेस': 'Nepali Congress',
  'नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)': 'CPN-UML',
  'नेपाली कम्युनिष्ट पार्टी': 'Nepali Communist Party',
  'राष्ट्रिय प्रजातन्त्र पार्टी': 'Rastriya Prajatantra Party',
  'प्रगतिशील लोकतान्त्रिक पार्टी': 'Pragatishil Loktantrik Party',
  'श्रम संस्कृति पार्टी': 'Shram Sanskriti Party',
  'स्वतन्त्र': 'Independent',
  'नेपाल मजदूर किसान पार्टी': 'Nepal Majdoor Kisan Party',
  'लोकतान्त्रिक समाजवादी पार्टी': 'Democratic Socialist Party'
};

const PARTY_ID_MAP: Record<number, string> = {
  158: 'Rastriya Swatantra Party',
  2: 'Nepali Congress',
  1: 'CPN-UML',
  166: 'Nepali Communist Party',
  3: 'Rastriya Prajatantra Party',
  4: 'Pragatishil Loktantrik Party',
  179: 'Shram Sanskriti Party',
  9999: 'Independent'
};

const normalizeDigits = (value: string): string => {
  const devanagariDigits = '०१२३४५६७८९';
  return value.replace(/[०-९]/g, (d) => String(devanagariDigits.indexOf(d)));
};

const parseLocalizedInt = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const normalized = normalizeDigits(String(value)).replace(/,/g, '').trim();
  const parsed = parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizePartyName = (name: string): string => {
  const trimmed = name.trim();
  return PARTY_NAME_MAP[trimmed] || trimmed;
};

const getSessionCookies = async (): Promise<{ csrf: string; cookies: string }> => {
  try {
    const resp = await axios.get('https://result.election.gov.np/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 12000
    });

    const setCookies = (resp.headers['set-cookie'] || []) as string[];
    const csrfMatch = setCookies
      .join('; ')
      .match(/CsrfToken=([^;]+)/);
    const csrf = csrfMatch ? csrfMatch[1] : '';
    const cookies = setCookies
      .map((c) => c.split(';')[0])
      .filter(Boolean)
      .join('; ');

    return { csrf, cookies };
  } catch (error) {
    console.error('Error getting session:', error);
    return { csrf: '', cookies: '' };
  }
};

const fetchJsonFromSecureHandler = async (
  file: string,
  csrf: string,
  cookies: string
): Promise<any> => {
  try {
    const url = `https://result.election.gov.np/Handlers/SecureJson.ashx?file=${encodeURIComponent(file)}`;
    
    const resp = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-CSRF-Token': csrf,
        'X-Requested-With': 'XMLHttpRequest',
        Referer: 'https://result.election.gov.np/',
        Cookie: cookies
      },
      timeout: 12000
    });

    return Array.isArray(resp.data) ? resp.data : [];
  } catch (error) {
    console.error(`Error fetching ${file}:`, error);
    return [];
  }
};

export const scrapeCompleteOfficialData = async (): Promise<{
  constituencies: HORConstituencyData[];
  candidates: HORCandidateData[];
  parties: HORPartyData[];
}> => {
  console.log('🔍 Fetching complete election data from official source...');

  const { csrf, cookies } = await getSessionCookies();

  if (!csrf || !cookies) {
    throw new Error('Failed to establish session with official site');
  }

  console.log('📥 Fetching constituencies data...');
  const constituencies = await fetchJsonFromSecureHandler(
    'JSONFiles/Election2082/ElectionResult/HORConstituency2082.txt',
    csrf,
    cookies
  );

  console.log(`✅ Fetched ${constituencies.length} constituencies`);

  console.log('📥 Fetching candidates data...');
  const candidates = await fetchJsonFromSecureHandler(
    'JSONFiles/Election2082/ElectionResult/HORCandidates2082.txt',
    csrf,
    cookies
  );

  console.log(`✅ Fetched ${candidates.length} candidates`);

  console.log('📥 Fetching parties data...');
  const parties = await fetchJsonFromSecureHandler(
    'JSONFiles/Election2082/Common/HORPartyTop5.txt',
    csrf,
    cookies
  );

  console.log(`✅ Fetched ${parties.length} parties`);

  return { constituencies, candidates, parties };
};

export const importCompleteOfficialData = async (
  constituencies: HORConstituencyData[],
  candidates: HORCandidateData[],
  parties: HORPartyData[]
): Promise<{
  constructedConstituencies: number;
  importedCandidates: number;
  importedParties: number;
}> => {
  console.log('🗑️ Clearing existing data...');
  await Constituency.deleteMany({});
  await Candidate.deleteMany({});
  await Party.deleteMany({});

  console.log('📝 Importing constituencies...');
  let constructedConstituencies = 0;

  const constituencyMap = new Map<number, any>();

  for (const constData of constituencies) {
    try {
      const province = PROVINCE_MAP[constData.ProvinceId];
      if (!province) {
        console.warn(`Unknown province ID: ${constData.ProvinceId}`);
        continue;
      }

      const constName = `${constData.ConstituencyName}-${constData.ConstituencyId % 10 || constData.DistrictName}`;

      const constituency = await Constituency.create({
        name: constName,
        constituencyNumber: constData.ConstituencyId,
        province: province.name,
        provinceNumber: province.provinceNumber,
        district: constData.DistrictName,
        totalVoters: 0,
        votersParticipated: 0,
        source: 'official'
      });

      constituencyMap.set(constData.ConstituencyId, constituency);
      constructedConstituencies++;
    } catch (error) {
      console.error(`Error importing constituency ${constData.ConstituencyName}:`, error);
    }
  }

  console.log(`✅ Imported ${constructedConstituencies} constituencies`);

  // Import parties
  console.log('📝 Importing parties...');
  const partyMap = new Map<number, any>();
  let importedParties = 0;

  for (const partyData of parties) {
    try {
      const partyName = PARTY_ID_MAP[partyData.PartyId] || normalizePartyName(partyData.PoliticalPartyName);

      const party = await Party.create({
        name: partyName,
        partyId: partyData.PartyId,
        seatsWon: parseLocalizedInt(partyData.TotWin),
        seatsLeading: parseLocalizedInt(partyData.TotLead),
        totalVotes: 0,
        source: 'official',
        lastUpdated: new Date()
      });

      partyMap.set(partyData.PartyId, party);
      importedParties++;
    } catch (error) {
      console.error(`Error importing party ${partyData.PoliticalPartyName}:`, error);
    }
  }

  console.log(`✅ Imported ${importedParties} parties`);

  // Import candidates
  console.log('📝 Importing candidates...');
  let importedCandidates = 0;

  for (const candData of candidates) {
    try {
      const constituency = constituencyMap.get(candData.ConstituencyId);
      if (!constituency) {
        continue;
      }

      const partyName = PARTY_ID_MAP[candData.PartyId] || normalizePartyName(candData.PoliticalPartyName);

      let party = partyMap.get(candData.PartyId);
      if (!party) {
        party = await Party.findOne({ name: partyName });
      }

      if (!party) {
        party = await Party.create({
          name: partyName,
          partyId: candData.PartyId,
          seatsWon: 0,
          seatsLeading: 0,
          totalVotes: 0,
          source: 'official',
          lastUpdated: new Date()
        });
        partyMap.set(candData.PartyId, party);
      }

      const candidate = await Candidate.create({
        name: candData.CandidateName,
        party: party._id,
        constituency: constituency._id,
        votesReceived: parseLocalizedInt(candData.Votes),
        rank: candData.Rank,
        isWon: candData.IsWon,
        isLeading: candData.IsLeading,
        source: 'official'
      });

      if (candidate) {
        importedCandidates++;
      }

      if (importedCandidates % 100 === 0) {
        console.log(`  📊 Progress: ${importedCandidates} candidates imported...`);
      }
    } catch (error) {
      console.error(`Error importing candidate ${candData.CandidateName}:`, error);
    }
  }

  console.log(`✅ Imported ${importedCandidates} candidates`);

  // Update party vote totals
  console.log('📊 Calculating party vote totals...');
  for (const party of partyMap.values()) {
    const candidatesForParty = await Candidate.find({ party: party._id });
    const totalVotes = candidatesForParty.reduce((sum, c) => sum + c.votesReceived, 0);

    party.totalVotes = totalVotes;
    await party.save();
  }

  return {
    constructedConstituencies,
    importedCandidates,
    importedParties
  };
};

export const logCompleteImport = async (stats: any): Promise<void> => {
  try {
    await ElectionUpdate.create({
      source: 'official',
      sourceUrl: 'https://result.election.gov.np/MapElectionResult2082.aspx',
      updateType: 'complete-import',
      title: 'Complete Official Election Data Import',
      description: 'Comprehensive import of all election data from official source',
      data: {
        ...stats,
        importedAt: new Date(),
        totalRecords: stats.importedCandidates + stats.constructedConstituencies + stats.importedParties
      },
      timestamp: new Date(),
      isVerified: true,
      verifiedBy: 'official'
    });
  } catch (error) {
    console.error('Error logging complete import:', error);
  }
};

export const runCompleteOfficialImport = async (): Promise<void> => {
  try {
    console.log('🚀 Starting complete official election data import...\n');

    const { constituencies, candidates, parties } = await scrapeCompleteOfficialData();

    if (!constituencies.length || !candidates.length || !parties.length) {
      throw new Error('Failed to fetch complete data from official source');
    }

    const importStats = await importCompleteOfficialData(constituencies, candidates, parties);

    await logCompleteImport(importStats);

    console.log('\n✨ Complete import finished!');
    console.log(`
📊 Import Summary:
  ✅ Constituencies: ${importStats.constructedConstituencies}
  ✅ Candidates: ${importStats.importedCandidates}
  ✅ Parties: ${importStats.importedParties}
    `);
  } catch (error) {
    console.error('❌ Error during complete import:', error);
    throw error;
  }
};
