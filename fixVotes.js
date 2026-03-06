const mongoose = require('mongoose');
const Party = require('./server/models/Party').default;

const VOTE_CORRECTIONS = {
  'Shram Sanskriti Party': 125467,
  'Ujaylo Nepal Party': 189234
};

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/election-db');
    console.log('Connected to MongoDB');

    // Fix zero-vote parties
    for (const [party, votes] of Object.entries(VOTE_CORRECTIONS)) {
      const result = await Party.findOneAndUpdate(
        { name: party },
        { totalVotes: votes, votePercentage: 0, lastUpdated: new Date() },
        { new: true }
      );
      if (result) console.log(`Fixed ${party} to ${votes} votes`);
    }

    // Remove corrupted entries
    const corrupted = ['उज्यालो नेपाल पार्टी', '१'];
    for (const badName of corrupted) {
      const result = await Party.deleteOne({ name: badName });
      if (result.deletedCount > 0) console.log(`Removed corrupted: ${badName}`);
    }

    console.log('Database corrections complete');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
