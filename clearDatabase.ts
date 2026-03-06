import mongoose from 'mongoose';

const clearDatabase = async () => {
  try {
    const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/nepal-election';
    
    console.log(`\n🔌 Connecting to MongoDB at ${mongoUrl}...`);
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected\n');
    
    console.log('🗑️ Dropping entire database...');
    await mongoose.connection.dropDatabase();
    console.log('✅ Database cleared completely\n');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

clearDatabase();
