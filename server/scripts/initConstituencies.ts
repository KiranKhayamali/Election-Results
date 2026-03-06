import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import Constituency from '../models/Constituency';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nepal-election';

async function initializeConstituencies() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read constituencies data
    const dataPath = path.join(__dirname, '../data/constituencies.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    console.log(`📊 Found ${data.constituencies.length} constituencies to initialize`);

    // Clear existing constituencies (optional - comment out if you want to keep existing data)
    // await Constituency.deleteMany({});
    // console.log('🗑️ Cleared existing constituencies');

    let created = 0;
    let updated = 0;

    // Insert constituencies with upsert
    for (const constituency of data.constituencies) {
      const result = await Constituency.findOneAndUpdate(
        {
          constituencyNumber: constituency.constituencyNumber,
          provinceNumber: constituency.provinceNumber
        },
        {
          $set: {
            name: constituency.name,
            province: constituency.province,
            countingStatus: 'in-progress'
          },
          $setOnInsert: {
            totalVoters: 0,
            totalVotesCast: 0,
            turnoutPercentage: 0,
            lastUpdated: new Date()
          }
        },
        { upsert: true, new: true }
      );

      if (result) {
        if (result.id) {
          updated++;
        } else {
          created++;
        }
      }
    }

    console.log(`✅ Constituency initialization complete:`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Updated: ${updated}`);
    console.log(`   - Total: ${created + updated}`);

    // Verify by counting constituencies per province
    const provinces = [
      { num: 1, name: 'Koshi' },
      { num: 2, name: 'Madhesh' },
      { num: 3, name: 'Bagmati' },
      { num: 4, name: 'Gandaki' },
      { num: 5, name: 'Lumbini' },
      { num: 6, name: 'Karnali' },
      { num: 7, name: 'Sudurpashchim' }
    ];

    console.log('\n📍 Constituency Distribution by Province:');
    for (const province of provinces) {
      const count = await Constituency.countDocuments({ provinceNumber: province.num });
      console.log(`   Province ${province.num} (${province.name}): ${count} constituencies`);
    }

    const total = await Constituency.countDocuments();
    console.log(`\n📊 Total Constituencies in Database: ${total}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error initializing constituencies:', error);
    process.exit(1);
  }
}

initializeConstituencies();
