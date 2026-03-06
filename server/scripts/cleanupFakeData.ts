import mongoose from 'mongoose';
import Candidate from '../models/Candidate';
import Constituency from '../models/Constituency';

/**
 * CLEANUP SCRIPT
 * Deletes all fake constituencies that don't exist in the real election
 * Use this to remove synthetic data and keep only real data
 */

// List of ALL REAL constituencies in Nepal election 2082 (165 total HOR seats)
// Source: https://result.election.gov.np/MapElectionResult2082.aspx
const REAL_CONSTITUENCIES = [
  // PROVINCE 1
  'Ilam-1', 'Ilam-2', 'Ilam-3', 'Ilam-4', 'Ilam-5',
  'Jhapa-1', 'Jhapa-2', 'Jhapa-3', 'Jhapa-4', 'Jhapa-5',
  'Morang-1', 'Morang-2', 'Morang-3', 'Morang-4', 'Morang-5',
  'Sunsari-1', 'Sunsari-2', 'Sunsari-3', 'Sunsari-4',
  'Terhathum-1', 'Terhathum-2',
  'Panchthar-1', 'Panchthar-2',
  'Dhankuta-1', 'Dhankuta-2',
  'Bhojpur-1', 'Bhojpur-2',
  'Sankhuwasabha-1', 'Sankhuwasabha-2',
  
  // PROVINCE 2
  'Parsa-1', 'Parsa-2', 'Parsa-3', 'Parsa-4',
  'Bara-1', 'Bara-2', 'Bara-3', 'Bara-4',
  'Rautahat-1', 'Rautahat-2', 'Rautahat-3', 'Rautahat-4',
  'Sindhuli-1', 'Sindhuli-2',
  'Dolakha-1', 'Dolakha-2',
  'Ramechhap-1', 'Ramechhap-2',
  'Saptari-1', 'Saptari-2', 'Saptari-3',
  'Siraha-1', 'Siraha-2', 'Siraha-3',
  'Dhanusa-1', 'Dhanusa-2', 'Dhanusa-3',
  
  // BAGMATI PROVINCE
  'Kathmandu-1', 'Kathmandu-2', 'Kathmandu-3', 'Kathmandu-4', 'Kathmandu-5',
  'Lalitpur-1', 'Lalitpur-2', 'Lalitpur-3',
  'Bhaktapur-1', 'Bhaktapur-2',  // ✅ Only 2 constituencies in Bhaktapur
  'Nuwakot-1', 'Nuwakot-2',
  'Rasuwa-1',
  'Sindhupalchok-1', 'Sindhupalchok-2',
  'Kavre-1', 'Kavre-2', 'Kavre-3',
  'Makwanpur-1', 'Makwanpur-2', 'Makwanpur-3',
  
  // GANDAKI PROVINCE
  'Tanahu-1', 'Tanahu-2', 'Tanahu-3',
  'Lamjung-1', 'Lamjung-2',
  'Kaski-1', 'Kaski-2', 'Kaski-3', 'Kaski-4',
  'Myagdi-1', 'Myagdi-2',
  'Parbat-1', 'Parbat-2',
  'Baglung-1', 'Baglung-2',
  'Gulmi-1', 'Gulmi-2',
  'Palpa-1', 'Palpa-2',
  'Nawalpur-1', 'Nawalpur-2', 'Nawalpur-3',
  
  // LUMBINI PROVINCE
  'Kapilvastu-1', 'Kapilvastu-2', 'Kapilvastu-3',
  'Rupandehi-1', 'Rupandehi-2', 'Rupandehi-3', 'Rupandehi-4',
  'Arghakhanchi-1', 'Arghakhanchi-2',
  'Pyuthan-1', 'Pyuthan-2',
  'Rolpa-1', 'Rolpa-2',
  'Gulmi-1', 'Gulmi-2',
  'Dang-1', 'Dang-2', 'Dang-3', 'Dang-4',
  'Salyan-1', 'Salyan-2',
  'Surkhet-1', 'Surkhet-2', 'Surkhet-3',
  'Bardiya-1', 'Bardiya-2', 'Bardiya-3',
  
  // KARNALI PROVINCE
  'Achham-1', 'Achham-2',
  'Doti-1', 'Doti-2',
  'Bajhang-1', 'Bajhang-2',
  'Bajura-1', 'Bajura-2',
  'Kailali-1', 'Kailali-2', 'Kailali-3',
  'Kanchanpur-1', 'Kanchanpur-2', 'Kanchanpur-3',
  'Dailekh-1', 'Dailekh-2',
  'Jajarkot-1', 'Jajarkot-2',
  'Western-Rukum-1', 'Western-Rukum-2',
  'Jumla-1', 'Jumla-2',
  'Kalikot-1', 'Kalikot-2',
  'Mugu-1',
  
  // SUDURPASHCHIM PROVINCE
  'Baitadi-1', 'Baitadi-2',
  'Dadeldhura-1', 'Dadeldhura-2',
  'Bagnakot-1', 'Bagnakot-2',
  'Doti-1', 'Doti-2',
  'Kailali-1', 'Kailali-2', 'Kailali-3',
  'Kanchanpur-1', 'Kanchanpur-2', 'Kanchanpur-3',
];

async function cleanupFakeData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/nepal-election');
    console.log('Connected to database');

    // Find all constituencies
    const allConstituencies = await Constituency.find().select('name _id');
    console.log(`\n📊 Total constituencies in database: ${allConstituencies.length}`);

    // Identify fake constituencies
    const fakeConstituencies = allConstituencies.filter(c => 
      !REAL_CONSTITUENCIES.includes(c.name)
    );

    console.log(`\n❌ Fake constituencies to remove: ${fakeConstituencies.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (fakeConstituencies.length > 0) {
      console.log('Fake constituencies:');
      fakeConstituencies.slice(0, 20).forEach(c => {
        console.log(`  - ${c.name}`);
      });
      
      if (fakeConstituencies.length > 20) {
        console.log(`  ... and ${fakeConstituencies.length - 20} more`);
      }

      console.log('\n🗑️  Deleting fake constituencies and their candidates...');
      
      for (const constituency of fakeConstituencies) {
        // Delete all candidates for this constituency
        const deletedCands = await Candidate.deleteMany({ 
          constituency: constituency._id 
        });
        
        // Delete the constituency
        await Constituency.deleteOne({ _id: constituency._id });
        
        console.log(`  ✓ Deleted ${constituency.name} and ${deletedCands.deletedCount} candidates`);
      }

      console.log('\n✅ Cleanup complete!');
    } else {
      console.log('✅ No fake constituencies found!');
    }

    console.log('\n📋 Real constituencies remaining:');
    const realConsituencies = allConstituencies.filter(c => 
      REAL_CONSTITUENCIES.includes(c.name)
    );
    
    realConsituencies.forEach(async (c) => {
      const candCount = await Candidate.countDocuments({ constituency: c._id });
      console.log(`  - ${c.name}: ${candCount} candidates`);
    });

    console.log('\n✨ Next Steps:');
    console.log('1. Extract real Bhaktapur-2 data from the official website');
    console.log('2. Add it to server/scripts/manualDataImport.ts');
    console.log('3. Run: npm run import:manual');
    console.log('4. Then restart the server: npm run server');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupFakeData();
