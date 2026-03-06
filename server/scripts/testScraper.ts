/**
 * Test Script: Run Ekantipur Scraper
 * Usage: npx ts-node server/scripts/testScraper.ts
 * 
 * This script tests the Ekantipur scraper and populates the database with election data
 */

import mongoose from 'mongoose';
import { scrapeEkantipurSource } from '../services/scrapers/ekantipurScraper';

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/election-results';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Run scraper test
const runTest = async () => {
  try {
    console.log('\n========================================');
    console.log('🚀 Starting Ekantipur Scraper Test');
    console.log('========================================\n');

    const result = await scrapeEkantipurSource();

    console.log('\n========================================');
    console.log('📊 Scraper Results:');
    console.log('========================================');
    console.log(`Source: ${result.source}`);
    console.log(`Success: ${result.success}`);
    console.log(`Parties Updated: ${result.partiesUpdated || 0}`);
    console.log(`Candidates Updated: ${result.candidatesUpdated || 0}`);
    if (result.error) {
      console.log(`Error: ${result.error}`);
    }
    console.log('========================================\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Scraper test failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Main execution
(async () => {
  await connectDB();
  await runTest();
})();
