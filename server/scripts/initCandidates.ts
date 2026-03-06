import mongoose from 'mongoose';
import Candidate from '../models/Candidate';
import Constituency from '../models/Constituency';
import Party from '../models/Party';

// Major parties for candidate assignment
const MAJOR_PARTIES = [
  'CPN-UML',
  'Nepali Congress',
  'CPN (Maoist Center)',
  'Rastriya Swatantra Party',
  'Rastriya Prajatantra Party'
];

const MINOR_PARTIES = [
  'Janata Samjbadi Party-Nepal',
  'Pragatishil Loktantrik Party',
  'Shram Sanskriti Party',
  'Ujaylo Nepal Party'
];

// All parties combined for assignment

// Sample first names
const FIRST_NAMES = [
  'Rajesh', 'Priya', 'Kumar', 'Anita', 'Vikram',
  'Sunita', 'Arun', 'Neha', 'Deepak', 'Pooja',
  'Sandeep', 'Preeti', 'Arjun', 'Kavya', 'Sanjay',
  'Nidhi', 'Akshay', 'Divya', 'Rohan', 'Anjali',
  'Nitin', 'Swati', 'Gaurav', 'Shreya', 'Harsh',
  'Simran', 'Varun', 'Diya', 'Kamal', 'Geeta'
];

// Sample last names
const LAST_NAMES = [
  'Kumar', 'Singh', 'Patel', 'Sharma', 'Gupta',
  'Reddy', 'Verma', 'Yadav', 'Mishra', 'Joshi',
  'Pandey', 'Shrivastav', 'Agarwal', 'Nair', 'Iyer',
  'Bhat', 'Desai', 'Kulkarni', 'Rao', 'Das'
];

const generateCandidateName = (index: number): string => {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[(index + Math.floor(index / FIRST_NAMES.length)) % LAST_NAMES.length];
  return `${first} ${last}`;
};

const assignParty = (constituencyIndex: number, candidateIndex: number): string => {
  const seed = constituencyIndex * 100 + candidateIndex;
  
  // Larger parties more frequently
  if (seed % 20 < 8) return MAJOR_PARTIES[seed % MAJOR_PARTIES.length];
  if (seed % 20 < 12) return MINOR_PARTIES[seed % MINOR_PARTIES.length];
  return 'Independent';
};

export async function initializeCandidates(): Promise<void> {
  try {
    const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-election';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');

    // Get all constituencies
    const constituencies = await Constituency.find().lean();
    console.log(`Found ${constituencies.length} constituencies`);

    if (constituencies.length === 0) {
      console.warn('No constituencies found. Run initConstituencies first.');
      process.exit(1);
    }

    // Clear existing candidates
    const deleteResult = await Candidate.deleteMany({});
    console.log(`Cleared ${deleteResult.deletedCount} existing candidates`);

    let candidateIndex = 0;
    let createdCount = 0;

    // Generate 5-7 candidates per constituency
    for (let i = 0; i < constituencies.length; i++) {
      const constituency = constituencies[i];
      const candidatesPerConstituency = 5 + (i % 3); // 5, 6, or 7 candidates

      for (let j = 0; j < candidatesPerConstituency; j++) {
        const partyName = assignParty(i, j);
        const party = await Party.findOne({ name: partyName });

        const candidate = new Candidate({
          name: generateCandidateName(candidateIndex),
          party: party?._id || null,
          constituency: constituency._id,
          votesReceived: Math.floor(Math.random() * 5000) + (j === 0 ? 2000 : 0),
          status: j === 0 ? 'leading' : j <= 2 ? 'counting' : 'lost',
          position: j + 1,
          symbol: `${partyName.substring(0, 3)}-${j + 1}`
        });

        await candidate.save();
        createdCount++;
        candidateIndex++;
      }

      if ((i + 1) % 20 === 0) {
        console.log(`  Processed ${i + 1}/${constituencies.length} constituencies (${createdCount} candidates)`);
      }
    }

    console.log(`\n✅ Successfully created ${createdCount} candidates`);
    console.log(`   Average per constituency: ${(createdCount / constituencies.length).toFixed(1)}`);

    // Verify count
    const finalCount = await Candidate.countDocuments();
    console.log(`   Database verification: ${finalCount} total candidates`);

    process.exit(0);
  } catch (error) {
    console.error('Error initializing candidates:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  initializeCandidates();
}
