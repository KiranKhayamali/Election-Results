import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import Constituency from './server/models/Constituency';
import { scrapeOfficialSource } from './server/services/scrapers/officialScraper';
import { scrapeEkantipurSource } from './server/services/scrapers/ekantipurScraper';
import { scrapeOnlineKhabarSource } from './server/services/scrapers/onlinekhabarScraper';
import Party from './server/models/Party';
import Candidate from './server/models/Candidate';

const loadConstituencies = async () => {
  try {
    console.log('\n📍 LOADING CONSTITUENCIES FROM JSON...');
    const dataPath = path.join(__dirname, 'server/data/constituencies.json');
    
    if (!fs.existsSync(dataPath)) {
      console.log('⚠️ constituencies.json not found');
      return 0;
    }

    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const data = rawData.constituencies || rawData;
    let count = 0;

    for (const constituency of data) {
      const existingConstituency = await Constituency.findOne({
        constituencyNumber: constituency.constituencyNumber
      });

      if (!existingConstituency) {
        await Constituency.create(constituency);
        count++;
      }

      if (count % 50 === 0 && count > 0) {
        console.log(`  📊 Progress: ${count} constituencies loaded...`);
      }
    }

    console.log(`✅ Loaded ${count} constituencies from JSON\n`);
    return count;
  } catch (error) {
    console.error('❌ Error loading constituencies:', error);
    return 0;
  }
};

const run = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/nepal-election';
    
    console.log(`\n🔌 Connecting to MongoDB at ${mongoUrl}...`);
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('═'.repeat(70));
    console.log('    FRESH ELECTION DATA IMPORT - COMPLETE RESET');
    console.log('═'.repeat(70));

    // Step 1: Clear database
    console.log('\n🗑️ Dropping entire database...');
    await mongoose.connection.dropDatabase();
    console.log('✅ Database cleared completely\n');

    // Step 2: Load constituencies
    await loadConstituencies();

    // Step 3: Run scraping from official sources
    console.log('═'.repeat(70));
    console.log('    SCRAPING DATA FROM OFFICIAL SOURCES');
    console.log('═'.repeat(70));

    console.log('\n📊 PHASE 1: Official Source');
    console.log('   Source: https://result.election.gov.np/\n');
    const officialResult = await scrapeOfficialSource();
    if (officialResult.success) {
      console.log(`✅ Official: ${officialResult.partiesUpdated} parties updated\n`);
    } else {
      console.log(`⚠️ Official: ${officialResult.error}\n`);
    }

    console.log('📊 PHASE 2: Ekantipur Source');
    console.log('   Source: https://election.ekantipur.com/?lng=eng\n');
    const ekantipurResult = await scrapeEkantipurSource();
    if (ekantipurResult.success) {
      console.log(`✅ Ekantipur: ${ekantipurResult.partiesUpdated || 0} parties updated\n`);
    } else {
      console.log(`⚠️ Ekantipur: ${ekantipurResult.error}\n`);
    }

    console.log('📊 PHASE 3: OnlineKhabar Source');
    console.log('   Source: https://election.onlinekhabar.com/candidate-list\n');
    const onlineKhabarResult = await scrapeOnlineKhabarSource();
    if (onlineKhabarResult.success) {
      console.log(`✅ OnlineKhabar: ${onlineKhabarResult.candidatesUpdated || 0} candidates updated\n`);
    } else {
      console.log(`⚠️ OnlineKhabar: ${onlineKhabarResult.error}\n`);
    }
    
    const candidateCount = await Candidate.countDocuments();
    const partyCount = await Party.countDocuments();
    const constituencyCount = await Constituency.countDocuments();

    console.log('\n' + '═'.repeat(70));
    console.log('    FRESH IMPORT COMPLETE');
    console.log('═'.repeat(70));
    console.log(`\n📊 FINAL DATA STATE:`);
    console.log(`   ✅ Constituencies: ${constituencyCount}`);
    console.log(`   ✅ Parties: ${partyCount}`);
    console.log(`   ✅ Candidates: ${candidateCount}`);
    console.log(`\n🎯 SOURCES USED:`);
    console.log(`   • Static: Constituencies from server/data/constituencies.json`);
    console.log(`   • Official: https://result.election.gov.np/ (Seat standings)`);
    console.log(`   • Ekantipur: https://election.ekantipur.com (Vote totals)`);
    console.log(`   • OnlineKhabar: https://election.onlinekhabar.com (Candidates)`);
    console.log(`\n🚀 NEXT STEPS:`);
    console.log(`   1. Start server: npm run server`);
    console.log(`   2. Start client: npm run client`);
    console.log(`   3. View dashboard: http://localhost:3000\n`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during fresh import:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
