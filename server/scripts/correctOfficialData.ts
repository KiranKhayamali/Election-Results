import mongoose from 'mongoose';
import Candidate from '../models/Candidate';
import Constituency from '../models/Constituency';
import Party from '../models/Party';

/**
 * Correct official election data based on verified sources
 * Run this script with real data from https://result.election.gov.np/MapElectionResult2082.aspx
 */

// CORRECT CANDIDATE DATA - From official source
const CORRECT_DATA: { [key: string]: { name: string; party: string; votes: number }[] } = {
  'Bhaktapur-1': [
    // Add actual candidates here from official source
    // Format: { name: 'Full Name', party: 'Party Name', votes: 12345 }
    // Example structure visible to user:
  ]
};

async function correctElectionData() {
  try {
    console.log('🔧 Correcting election data...\n');

    if (!mongoose.connection.readyState) {
      await mongoose.connect('mongodb://localhost:27017/nepal-election');
    }

    let updated = 0;

    for (const [constituencyName, correctCandidates] of Object.entries(CORRECT_DATA)) {
      if (correctCandidates.length === 0) {
        console.log(`⏭️  ${constituencyName}: No data provided - skipping`);
        continue;
      }

      console.log(`\n📝 Correcting ${constituencyName}...`);

      // Find constituency
      const constituency = await Constituency.findOne({ name: constituencyName });
      if (!constituency) {
        console.log(`❌ Constituency not found: ${constituencyName}`);
        continue;
      }

      // Clear existing candidates for this constituency
      const existingCandidates = await Candidate.find({ constituency: constituency._id });
      await Candidate.deleteMany({ constituency: constituency._id });
      console.log(`  Cleared ${existingCandidates.length} existing candidates`);

      // Insert correct candidates
      for (const candidateData of correctCandidates) {
        const party = await Party.findOne({ name: candidateData.party });
        if (!party) {
          console.log(`  ⚠️  Party not found: ${candidateData.party}`);
          continue;
        }

        const candidate = await Candidate.create({
          name: candidateData.name,
          constituency: constituency._id,
          party: party._id,
          votesReceived: candidateData.votes,
          status: 'counting'
        });

        console.log(`  ✅ ${candidateData.name} (${candidateData.party}): ${candidateData.votes} votes`);
        updated++;
      }

      // Set leading candidate
      const allCandidates = await Candidate.find({ constituency: constituency._id }).sort({ votesReceived: -1 });
      if (allCandidates.length > 0) {
        allCandidates[0].status = 'leading';
        await allCandidates[0].save();

        constituency.leadingCandidate = allCandidates[0]._id;
        constituency.totalVotesCast = allCandidates.reduce((sum, c) => sum + c.votesReceived, 0);
        await constituency.save();

        console.log(`  🏆 Leading: ${allCandidates[0].name} with ${allCandidates[0].votesReceived} votes`);
      }
    }

    console.log(`\n✅ Updated ${updated} candidates`);

    // Recalculate party totals
    console.log('\n🔄 Recalculating party totals...');
    const parties = await Party.find();

    for (const party of parties) {
      const partyCandidates = await Candidate.find({ party: party._id });
      const totalVotes = partyCandidates.reduce((sum, c) => sum + c.votesReceived, 0);
      const seatsLeading = partyCandidates.filter(c => c.status === 'leading').length;

      party.totalVotes = totalVotes;
      party.seatsLeading = seatsLeading;
      party.seatsWon = Math.max(0, seatsLeading - 1);
      await party.save();
    }

    console.log('✅ Party totals updated');
    console.log('\n✨ Data correction complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

correctElectionData();
