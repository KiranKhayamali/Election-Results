import axios from 'axios';
import * as cheerio from 'cheerio';

const EKANTIPUR_PROVINCE_URL = 'https://election.ekantipur.com/province-level-results/pradesh-1?lng=eng';

interface ProvincePartyStanding {
  name: string;
  seatsWon: number;
  seatsLeading: number;
}

export interface EkantipurProvinceResult {
  provinceNumber: number;
  provinceName: string;
  totalDistricts: number;
  totalConstituencies: number;
  declaredConstituencies: number;
  countingInProgress: number;
  partyStandings: ProvincePartyStanding[];
}

export interface EkantipurProvinceScrapeSummary {
  sourceUrl: string;
  provinces: EkantipurProvinceResult[];
  timestamp: Date;
}

const PARTY_ID_TO_ENGLISH: Record<number, string> = {
  1: 'CPN-UML',
  2: 'Nepali Congress',
  3: 'Rastriya Prajatantra Party',
  6: 'Nepal Communist Party (Maoist)',
  7: 'Rastriya Swatantra Party',
  9: 'Nepali Communist Party',
  11: 'Shram Sanskriti Party',
  12: 'Janata Samjbadi Party-Nepal',
  13: 'Ujaylo Nepal Party',
  17: 'Rashtriya Mukti Party Nepal',
  22: 'Janamat Party',
  36: 'Nagarik Unmukti Party',
  99: 'Others'
};

const PROVINCE_NAME_TO_NUM: Record<string, number> = {
  'कोशी प्रदेश': 1,
  'मधेस प्रदेश': 2,
  'वाग्मती प्रदेश': 3,
  'गण्डकी प्रदेश': 4,
  'लुम्बिनी प्रदेश': 5,
  'कर्णाली प्रदेश': 6,
  'सुदूरपश्चिम प्रदेश': 7
};

const PROVINCE_NUM_TO_ENGLISH: Record<number, string> = {
  1: 'Koshi',
  2: 'Madhesh',
  3: 'Bagmati',
  4: 'Gandaki',
  5: 'Lumbini',
  6: 'Karnali',
  7: 'Sudurpashchim'
};

const normalizeDigits = (value: string): string => {
  const devanagariDigits = '०१२३४५६७८९';
  return value.replace(/[०-९]/g, (digit) => String(devanagariDigits.indexOf(digit)));
};

const parseLocalizedInt = (value: string): number => {
  const normalized = normalizeDigits(value).replace(/,/g, '').trim();
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseHeader = (headerText: string): {
  provinceNumber: number;
  provinceName: string;
  totalDistricts: number;
  totalConstituencies: number;
} | null => {
  const normalizedHeader = headerText.replace(/\s+/g, ' ').trim();

  const provinceName = Object.keys(PROVINCE_NAME_TO_NUM).find((name) => normalizedHeader.includes(name));
  if (!provinceName) return null;

  const provinceNumber = PROVINCE_NAME_TO_NUM[provinceName];

  const districtMatch = normalizedHeader.match(/जिल्ला\s*([०-९\d]+)/);
  const constituencyMatch = normalizedHeader.match(/क्षेत्र[:\s]*([०-९\d]+)/);

  return {
    provinceNumber,
    provinceName: PROVINCE_NUM_TO_ENGLISH[provinceNumber] || `Province ${provinceNumber}`,
    totalDistricts: districtMatch ? parseLocalizedInt(districtMatch[1]) : 0,
    totalConstituencies: constituencyMatch ? parseLocalizedInt(constituencyMatch[1]) : 0
  };
};

const extractPartyIdFromHref = (href: string): number | null => {
  const match = href.match(/\/party\/(\d+)/);
  if (!match) return null;
  const partyId = Number.parseInt(match[1], 10);
  return Number.isFinite(partyId) ? partyId : null;
};

export const scrapeEkantipurProvinceResults = async (): Promise<EkantipurProvinceScrapeSummary> => {
  const response = await axios.get(EKANTIPUR_PROVINCE_URL, {
    timeout: 30000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  const $ = cheerio.load(response.data);
  const provinces: EkantipurProvinceResult[] = [];

  $('.result-table').each((_tableIndex, tableElement) => {
    const table = $(tableElement);
    const headerText = table.find('.result-header').text();
    const parsedHeader = parseHeader(headerText);

    if (!parsedHeader) {
      return;
    }

    const partyStandings: ProvincePartyStanding[] = [];

    table.find('.result-row').each((_rowIndex, rowElement) => {
      const row = $(rowElement);
      const firstColText = row.find('.first-col p').text().replace(/\s+/g, ' ').trim();
      if (!firstColText || firstColText === 'पार्टी') {
        return;
      }

      const mainHref = row.find('.first-col[href]').attr('href') || '';
      const partyId = extractPartyIdFromHref(mainHref);

      const seatsWonText = row.find('.second-col').eq(0).text();
      const seatsLeadingText = row.find('.second-col').eq(1).text();

      const seatsWon = parseLocalizedInt(seatsWonText);
      const seatsLeading = parseLocalizedInt(seatsLeadingText);

      const englishName = partyId && PARTY_ID_TO_ENGLISH[partyId]
        ? PARTY_ID_TO_ENGLISH[partyId]
        : firstColText;

      partyStandings.push({
        name: englishName,
        seatsWon,
        seatsLeading
      });
    });

    const declaredConstituencies = partyStandings.reduce((sum, party) => sum + party.seatsWon, 0);

    provinces.push({
      provinceNumber: parsedHeader.provinceNumber,
      provinceName: parsedHeader.provinceName,
      totalDistricts: parsedHeader.totalDistricts,
      totalConstituencies: parsedHeader.totalConstituencies,
      declaredConstituencies,
      countingInProgress: Math.max(parsedHeader.totalConstituencies - declaredConstituencies, 0),
      partyStandings: partyStandings.sort((a, b) => (b.seatsWon - a.seatsWon) || (b.seatsLeading - a.seatsLeading))
    });
  });

  provinces.sort((a, b) => a.provinceNumber - b.provinceNumber);

  return {
    sourceUrl: EKANTIPUR_PROVINCE_URL,
    provinces,
    timestamp: new Date()
  };
};
