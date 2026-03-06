import axios from 'axios';

interface LookupConstituency {
  distId: number;
  consts: number;
}

interface OfficialHorRow {
  State?: number | string;
  PartyID?: number;
  PoliticalPartyName?: string;
  TotalVoteReceived?: number | string;
  Rank?: number | string;
  Remarks?: string | null;
}

interface ProvincePartyStanding {
  name: string;
  seatsWon: number;
  seatsLeading: number;
}

export interface ProvinceScrapeResult {
  provinceNumber: number;
  provinceName: string;
  totalConstituencies: number;
  declaredConstituencies: number;
  countingInProgress: number;
  partyStandings: ProvincePartyStanding[];
}

export interface OfficialProvinceScrapeSummary {
  provinces: ProvinceScrapeResult[];
  fetchedConstituencyFiles: number;
  skippedConstituencyFiles: number;
  timestamp: Date;
}

const OFFICIAL_BASE_URL = 'https://result.election.gov.np';
const SESSION_ROTATE_AFTER_REQUESTS = 30;

const PROVINCE_NAMES: Record<number, string> = {
  1: 'Koshi',
  2: 'Madhesh',
  3: 'Bagmati',
  4: 'Gandaki',
  5: 'Lumbini',
  6: 'Karnali',
  7: 'Sudurpashchim'
};

const PARTY_ID_TO_NAME: Record<number, string> = {
  158: 'Rastriya Swatantra Party',
  2: 'Nepali Congress',
  1: 'CPN-UML',
  166: 'Nepali Communist Party',
  3: 'Rastriya Prajatantra Party',
  4: 'Pragatishil Loktantrik Party',
  179: 'Shram Sanskriti Party',
  9999: 'Independent'
};

// Canonical English naming aligned with Ekantipur English feed.
const EKANTIPUR_CANONICAL_ALIASES: Record<string, string[]> = {
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

const OFFICIAL_NEPALI_TO_ENGLISH: Record<string, string> = {
  'राष्ट्रिय स्वतन्त्र पार्टी': 'Rastriya Swatantra Party',
  'नेपाली काँग्रेस': 'Nepali Congress',
  'नेपाली कांग्रेस': 'Nepali Congress',
  'नेपाल कम्युनिष्ट पार्टी (एकीकृत मार्क्सवादी लेनिनवादी)': 'CPN-UML',
  'नेपाली कम्युनिष्ट पार्टी': 'Nepali Communist Party',
  'राष्ट्रिय प्रजातन्त्र पार्टी': 'Rastriya Prajatantra Party',
  'श्रम संस्कृति पार्टी': 'Shram Sanskriti Party',
  'लोकतान्त्रिक समाजवादी पार्टी': 'Democratic Socialist Party',
  'स्वतन्त्र': 'Independent'
};

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

const normalizePartyName = (partyId: number | undefined, partyName: string | undefined): string => {
  if (partyId && PARTY_ID_TO_NAME[partyId]) {
    return PARTY_ID_TO_NAME[partyId];
  }

  if (partyName && partyName.trim()) {
    const decoded = decodePossiblyMojibake(partyName).trim();

    if (OFFICIAL_NEPALI_TO_ENGLISH[decoded]) {
      return OFFICIAL_NEPALI_TO_ENGLISH[decoded];
    }

    const canonicalFromEkantipur = Object.keys(EKANTIPUR_CANONICAL_ALIASES).find((canonicalName) => {
      if (canonicalName.toLowerCase() === decoded.toLowerCase()) return true;
      return EKANTIPUR_CANONICAL_ALIASES[canonicalName].some(
        (alias) => alias.toLowerCase() === decoded.toLowerCase()
      );
    });

    if (canonicalFromEkantipur) {
      return canonicalFromEkantipur;
    }

    return decoded;
  }

  return 'Unknown Party';
};

const parseNumber = (value: number | string | undefined | null): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const normalized = value.replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildSecureJsonUrl = (filePath: string): string => {
  return `${OFFICIAL_BASE_URL}/Handlers/SecureJson.ashx?file=${encodeURIComponent(filePath)}`;
};

const getSessionHeaders = async (): Promise<{ cookie: string; csrfToken: string }> => {
  const homeResponse = await axios.get(`${OFFICIAL_BASE_URL}/MapElectionResult2082.aspx`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    },
    timeout: 15000
  });

  const setCookieHeaders = (homeResponse.headers['set-cookie'] || []) as string[];
  const cookie = setCookieHeaders.map((entry) => entry.split(';')[0]).filter(Boolean).join('; ');
  const csrfMatch = setCookieHeaders.join('; ').match(/CsrfToken=([^;]+)/i);
  const csrfToken = csrfMatch?.[1] || '';

  if (!cookie || !csrfToken) {
    throw new Error('Official site session cookie/CSRF token unavailable');
  }

  return { cookie, csrfToken };
};

const fetchSecureJson = async <T>(filePath: string, cookie: string, csrfToken: string): Promise<T> => {
  const response = await axios.get<T>(buildSecureJsonUrl(filePath), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'application/json, text/plain, */*',
      'X-CSRF-Token': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${OFFICIAL_BASE_URL}/MapElectionResult2082.aspx`,
      Cookie: cookie
    },
    timeout: 15000
  });

  return response.data;
};

const fetchWithRetry = async <T>(filePath: string, cookie: string, csrfToken: string): Promise<T> => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchSecureJson<T>(filePath, cookie, csrfToken);
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
  }

  throw lastError;
};

interface SessionState {
  cookie: string;
  csrfToken: string;
}

const fetchWithSessionRecovery = async <T>(
  filePath: string,
  session: SessionState,
  refreshSession: () => Promise<SessionState>
): Promise<T> => {
  try {
    return await fetchWithRetry<T>(filePath, session.cookie, session.csrfToken);
  } catch {
    const refreshed = await refreshSession();
    session.cookie = refreshed.cookie;
    session.csrfToken = refreshed.csrfToken;
    return fetchWithRetry<T>(filePath, session.cookie, session.csrfToken);
  }
};

const isDeclaredConstituency = (rows: OfficialHorRow[]): boolean => {
  return rows.some((row) => (row.Remarks || '').toLowerCase().includes('elected'));
};

const getLeadingCandidate = (rows: OfficialHorRow[]): OfficialHorRow | null => {
  if (rows.length === 0) return null;

  const sorted = [...rows].sort((a, b) => parseNumber(b.TotalVoteReceived) - parseNumber(a.TotalVoteReceived));
  return sorted[0] || null;
};

export const scrapeOfficialProvinceResults = async (): Promise<OfficialProvinceScrapeSummary> => {
  console.log('Fetching official province results from MapElectionResult2082.aspx...');

  const refreshSession = async (): Promise<SessionState> => {
    const headers = await getSessionHeaders();
    return { cookie: headers.cookie, csrfToken: headers.csrfToken };
  };

  const session = await refreshSession();
  let requestsSinceSessionRefresh = 0;

  const lookupFile = 'JSONFiles/Election2082/HOR/Lookup/constituencies.json';
  const lookupData = await fetchWithSessionRecovery<LookupConstituency[]>(lookupFile, session, refreshSession);

  const constituencies = Array.isArray(lookupData) ? lookupData : [];
  const provinceAgg = new Map<number, {
    totalConstituencies: number;
    declaredConstituencies: number;
    partySeats: Map<string, { seatsWon: number; seatsLeading: number }>;
  }>();

  let fetchedConstituencyFiles = 0;
  let skippedConstituencyFiles = 0;

  for (const entry of constituencies) {
    const districtId = Number(entry.distId);
    const maxConstituencies = Number(entry.consts);

    if (!Number.isFinite(districtId) || !Number.isFinite(maxConstituencies) || maxConstituencies <= 0) {
      continue;
    }

    for (let constituencyNo = 1; constituencyNo <= maxConstituencies; constituencyNo++) {
      const filePath = `JSONFiles/Election2082/HOR/FPTP/HOR-${districtId}-${constituencyNo}.json`;

      if (requestsSinceSessionRefresh >= SESSION_ROTATE_AFTER_REQUESTS) {
        const refreshed = await refreshSession();
        session.cookie = refreshed.cookie;
        session.csrfToken = refreshed.csrfToken;
        requestsSinceSessionRefresh = 0;
      }

      let rows: OfficialHorRow[];
      try {
        const data = await fetchWithSessionRecovery<OfficialHorRow[]>(filePath, session, refreshSession);
        requestsSinceSessionRefresh++;
        rows = Array.isArray(data) ? data : [];
      } catch {
        skippedConstituencyFiles++;
        continue;
      }

      if (rows.length === 0) {
        skippedConstituencyFiles++;
        continue;
      }

      const provinceNumber = Number(rows[0]?.State);
      if (!Number.isFinite(provinceNumber) || provinceNumber < 1 || provinceNumber > 7) {
        skippedConstituencyFiles++;
        continue;
      }

      fetchedConstituencyFiles++;

      if (!provinceAgg.has(provinceNumber)) {
        provinceAgg.set(provinceNumber, {
          totalConstituencies: 0,
          declaredConstituencies: 0,
          partySeats: new Map<string, { seatsWon: number; seatsLeading: number }>()
        });
      }

      const province = provinceAgg.get(provinceNumber)!;
      province.totalConstituencies++;

      const declared = isDeclaredConstituency(rows);
      if (declared) {
        province.declaredConstituencies++;
      }

      const leader = getLeadingCandidate(rows);
      if (!leader) {
        continue;
      }

      const partyName = normalizePartyName(leader.PartyID, leader.PoliticalPartyName);
      if (!province.partySeats.has(partyName)) {
        province.partySeats.set(partyName, { seatsWon: 0, seatsLeading: 0 });
      }

      const seatStats = province.partySeats.get(partyName)!;
      if (declared) {
        seatStats.seatsWon++;
      } else {
        seatStats.seatsLeading++;
      }
    }
  }

  const provinces: ProvinceScrapeResult[] = [];

  for (let provinceNumber = 1; provinceNumber <= 7; provinceNumber++) {
    const agg = provinceAgg.get(provinceNumber) || {
      totalConstituencies: 0,
      declaredConstituencies: 0,
      partySeats: new Map<string, { seatsWon: number; seatsLeading: number }>()
    };

    const partyStandings = Array.from(agg.partySeats.entries())
      .map(([name, seatData]) => ({
        name,
        seatsWon: seatData.seatsWon,
        seatsLeading: seatData.seatsLeading
      }))
      .sort((a, b) => (b.seatsWon - a.seatsWon) || (b.seatsLeading - a.seatsLeading));

    provinces.push({
      provinceNumber,
      provinceName: PROVINCE_NAMES[provinceNumber] || `Province ${provinceNumber}`,
      totalConstituencies: agg.totalConstituencies,
      declaredConstituencies: agg.declaredConstituencies,
      countingInProgress: Math.max(agg.totalConstituencies - agg.declaredConstituencies, 0),
      partyStandings
    });
  }

  return {
    provinces,
    fetchedConstituencyFiles,
    skippedConstituencyFiles,
    timestamp: new Date()
  };
};
