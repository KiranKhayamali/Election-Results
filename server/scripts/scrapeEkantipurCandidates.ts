import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { scrapeEkantipurCandidates } from '../services/scrapers/ekantipurCandidateScraper';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-election';

async function main() {
  try {
    console.log('🔗 Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to database');

    const result = await scrapeEkantipurCandidates();

    if (result.success) {
      console.log('\n✅ SUCCESS');
      console.log(`   Processed ${result.candidatesProcessed} candidates`);
      console.log(`   From ${result.constituenciesProcessed} constituencies`);
    } else {
      console.log('\n⚠️  COMPLETED WITH ERRORS');
      console.log(`   Processed ${result.candidatesProcessed} candidates`);
      console.log(`   From ${result.constituenciesProcessed} constituencies`);
      console.log(`   Errors: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log('\nFirst 10 errors:');
        result.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
