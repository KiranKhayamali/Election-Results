import mongoose from 'mongoose';
import ElectionUpdate from '../models/ElectionUpdate';
import { scrapeEkantipurProvinceResults } from '../services/scrapers/ekantipurProvinceScraper';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-election';

async function run(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await scrapeEkantipurProvinceResults();

    await ElectionUpdate.create({
      source: 'ekantipur',
      sourceUrl: result.sourceUrl,
      updateType: 'general',
      title: 'Ekantipur Province Results Sync',
      description: 'Province-wise party standings and constituency totals from Ekantipur',
      data: result,
      isVerified: false,
      verifiedBy: 'cross-reference'
    });

    console.log('\nEkantipur province scrape complete');
    for (const province of result.provinces) {
      const top = province.partyStandings[0];
      console.log(`\nProvince ${province.provinceNumber} (${province.provinceName})`);
      console.log(`  Districts: ${province.totalDistricts}`);
      console.log(`  Constituencies: ${province.totalConstituencies}`);
      console.log(`  Declared: ${province.declaredConstituencies}`);
      console.log(`  In Progress: ${province.countingInProgress}`);
      if (top) {
        console.log(`  Top Party: ${top.name} (Won: ${top.seatsWon}, Leading: ${top.seatsLeading})`);
      }
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Failed to scrape Ekantipur province results:', error);
    process.exit(1);
  }
}

run();
