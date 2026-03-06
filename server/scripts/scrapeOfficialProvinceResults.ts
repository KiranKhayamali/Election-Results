import mongoose from 'mongoose';
import ElectionUpdate from '../models/ElectionUpdate';
import { scrapeOfficialProvinceResults } from '../services/scrapers/officialProvinceScraper';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-election';

async function run(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await scrapeOfficialProvinceResults();

    await ElectionUpdate.create({
      source: 'official',
      sourceUrl: 'https://result.election.gov.np/MapElectionResult2082.aspx',
      updateType: 'general',
      title: 'Official Province Results Sync',
      description: 'Province-wise constituency status and party standings from official map endpoint',
      data: result,
      isVerified: true,
      verifiedBy: 'official'
    });

    console.log('\nProvince scrape complete');
    console.log(`Fetched constituency files: ${result.fetchedConstituencyFiles}`);
    console.log(`Skipped constituency files: ${result.skippedConstituencyFiles}`);

    for (const province of result.provinces) {
      const topParty = province.partyStandings[0];
      console.log(`\nProvince ${province.provinceNumber} (${province.provinceName})`);
      console.log(`  Total: ${province.totalConstituencies}`);
      console.log(`  Declared: ${province.declaredConstituencies}`);
      console.log(`  In Progress: ${province.countingInProgress}`);
      if (topParty) {
        console.log(`  Top Party: ${topParty.name} (Won: ${topParty.seatsWon}, Leading: ${topParty.seatsLeading})`);
      }
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Failed to scrape official province results:', error);
    process.exit(1);
  }
}

run();
