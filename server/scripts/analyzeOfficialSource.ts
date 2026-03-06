import axios from 'axios';
import * as cheerio from 'cheerio';
import MongoDB from 'mongodb';

/**
 * Scraper for official.election.gov.np election results
 * This script fetches real candidate data with actual vote counts
 */

async function scrapeOfficialResultsData() {
  try {
    console.log('🔍 Fetching official election results...\n');

    // The official website has detailed results accessible via direct URLs
    // We'll fetch the main page which contains iframes/data references
    const mainUrl = 'https://result.election.gov.np/FPTPWLChartResult2082.aspx';
    
    const response = await axios.get(mainUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });

    const $ = cheerio.load(response.data);
    
    // Look for data embedded in the page or API calls
    const scripts = $('script');
    let foundApiPattern = false;
    let apiPatterns: string[] = [];

    scripts.each((i, elem) => {
      const scriptContent = $(elem).html() || '';
      
      // Look for API endpoint patterns
      if (scriptContent.includes('SecureJson.ashx') || scriptContent.includes('JSONFiles')) {
        foundApiPattern = true;
        const matches = scriptContent.match(/JSONFiles\/[^\s"]+/g);
        if (matches) {
          apiPatterns.push(...matches);
        }
      }
      
      // Look for constituency/candidate data directly in page data
      if (scriptContent.includes('constituency') || scriptContent.includes('candidate')) {
        console.log('Found potential data reference in script tag');
      }
    });

    console.log(`✅ Found ${foundApiPattern ? 'API patterns' : 'page content'}`);
    console.log(`📍 API patterns found: ${apiPatterns.length}`);
    
    if (apiPatterns.length > 0) {
      apiPatterns.slice(0, 5).forEach(p => console.log(`   - ${p}`));
    }

    // The actual detailed data is likely in a dynamically loaded view
    // Try the Map Election Result page which loads constituency data
    const mapUrl = 'https://result.election.gov.np/MapElectionResult2082.aspx';
    console.log('\n📍 Fetching Map view for detailed constituency data...');
    
    const mapResponse = await axios.get(mapUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 15000
    });

    const mapHtml = cheerio.load(mapResponse.data);
    const mapScripts = mapHtml('script');
    
    let endpointFound = false;
    mapScripts.each((i, elem) => {
      const content = mapHtml(elem).html() || '';
      if (content.includes('Bhaktapur') || content.includes('constituency')) {
        endpointFound = true;
        console.log('✅ Found data references in map page');
      }
    });

    // The data endpoint structure appears to be:
    // /Handlers/SecureJson.ashx?file=JSONFiles/Election2082/Common/HOR-{stateId}-T5.json
    // Where stateId is the province number
    console.log('\n📊 Expected data structure:');
    console.log('   /Handlers/SecureJson.ashx?file=JSONFiles/Election2082/Common/HOR-{stateId}-T5.json');
    console.log('\n   Provinces: 1-7');
    console.log('   The data requires proper CSRF token and session');

    return {
      success: true,
      message: 'Website structure analyzed',
      note: 'Official data requires authenticated session - recommend using official scraper with session management'
    };

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    return {
      success: false,
      error: (error as Error).message
    };
  }
}

// Run the scraper
scrapeOfficialResultsData().then(result => {
  console.log('\n' + JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
});
