import mongoose from 'mongoose';
import Party from '../models/Party';
import Candidate from '../models/Candidate';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-election';

// This script synchronizes party vote totals with actual candidate votes
async function syncPartyVotes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all parties
    const parties = await Party.find();
    console.log(`📊 Found ${parties.length} parties`);

    let updated = 0;
    let zeroed = 0;

    for (const party of parties) {
      // Find all candidates for this party
      const candidates = await Candidate.find({ party: party._id });
      
      if (candidates.length > 0) {
        // Calculate total votes from candidates
        const totalVotes = candidates.reduce((sum, c) => sum + c.votesReceived, 0);
        const oldVotes = party.totalVotes;
        
        party.totalVotes = totalVotes;
        await party.save();
        
        console.log(`  ✅ ${party.name}: ${candidates.length} candidates, ${oldVotes.toLocaleString()} → ${totalVotes.toLocaleString()} votes`);
        updated++;
      } else {
        // No candidates - zero out the votes
        if (party.totalVotes > 0) {
          console.log(`  ⚠️  ${party.name}: No candidates, zeroing ${party.totalVotes.toLocaleString()} votes`);
          party.totalVotes = 0;
          party.votePercentage = 0;
          await party.save();
          zeroed++;
        }
      }
    }

    console.log(`\n✅ Summary:`);
    console.log(`   Parties updated: ${updated}`);
    console.log(`   Parties zeroed (no candidates): ${zeroed}`);
    
    // Calculate new total
    const allParties = await Party.find();
    const totalVotes = allParties.reduce((sum, p) => sum + p.totalVotes, 0);
    const allCandidates = await Candidate.find();
    const candidateVotes = allCandidates.reduce((sum, c) => sum + c.votesReceived, 0);
    
    console.log(`\n📊 FINAL TOTALS:`);
    console.log(`   Total party votes: ${totalVotes.toLocaleString()}`);
    console.log(`   Total candidate votes: ${candidateVotes.toLocaleString()}`);
    console.log(`   Match: ${totalVotes === candidateVotes ? '✅ Perfect' : '⚠️  ' + Math.abs(totalVotes - candidateVotes).toLocaleString() + ' difference'}`);

    // Recalculate vote percentages
    for (const party of allParties) {
      if (totalVotes > 0) {
        party.votePercentage = Number(((party.totalVotes / totalVotes) * 100).toFixed(4));
        await party.save();
      }
    }

    console.log(`✅ Updated vote percentages for all parties`);    

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

syncPartyVotes();
