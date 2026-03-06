import { AggregationResult } from '../../types';
import {
  scrapeOfficialElectionData,
  updatePartiesFromOfficialData,
  logElectionUpdate
} from './officialElectionDataScraper';

const OFFICIAL_URL = process.env.PRIMARY_SOURCE_URL || 'https://result.election.gov.np/FPTPWLChartResult2082.aspx';

export const scrapeOfficialSource = async (): Promise<AggregationResult> => {
  try {
    console.log('Scraping official source:', OFFICIAL_URL);

    const stats = await scrapeOfficialElectionData();

    if (!stats) {
      return {
        success: false,
        source: 'official',
        error: 'Failed to fetch official election stats'
      };
    }

    if (!stats.parties || stats.parties.length === 0) {
      return {
        success: false,
        source: 'official',
        error: 'Official source returned no party standings; skipped update to avoid stale overwrite'
      };
    }

    await updatePartiesFromOfficialData(stats);

    await logElectionUpdate(
      'Official Election Results Update',
      `Updated ${stats.parties.length} parties from official source`,
      {
        resultsDeclared: stats.resultsDeclared,
        totalConstituencies: stats.totalConstituencies,
        countingInProgress: stats.countingInProgress,
        totalCandidates: stats.totalCandidates,
        partyCount: stats.parties.length,
        partyStandings: stats.parties
      }
    );

    console.log(`Official source: Updated ${stats.parties.length} parties`);

    return {
      success: true,
      source: 'official',
      partiesUpdated: stats.parties.length
    };
  } catch (error) {
    console.error('Error scraping official source:', error);
    return {
      success: false,
      source: 'official',
      error: (error as Error).message
    };
  }
};
