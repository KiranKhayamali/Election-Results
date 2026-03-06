import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

interface Candidate {
  name: string;
  party: string;
  votes: number;
}

interface ConstituencyData {
  [constituencyName: string]: Candidate[];
}

async function extractOfficialData() {
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
    const constituentciesData = await page.evaluate(() => {
      const data: ConstituencyData = {};
      
      // Try to find all constituency result sections on the page
      const constituencies = document.querySelectorAll('[class*="constituency"], [id*="constituency"], .result-section, .constituency-result');
      
      if (constituencies.length === 0) {
        console.log('No constituencies found with standard selectors, trying alternative approach...');
      }

      // Look for all tables or divs containing candidate data
      const candidateRows = document.querySelectorAll('table tr, .candidate-row, [class*="candidate"]');
      
      // Extract text content and try to parse candidate information
      let currentConstituency = '';
      
      candidateRows.forEach((row) => {
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
        const cells = row.querySelectorAll('td');
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
        const windowData: any = (window as any);
        
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
    const links = await page.$$eval('a, button', elements => 
      elements.map(el => ({
        text: el.textContent?.trim() || '',
        href: (el as any).href || '',
        id: el.id || '',
        class: el.className || ''
      }))
    );

    const bhaktapurLinks = links.filter(l => 
      l.text.toLowerCase().includes('bhaktapur') || 
      l.id.toLowerCase().includes('bhaktapur')
    );

    console.log(`\n📍 Found links/buttons for Bhaktapur:`);
    bhaktapurLinks.slice(0, 5).forEach(link => {
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
    console.log('\n✅ ALTERNATIVE SOLUTION:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Open: https://result.election.gov.np/MapElectionResult2082.aspx');
    console.log('2. Press F12 to open Developer Tools');
    console.log('3. Go to Network tab');
    console.log('4. Look for requests with "json" or "JSON" in the filename');
    console.log('5. Click on those requests and check the Response tab');
    console.log('6. Look for data with constituency names and candidate votes');
    console.log('7. Copy the response JSON and parse it');
    console.log('\n💡 EASIER ALTERNATIVE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Use this browser extension to extract tables:');
    console.log('1. Install "Table Capture" extension (Chrome Web Store)');
    console.log('2. Right-click on any table → "Capture table"');
    console.log('3. It will convert to CSV/JSON format');
    console.log('4. Use the data to fill manualDataImport.ts');

  } catch (error) {
    console.error('Error during extraction:', error);
    console.log('\n⚠️  Web scraping failed. This is likely because:');
    console.log('  1. The website uses heavy JavaScript rendering');
    console.log('  2. The site may have anti-scraping protections');  
    console.log('  3. Authentication/session is required');
    console.log('\n📍 RECOMMENDED: Use the browser DevTools method above');
  }
}

// Run extraction
extractOfficialData().catch(console.error);
