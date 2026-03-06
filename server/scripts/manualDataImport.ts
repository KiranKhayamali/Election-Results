import mongoose from 'mongoose';
import Candidate from '../models/Candidate';
import Constituency from '../models/Constituency';
import Party from '../models/Party';

/**
 * MANUAL DATA IMPORT GUIDE
 * 
 * Instructions:
 * 1. Visit https://result.election.gov.np/MapElectionResult2082.aspx
 * 2. For each constituency, collect the candidate data
 * 3. Update the ELECTION_DATA object below with the structure shown
 * 4. Run: npm run import:manual
 * 
 * Data Format:
 * {
 *   'Constituency Name': [
 *     { name: 'Candidate Full Name', party: 'Party Name', votes: 12345 },
 *     ...all candidates...
 *   ]
 * }
 */

// PASTE YOUR DATA HERE - Replace this with actual data from the official website
const ELECTION_DATA: Record<string, Array<{ name: string; party: string; votes: number }>> = {
  // Data from https://result.election.gov.np/MapElectionResult2082.aspx
  'Bhaktapur-1': [
    { name: 'Rukesh Ranjit', party: 'Rastriya Swatantra Party', votes: 14049 },
    { name: 'Prem Suwal', party: 'Nepal Majdoor Kisan Party', votes: 10206 },
    { name: 'Kiran Neupane', party: 'Nepali Congress', votes: 2202 },
    { name: 'Som Prasad Mishra', party: 'CPN-UML', votes: 1496 },
    { name: 'Bharat Bahadur Khadka', party: 'Rastriya Prajatantra Party', votes: 613 },
    { name: 'Hari Ram Lavju', party: 'Nepali Communist Party', votes: 475 },
    { name: 'Ramesh Ball', party: 'Ujaylo Nepal Party', votes: 246 },
    { name: 'Vishnu Hari Nhisutu', party: 'Janata Samjbadi Party-Nepal', votes: 160 },
    { name: 'Ishwari Prasad Paiyani', party: 'Janamat Party', votes: 120 },
    { name: 'Shyam Sundar Shilpkar', party: 'Janata Samjbadi Party-Nepal', votes: 109 },
    { name: 'Chandra Man Koju', party: 'Nepal Communist Party (Maoist)', votes: 32 },
    { name: 'Rabi Khaiju', party: 'Sanghiya Loktantrik Rastriya Manch', votes: 26 },
    { name: 'Devendra Thakur', party: 'Aam Janata Party (Ekal Chunab Chinha)', votes: 16 },
  ],
};

async function importData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nepal-election');
    console.log('Connected to database');

    if (Object.keys(ELECTION_DATA).length === 0) {
      console.log('❌ No data to import. Please populate ELECTION_DATA first.');
      console.log('\nTo import data:');
      console.log('1. Visit https://result.election.gov.np/MapElectionResult2082.aspx');
      console.log('2. For each constituency, find all candidates with names and vote counts');
      console.log('3. Update ELECTION_DATA in this file with the format shown');
      console.log('4. Run: npm run import:manual');
      await mongoose.disconnect();
      return;
    }

    // Get all parties from database
    const parties = await Party.find({});
    const partyMap = new Map(parties.map((p: any) => [p.name.toLowerCase(), p]));

    let totalImported = 0;
    let totalVotes = 0;

    for (const [constituencyName, candidates] of Object.entries(ELECTION_DATA)) {
      console.log(`\n📍 Processing ${constituencyName}...`);

      // Find or create constituency
      let constituency = await Constituency.findOne({ name: constituencyName });
      if (!constituency) {
        constituency = new Constituency({
          name: constituencyName,
          provinceNumber: 1,
          seats: 1,
        });
        await constituency.save();
        console.log(`  ✓ Created constituency: ${constituencyName}`);
      } else {
        // Clear old candidates for this constituency
        await Candidate.deleteMany({ constituency: constituency._id });
        console.log(`  ✓ Cleared old candidates`);
      }

      // Import candidates
      let constituencyVotes = 0;
      for (const candidateData of candidates) {
        const partyKey = candidateData.party.toLowerCase();
        const party = partyMap.get(partyKey);

        if (!party) {
          console.log(`  ⚠️  Party not found: ${candidateData.party} - Skipping candidate ${candidateData.name}`);
          continue;
        }

        const candidate = new Candidate({
          name: candidateData.name,
          party: party._id,
          constituency: constituency._id,
          votesReceived: candidateData.votes,
          status: 'counting',
        });

        await candidate.save();
        constituencyVotes += candidateData.votes;
        totalVotes += candidateData.votes;
        totalImported++;
      }

      // Mark highest vote getter as leading
      const topCandidate = await Candidate.findOne({ constituency: constituency._id })
        .sort({ votesReceived: -1 });
      
      if (topCandidate) {
        topCandidate.status = 'leading';
        await topCandidate.save();
        
        const topParty = await Party.findById(topCandidate.party);
        console.log(`  ✓ ${candidates.length} candidates imported (Total votes: ${constituencyVotes})`);
        console.log(`    Top: ${topCandidate.name} (${topParty?.name}) - ${topCandidate.votesReceived} votes`);
      }
    }

    // Update party vote totals
    console.log('\n📊 Updating party totals...');
    for (const party of parties) {
      const candidates = await Candidate.find({ party: party._id });
      const totalVotesForParty = candidates.reduce((sum: number, c: any) => sum + c.votesReceived, 0);
      party.totalVotes = totalVotesForParty;
      await party.save();
    }

    console.log('\n✅ Data import complete!');
    console.log(`   Imported: ${totalImported} candidates`);
    console.log(`   Total votes: ${totalVotes.toLocaleString()}`);
    console.log('\nRestart the server to see the updated data.');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
}

importData();
