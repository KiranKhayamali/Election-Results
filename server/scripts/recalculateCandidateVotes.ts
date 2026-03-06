import mongoose from 'mongoose';
import Party from '../models/Party';
import Candidate from '../models/Candidate';
import Constituency from '../models/Constituency';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-election';

// This script recalculates candidate votes to match party vote totals
// ensuring data consistency across the system

async function recalculateCandidateVotes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all parties with their vote totals
    const parties = await Party.find();
    console.log(`📊 Found ${parties.length} parties`);

    // Calculate total votes from parties
    const totalPartyVotes = parties.reduce((sum, p) => sum + p.totalVotes, 0);
    console.log(`📊 Total party votes: ${totalPartyVotes.toLocaleString()}`);

    // Get all candidates
    const candidates = await Candidate.find().populate('party').populate('constituency');
    console.log(`📊 Found ${candidates.length} candidates`);

    if (candidates.length === 0) {
      console.log('❌ No candidates found. Run init:candidates first.');
      process.exit(1);
    }

    // Group candidates by party
    const candidatesByParty: { [key: string]: any[] } = {};
    const candidatesWithoutParty: any[] = [];

    for (const candidate of candidates) {
      if (candidate.party && typeof candidate.party === 'object' && 'name' in candidate.party) {
        const partyName = String(candidate.party.name);
        if (!candidatesByParty[partyName]) {
          candidatesByParty[partyName] = [];
        }
        candidatesByParty[partyName].push(candidate);
      } else {
        candidatesWithoutParty.push(candidate);
      }
    }

    console.log(`\n📊 Candidates by party:`);
    Object.keys(candidatesByParty).forEach(partyName => {
      console.log(`  ${partyName}: ${candidatesByParty[partyName].length} candidates`);
    });

    if (candidatesWithoutParty.length > 0) {
      console.log(`  Independent/Unknown: ${candidatesWithoutParty.length} candidates`);
    }

    // Redistribute votes to candidates based on party totals
    let updatedCount = 0;
    let totalAssignedVotes = 0;

    for (const party of parties) {
      const partyName = party.name;
      const partyVotes = party.totalVotes;
      const partyCandidates = candidatesByParty[partyName] || [];

      if (partyCandidates.length === 0) {
        console.log(`⚠️  ${partyName}: No candidates found, skipping`);
        continue;
      }

      // Distribute party votes among its candidates
      // Use a realistic distribution: 
      // - Top candidates in each constituency get more votes
      // - Random variation for realism

      // Group by constituency
      const byConstituency: { [key: string]: any[] } = {};
      partyCandidates.forEach(c => {
        const constId = typeof c.constituency === 'object' ? c.constituency._id.toString() : c.constituency.toString();
        if (!byConstituency[constId]) {
          byConstituency[constId] = [];
        }
        byConstituency[constId].push(c);
      });

      const constituencies = Object.keys(byConstituency);
      const votesPerConstituency = Math.floor(partyVotes / constituencies.length);

      for (const constId of constituencies) {
        const constCandidates = byConstituency[constId];
        let remainingVotes = votesPerConstituency;

        // Sort by current status (leading gets most votes)
        constCandidates.sort((a, b) => {
          if (a.status === 'leading' && b.status !== 'leading') return -1;
          if (a.status !== 'leading' && b.status === 'leading') return 1;
          return 0;
        });

        for (let i = 0; i < constCandidates.length; i++) {
          const candidate = constCandidates[i];
          let candidateVotes: number;

          if (i === 0 && candidate.status === 'leading') {
            // Leading candidate gets 40-60% of constituency votes for this party
            const percentage = 0.4 + (Math.random() * 0.2);
            candidateVotes = Math.floor(remainingVotes * percentage);
          } else if (i === constCandidates.length - 1) {
            // Last candidate gets all remaining votes
            candidateVotes = remainingVotes;
          } else {
            // Other candidates get 10-30% each
            const percentage = 0.1 + (Math.random() * 0.2);
            candidateVotes = Math.floor(remainingVotes * percentage);
          }

          candidate.votesReceived = candidateVotes;
          await candidate.save();
          
          totalAssignedVotes += candidateVotes;
          remainingVotes -= candidateVotes;
          updatedCount++;
        }
      }

      console.log(`  ✅ ${partyName}: Distributed ${partyVotes.toLocaleString()} votes to ${partyCandidates.length} candidates`);
    }

    // Handle independent candidates - give them small vote counts
    for (const candidate of candidatesWithoutParty) {
      const randomVotes = Math.floor(Math.random() * 5000) + 500;
      candidate.votesReceived = randomVotes;
      await candidate.save();
      totalAssignedVotes += randomVotes;
      updatedCount++;
    }

    console.log(`\n✅ Successfully updated ${updatedCount} candidates`);
    console.log(`📊 Total votes assigned: ${totalAssignedVotes.toLocaleString()}`);
    console.log(`📊 Target party votes: ${totalPartyVotes.toLocaleString()}`);
    console.log(`📊 Difference: ${Math.abs(totalPartyVotes - totalAssignedVotes).toLocaleString()}`);

    // Now update constituency vote totals
    console.log(`\n📊 Updating constituency vote totals...`);
    const constituencies = await Constituency.find();
    
    for (const constituency of constituencies) {
      const constCandidates = await Candidate.find({ constituency: constituency._id });
      const totalVotes = constCandidates.reduce((sum, c) => sum + c.votesReceived, 0);
      
      constituency.totalVotesCast = totalVotes;
      
      // Update total voters if needed to ensure turnout doesn't exceed 100%
      if (totalVotes > constituency.totalVoters) {
        // Set total voters to be 110-130% of votes cast (realistic registration vs turnout)
        const registrationFactor = 1.1 + (Math.random() * 0.2); // 110-130%
        constituency.totalVoters = Math.floor(totalVotes * registrationFactor);
      }
      
      if (constituency.totalVoters > 0) {
        constituency.turnoutPercentage = Number(((totalVotes / constituency.totalVoters) * 100).toFixed(2));
      }
      await constituency.save();
    }

    console.log(`✅ Updated ${constituencies.length} constituencies with new vote totals`);

    // Verification
    const allCandidatesCheck = await Candidate.find();
    const totalCheck = allCandidatesCheck.reduce((sum, c) => sum + c.votesReceived, 0);
    console.log(`\n✅ FINAL VERIFICATION:`);
    console.log(`   Total candidate votes: ${totalCheck.toLocaleString()}`);
    console.log(`   Total party votes: ${totalPartyVotes.toLocaleString()}`);
    console.log(`   Match: ${Math.abs(totalCheck - totalPartyVotes) < 100000 ? '✅ Yes' : '❌ No'}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

recalculateCandidateVotes();
