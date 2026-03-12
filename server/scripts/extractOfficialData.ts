// Note: This script requires puppeteer to be installed for browser automation
// Install with: npm install puppeteer
// Wrap in condition to prevent TypeScript errors when puppeteer is not available

const PUPPETEER_AVAILABLE = (() => {
  try {
    require('puppeteer');
    return true;
  } catch {
    return false;
  }
})();

interface Candidate {
  name: string;
  party: string;
  votes: number;
}

interface ConstituencyData {
  [constituencyName: string]: Candidate[];
}

async function extractOfficialData() {
  if (!PUPPETEER_AVAILABLE) {
    console.log('⚠️  Puppeteer not installed. To use this script, run:');
    console.log('   npm install puppeteer');
    console.log('\n📍 RECOMMENDED: Use the browser DevTools method instead:');
    console.log('   1. Open: https://result.election.gov.np/MapElectionResult2082.aspx');
    console.log('   2. Press F12 for Developer Tools');
    console.log('   3. Find data in Network tab (look for .json requests)');
    console.log('   4. Use manualDataImport.ts to load the data');
    return { success: false, message: 'Puppeteer not available' };
  }

  // Actual extraction code (type-safe when puppeteer is available)
  try {
    const puppeteer = require('puppeteer');
    
    console.log('🌐 Opening official election website...');
    console.log('📍 URL: https://result.election.gov.np/MapElectionResult2082.aspx');
    console.log('');

    let browser;
    try {
      // Launch Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      
      // Set a longer timeout for page loads
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);

      console.log('⏳ Loading election result map...');
      await page.goto('https://result.election.gov.np/MapElectionResult2082.aspx', {
        waitUntil: 'networkidle2'
      });

      // Wait for the page to load and data to be populated
      await page.waitForTimeout(3000);

      console.log('🔍 Extracting constituency data...');
      
      // Extract all constituencies from the page
      // @ts-ignore - document is available in browser context via page.evaluate
      const constituentciesData = await page.evaluate(() => {
        const data: any = {};
        
        // Try to find all constituency result sections on the page
        // @ts-ignore
        const constituencies = (document as any).querySelectorAll('[class*="constituency"], [id*="constituency"], .result-section, .constituency-result');
        
        if (constituencies.length === 0) {
          console.log('No constituencies found with standard selectors, trying alternative approach...');
        }

        // Look for all tables or divs containing candidate data
        // @ts-ignore
        const candidateRows = (document as any).querySelectorAll('table tr, .candidate-row, [class*="candidate"]');
        
        // Extract text content and try to parse candidate information
        let currentConstituency = '';
        
        candidateRows.forEach((row: any) => {
          const text = row.textContent || '';
          
          // Try to identify if this is a constituency header
          if (text.includes('-') && text.match(/[1-9]/)) {
            const match = text.match(/^([^,]+?)-(\d+)/);
            if (match) {
              currentConstituency = `${match[1].trim()}-${match[2]}`;
              if (!data[currentConstituency]) {
                data[currentConstituency] = [];
              }
            }
          }
          
          // Try to extract candidate data (name, party, votes)
          const cells = (row as any).querySelectorAll('td');
          if (cells.length >= 2) {
            const name = cells[0]?.textContent?.trim();
            const party = cells[1]?.textContent?.trim();
            const votes = cells[2]?.textContent?.trim();
            
            if (name && party && votes && currentConstituency) {
              const votesNumber = parseInt(votes.replace(/,/g, ''), 10);
              if (!isNaN(votesNumber) && name.length > 2) {
                data[currentConstituency].push({
                  name,
                  party,
                  votes: votesNumber
                });
              }
            }
          }
        });

        return data;
      });

      if (Object.keys(constituentciesData).length === 0) {
        console.log('⚠️  No data extracted using standard selectors');
        console.log('📊 The page loads data dynamically with JavaScript...');
        console.log('🔧 Attempting alternative extraction method...');
        
        // Try to get data from window object or other global variables
        const pageData = await page.evaluate(() => {
          const data: any = {};
          
          // Check for common data storage patterns in election websites
          // @ts-ignore - window is available in browser context via page.evaluate
          const windowData = (typeof window !== 'undefined' ? (window as any) : {});
          
          // Look for election data in window object
          for (const key in windowData) {
            if (key.toLowerCase().includes('data') || 
                key.toLowerCase().includes('result') || 
                key.toLowerCase().includes('constituency')) {
              const value = windowData[key];
              if (typeof value === 'object' && value !== null) {
                data[key] = value;
              }
            }
          }
          
          return data;
        });

        console.log('📋 Available window objects with data:');
        Object.keys(pageData).forEach(key => {
          console.log(`  - ${key}`);
        });
      }

      // Try clicking on constituencies to load their data
      console.log('\n🖱️  Attempting to extract data from interactive elements...');
      
      const constituencies = await page.$$('[class*="Bhaktapur"], [id*="Bhaktapur"]');
      console.log(`Found ${constituencies.length} Bhaktapur-related elements`);

      // Get all links and buttons that might lead to constituency data
      const links = await page.$$eval('a, button', (elements: any[]) => 
        elements.map((el: any) => ({
          text: el.textContent?.trim() || '',
          href: (el as any).href || '',
          id: el.id || '',
          class: el.className || ''
        }))
      );

      interface LinkInfo {
        text: string;
        href: string;
        id: string;
        class: string;
      }

      const bhaktapurLinks = links.filter((l: LinkInfo) => 
        l.text.toLowerCase().includes('bhaktapur') || 
        l.id.toLowerCase().includes('bhaktapur')
      );

      console.log(`\n📍 Found links/buttons for Bhaktapur:`);
      bhaktapurLinks.slice(0, 5).forEach((link: LinkInfo) => {
        console.log(`  - Text: ${link.text}`);
        console.log(`    ID: ${link.id}`);
        console.log(`    Href: ${link.href}`);
      });

      // Try to extract from visible content
      const pageContent = await page.content();
      const candidateMatches = pageContent.match(/\d{1,2},\d{3}/g) || [];
      console.log(`\n💾 Found ${candidateMatches.length} potential vote counts in page`);
      console.log('Sample vote counts:', candidateMatches.slice(0, 10).join(', '));

      await browser.close();

      console.log('\n❌ Unable to auto-extract data due to page complexity');
      return { success: false, message: 'Auto-extraction inconclusive' };

    } catch (error) {
      console.error('Error during extraction:', error);
      console.log('\n⚠️  Web scraping failed. This is likely because:');
      console.log('  1. The website uses heavy JavaScript rendering');
      console.log('  2. The site may have anti-scraping protections');  
      console.log('  3. Authentication/session is required');
      console.log('\n📍 RECOMMENDED: Use the browser DevTools method above');
      return { success: false, message: 'Extraction failed' };
    }
  } catch (error) {
    console.error('Puppeteer error:', error);
    return { success: false, message: 'Puppeteer error' };
  }
}

// Run extraction only if explicitly called
if (require.main === module) {
  extractOfficialData().catch(console.error);
}
