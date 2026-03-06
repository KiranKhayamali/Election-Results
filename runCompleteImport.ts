import mongoose from 'mongoose';
import { scrapeOfficialSource } from './server/services/scrapers/officialScraper';
import { scrapeEkantipurSource } from './server/services/scrapers/ekantipurScraper';
import { scrapeOnlineKhabarSource } from './server/services/scrapers/onlinekhabarScraper';
import Party from './server/models/Party';
import Candidate from './server/models/Candidate';
import Constituency from './server/models/Constituency';
import ElectionUpdate from './server/models/ElectionUpdate';

interface ScrapingStats {
  official: any;
  ekantipur: any;
  onlinekhabar: any;
  summary: {
    partiesImported: number;
    candidatesImported: number;
    constituenciesImported: number;
  };
}

const run = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/nepal-election';
    
    console.log(`\n🔌 Connecting to MongoDB at ${mongoUrl}...`);
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('═'.repeat(70));
    console.log('    COMPLETE ELECTION DATA IMPORT FROM THREE AUTHORIZED SOURCES');
    console.log('═'.repeat(70));

    const stats: ScrapingStats = {
      official: null,
      ekantipur: null,
      onlinekhabar: null,
      summary: {
        partiesImported: 0,
        candidatesImported: 0,
        constituenciesImported: 0
      }
    };

    // Phase 1: Official Source (Seat standings)
    console.log('\n📊 PHASE 1: Fetching Official Election Results');
    console.log('   Source: https://result.election.gov.np/');
    console.log('   Data: Seat standings (won/leading)\n');
    
    let officialResult;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      try {
        officialResult = await scrapeOfficialSource();
        stats.official = officialResult;
        
        if (officialResult.success) {
          console.log(`✅ Official: ${officialResult.partiesUpdated} parties updated\n`);
          break;
        } else {
          console.log(`⚠️ Official: ${officialResult.error}`);
          if (retries < maxRetries - 1) {
            console.log(`   Retrying in 5 seconds...\n`);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
          retries++;
        }
      } catch (error) {
        console.log(`⚠️ Official: ${(error as Error).message}`);
        if (retries < maxRetries - 1) {
          console.log(`   Retrying in 5 seconds...\n`);
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        retries++;
      }
    }
    
    if (!officialResult || !officialResult.success) {
      console.log('⚠️ Official source unavailable, continuing with other sources...\n');
      stats.official = { success: false, error: 'Unavailable after retries' };
    }

    // Phase 2: Ekantipur Source (Vote totals)
    console.log('📊 PHASE 2: Fetching Ekantipur Election Data');
    console.log('   Source: https://election.ekantipur.com/?lng=eng');
    console.log('   Data: Party vote totals\n');
    
    let ekantipurResult;
    try {
      ekantipurResult = await scrapeEkantipurSource();
      stats.ekantipur = ekantipurResult;
      
      if (ekantipurResult.success) {
        console.log(`✅ Ekantipur: ${ekantipurResult.partiesUpdated || 0} parties updated\n`);
      } else {
        console.log(`⚠️ Ekantipur: ${ekantipurResult.error}\n`);
      }
    } catch (error) {
      ekantipurResult = { success: false, error: (error as Error).message };
      console.log(`⚠️ Ekantipur: ${(error as Error).message}\n`);
    }

    // Phase 3: OnlineKhabar Source (Candidates)
    console.log('📊 PHASE 3: Fetching OnlineKhabar Candidate Data');
    console.log('   Source: https://election.onlinekhabar.com/candidate-list');
    console.log('   Data: Candidate names, votes, parties\n');
    
    let onlineKhabarResult;
    try {
      onlineKhabarResult = await scrapeOnlineKhabarSource();
      stats.onlinekhabar = onlineKhabarResult;
      
      if (onlineKhabarResult.success) {
        console.log(`✅ OnlineKhabar: ${onlineKhabarResult.candidatesUpdated || 0} candidates updated\n`);
      } else {
        console.log(`⚠️ OnlineKhabar: ${onlineKhabarResult.error}\n`);
      }
    } catch (error) {
      onlineKhabarResult = { success: false, error: (error as Error).message };
      console.log(`⚠️ OnlineKhabar: ${(error as Error).message}\n`);
    }

    // Summary
    const partyCount = await Party.countDocuments();
    const candidateCount = await Candidate.countDocuments();
    const constituencyCount = await Constituency.countDocuments();

    stats.summary = {
      partiesImported: partyCount,
      candidatesImported: candidateCount,
      constituenciesImported: constituencyCount
    };

    // Log the complete import
    try {
      await ElectionUpdate.create({
        source: 'other',
        sourceUrl: 'https://result.election.gov.np/',
        updateType: 'general',
        title: 'Complete Election Data Import from Three Sources',
        description: 'Comprehensive import combining official, Ekantipur, and OnlineKhabar data',
        data: stats,
        timestamp: new Date(),
        isVerified: true,
        verifiedBy: 'other'
      });
    } catch (err) {
      console.log('Note: Could not log to ElectionUpdate (non-critical)');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('    IMPORT COMPLETE');
    console.log('═'.repeat(70));
    console.log(`\n📊 FINAL STATISTICS:`);
    console.log(`   ✅ Parties in database: ${partyCount}`);
    console.log(`   ✅ Candidates in database: ${candidateCount}`);
    console.log(`   ✅ Constituencies in database: ${constituencyCount}`);
    console.log(`\n🎯 SOURCE BREAKDOWN:`);
    console.log(`   • Official: Seat counts (won/leading)`);
    console.log(`   • Ekantipur: Party vote totals`);
    console.log(`   • OnlineKhabar: Candidate details and votes`);
    console.log(`\n🚀 Next Steps:`);
    console.log(`   1. Run the server: npm run server`);
    console.log(`   2. Start the client: npm run client`);
    console.log(`   3. Visit http://localhost:3000 to see the dashboard\n`);
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during import:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

run();
