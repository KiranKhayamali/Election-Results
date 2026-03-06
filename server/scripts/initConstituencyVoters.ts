import mongoose from 'mongoose';
import Constituency from '../models/Constituency';
import Candidate from '../models/Candidate';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-election';

// Realistic voter ranges for different provinces based on population density
const PROVINCE_VOTER_RANGES: { [key: number]: { min: number; max: number } } = {
  1: { min: 45000, max: 85000 },  // Koshi - moderate population
  2: { min: 48000, max: 95000 },  // Madhesh - high population density
  3: { min: 55000, max: 120000 }, // Bagmati - highest (includes Kathmandu)
  4: { min: 38000, max: 72000 },  // Gandaki - moderate
  5: { min: 42000, max: 88000 },  // Lumbini - moderate-high
  6: { min: 28000, max: 55000 },  // Karnali - lower population (hilly)
  7: { min: 35000, max: 68000 }   // Sudurpashchim - moderate
};

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function initConstituencyVoters() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const constituencies = await Constituency.find().sort({ provinceNumber: 1, constituencyNumber: 1 });
    console.log(`📊 Found ${constituencies.length} constituencies`);

    let updatedCount = 0;

    for (const constituency of constituencies) {
      const provinceNum = constituency.provinceNumber;
      const voterRange = PROVINCE_VOTER_RANGES[provinceNum] || { min: 40000, max: 80000 };
      
      // Generate total voters
      const totalVoters = randomBetween(voterRange.min, voterRange.max);
      
      // Get total votes cast from candidates (sum of all votes in this constituency)
      const candidates = await Candidate.find({ constituency: constituency._id });
      const totalVotesCast = candidates.reduce((sum, c) => sum + c.votesReceived, 0);
      
      // Calculate turnout percentage (typically 60-80% in Nepal)
      // If we have candidate votes, use that; otherwise generate realistic turnout
      let votesCast = totalVotesCast;
      if (totalVotesCast === 0) {
        // Generate realistic turnout between 60-78%
        const turnoutPercent = randomBetween(60, 78);
        votesCast = Math.floor(totalVoters * (turnoutPercent / 100));
      }
      
      const turnoutPercentage = Number(((votesCast / totalVoters) * 100).toFixed(2));
      
      // Update constituency
      constituency.totalVoters = totalVoters;
      constituency.totalVotesCast = votesCast;
      constituency.turnoutPercentage = turnoutPercentage;
      await constituency.save();
      
      updatedCount++;
      
      if (updatedCount % 20 === 0) {
        console.log(`  ⏳ Updated ${updatedCount}/${constituencies.length} constituencies...`);
      }
    }

    console.log('\n✅ Successfully updated all constituencies with voter data');
    console.log(`\n📊 Summary:`);
    console.log(`   Total constituencies: ${constituencies.length}`);
    console.log(`   Updated: ${updatedCount}`);
    
    // Display sample data
    const samples = await Constituency.find()
      .sort({ provinceNumber: 1, constituencyNumber: 1 })
      .limit(5);
    
    console.log(`\n📋 Sample Data (first 5 constituencies):`);
    samples.forEach(c => {
      console.log(`   ${c.name} (Province ${c.provinceNumber}):`);
      console.log(`     Total Voters: ${c.totalVoters.toLocaleString()}`);
      console.log(`     Votes Cast: ${c.totalVotesCast.toLocaleString()}`);
      console.log(`     Turnout: ${c.turnoutPercentage}%`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

initConstituencyVoters();
