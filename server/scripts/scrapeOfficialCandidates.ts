import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { scrapeCompleteOfficialData, importCompleteOfficialData } from '../services/scrapers/completeOfficialScraper';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-election';

async function main() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('📥 Fetching complete data from official source...');
    const data = await scrapeCompleteOfficialData();

    console.log('\n📊 Data Summary:');
    console.log(`   Constituencies: ${data.constituencies.length}`);
    console.log(`   Candidates: ${data.candidates.length}`);
    console.log(`   Parties: ${data.parties.length}`);

    console.log('\n💾 Importing data to database...');
    const result = await importCompleteOfficialData(
      data.constituencies,
      data.candidates,
      data.parties
    );

    console.log('\n✅ IMPORT COMPLETE');
    console.log(`   Constituencies: ${result.constructedConstituencies}`);
    console.log(`   Candidates: ${result.importedCandidates}`);
    console.log(`   Parties: ${result.importedParties}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
