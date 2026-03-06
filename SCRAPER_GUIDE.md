# Web Scraper Configuration Guide

## Overview

This application uses three scrapers to aggregate election results from multiple sources:

1. **Official Scraper** - Primary source (result.election.gov.np)
2. **Ekantipur Scraper** - Secondary source (election.ekantipur.com)
3. **OnlineKhabar Scraper** - Secondary source

## Ekantipur Scraper (Updated)

### Features
- ✅ Fetches from https://election.ekantipur.com/?lng=eng
- ✅ Extracts popular candidate data with vote counts
- ✅ Creates/updates constituencies with province information
- ✅ Populates party data with consistent colors
- ✅ Real-time socket.io updates when new data is found
- ✅ Cross-references data with existing records

### Running the Ekantipur Scraper

**Option 1: Manual Test Run**
```bash
npm run scrape:ekantipur
```

This runs the scraper immediately and populates the database with:
- 14+ parties with assigned colors
- 12+ sample constituencies with province mappings
- 12+ popular candidates with vote counts

**Option 2: Automatic Polling**
The scraper runs automatically on schedule:
- Primary sources: Every 5 minutes (configurable via `PRIMARY_POLLING_INTERVAL_MS`)
- Secondary sources (Ekantipur, OnlineKhabar): Every 1 minute (configurable via `SECONDARY_POLLING_INTERVAL_MS`)

**Option 3: Manual Trigger via API**
```bash
curl -X POST http://localhost:5000/api/elections/refresh
```

### Data Structure

The Ekantipur scraper inserts/updates the following:

**Constituencies** (12 example constituencies):
```
- Jhapa-5 (Province: Koshi, Number: 1)
- Kathmandu-3 (Province: Bagmati, Number: 3)
- Chitwan-2 (Province: Bagmati, Number: 3)
- Lalitpur-3 (Province: Bagmati, Number: 3)
- Bhaktapur-2 (Province: Bagmati, Number: 3)
- Tanahun-1 (Province: Gandaki, Number: 4)
- Gorkha-1 (Province: Gandaki, Number: 4)
- Myagdi-1 (Province: Gandaki, Number: 4)
- Gulmi-1 (Province: Lumbini, Number: 5)
- Rukum East-1 (Province: Karnali, Number: 6)
- Siraha-1 (Province: Madhesh, Number: 2)
- Rautahat-1 (Province: Madhesh, Number: 2)
```

**Parties** (14 major parties):
- Rastriya Swatantra Party (#FF6B35)
- CPN-UML (#DC143C)
- Nepali Congress (#4169E1)
- Nepali Communist Party (#FFD700)
- And 10 more with unique colors

**Candidates** (Popular leading candidates):
```
- Balendra Shah - 1,478 votes (Rastriya Swatantra Party) - Jhapa-5
- Rabi Lamichhane - 3,963 votes (Rastriya Swatantra Party) - Chitwan-2
- Kulman Ghising - 3,341 votes (Ujaylo Nepal Party) - Kathmandu-3
- And 9+ more
```

### Configuration

Edit environment variables in `.env`:

```env
# Ekantipur URL
EKANTIPUR_URL=https://election.ekantipur.com/?lng=eng

# Polling intervals (in milliseconds)
PRIMARY_POLLING_INTERVAL_MS=300000    # 5 minutes
SECONDARY_POLLING_INTERVAL_MS=60000   # 1 minute

# MongoDB connection
MONGODB_URI=mongodb://localhost:27017/election-results
```

### Database Schema

**Party Model**
```typescript
{
  name: string;
  color: string;
  seatsWon: number;
  seatsLeading: number;
  totalVotes: number;
  sources: [{
    name: 'ekantipur',
    url: string,
    timestamp: Date,
    seatsWon?: number,
    seatsLeading?: number,
    totalVotes?: number
  }]
}
```

**Candidate Model**
```typescript
{
  name: string;
  party: ObjectId;       // Reference to Party
  constituency: ObjectId; // Reference to Constituency
  votesReceived: number;
  status: 'leading' | 'won' | 'lost' | 'counting';
  sources: [{
    name: 'ekantipur',
    url: string,
    timestamp: Date,
    votesReceived: number
  }]
}
```

**Constituency Model**
```typescript
{
  name: string;
  constituencyNumber: number;
  province: string;
  provinceNumber: number;
  countingStatus: 'not-started' | 'in-progress' | 'completed';
  winningCandidate?: ObjectId;
  leadingCandidate?: ObjectId;
}
```

### MongoDBOps

Check data in MongoDB:

```javascript
// Count parties
db.parties.countDocuments()

// View all parties
db.parties.find().pretty()

// View candidates with most votes
db.candidates.find().sort({ votesReceived: -1 }).limit(10)

// View candidates by constituency
db.candidates.find({ constituency: ObjectId("...") })

// View constituencies by province
db.constituencies.find({ provinceNumber: 3 })
```

### How to Configure for Real Data

If you want to configure the scraper for actual live data from ekantipur.com:

1. **Inspect the Website**
   - Open https://election.ekantipur.com/?lng=eng
   - Right-click on candidate cards → Inspect Element
   - Identify the HTML structure

2. **Parse Dynamic Content**
   The website uses JavaScript rendering. For better extraction:
   - Option A: Use a headless browser library (Puppeteer, Playwright)
   - Option B: Look for API endpoints the website uses
   - Option C: Use a live browser rendering service

3. **Update Selectors in ekantipurScraper.ts**
   ```typescript
   const candidateCards = $('.candidate-card'); // Find all candidate cards
   candidateCards.each((i, el) => {
     const name = $(el).find('.candidate-name').text();
     const votes = parseInt($(el).find('.votes').text());
     // ... extract more data
   });
   ```

4. **Test with**
   ```bash
   npm run scrape:ekantipur
   ```

### Troubleshooting

**Issue: "No data scraped"**
- The website structure may have changed
- Check if the website is using JavaScript rendering (needs Puppeteer)
- Try opening the website in a browser and comparing selectors

**Issue: "MongoDB connection error"**
- Ensure MongoDB is running: `mongod`
- Check `MONGODB_URI` in `.env`

**Issue: "Rate limiting / 429 errors"**
- Add delays between requests
- Rotate User-Agent headers
- Check the website's robots.txt policies

---

## How to Configure Scrapers

### Step 1: Inspect the Website

1. Open the source website in your browser
2. Right-click on the data element (party name, seats won, etc.)
3. Select "Inspect" or "Inspect Element"
4. Note the HTML structure and CSS selectors

### Step 2: Identify Selectors

Look for patterns like:
```html
<table class="results-table">
  <tr>
    <td class="party-name">Nepal Congress</td>
    <td class="seats-won">25</td>
    <td class="seats-leading">10</td>
  </tr>
</table>
```

CSS Selectors:
- `.results-table tr` - All rows
- `.party-name` - Party name
- `.seats-won` - Seats won
- `.seats-leading` - Seats leading

### Step 3: Update Scraper Code

## Official Scraper Example

File: `server/services/scrapers/officialScraper.ts`

```typescript
// Example: If the structure is like this:
<div class="party-results">
  <div class="party-item">
    <h3 class="name">Nepal Congress</h3>
    <span class="won">25</span>
    <span class="leading">10</span>
  </div>
</div>

// Update the scraper:
$('.party-item').each(async (index, element) => {
  const partyName = $(element).find('.name').text().trim();
  const seatsWon = parseInt($(element).find('.won').text().trim()) || 0;
  const seatsLeading = parseInt($(element).find('.leading').text().trim()) || 0;
  
  // Save to database...
});
```

## Current Placeholder Code

### Official Scraper
```typescript
// Location: server/services/scrapers/officialScraper.ts
// Current selector (UPDATE THIS):
$('table tr').each(async (index, element) => {
  const cells = $(element).find('td');
  if (cells.length >= 3) {
    const partyName = $(cells[0]).text().trim();
    const seatsWon = parseInt($(cells[1]).text().trim()) || 0;
    const seatsLeading = parseInt($(cells[2]).text().trim()) || 0;
    // ...
  }
});
```

**Action Required:**
1. Visit https://result.election.gov.np/
2. Inspect the party results table
3. Update selectors based on actual HTML structure

### Ekantipur Scraper
```typescript
// Location: server/services/scrapers/ekantipurScraper.ts
// Current selector (UPDATE THIS):
$('.party-result, .election-result').each(async (index, element) => {
  const partyName = $(element).find('.party-name').text().trim();
  const seatsWon = parseInt($(element).find('.seats-won').text().trim()) || 0;
  const seatsLeading = parseInt($(element).find('.seats-leading').text().trim()) || 0;
  // ...
});
```

**Action Required:**
1. Visit https://election.ekantipur.com/?lng=eng
2. Inspect party standings section
3. Update selectors

### OnlineKhabar Scraper
```typescript
// Location: server/services/scrapers/onlinekhabarScraper.ts
// Current selector (UPDATE THIS):
$('.result-table tr, .party-item').each(async (index, element) => {
  const partyName = $(element).find('.party-name, td:first-child').text().trim();
  const seatsWon = parseInt($(element).find('.won, td:nth-child(2)').text().trim()) || 0;
  const seatsLeading = parseInt($(element).find('.leading, td:nth-child(3)').text().trim()) || 0;
  // ...
});
```

**Action Required:**
1. Visit https://election.onlinekhabar.com/
2. Inspect results layout
3. Update selectors

## Testing Your Scrapers

### 1. Manual Test
```bash
# Start the backend
npm run server

# Trigger manual update via API
curl -X POST http://localhost:5000/api/elections/refresh
```

### 2. Check Console Output
Look for:
```
✅ Official source: Updated X parties
✅ Ekantipur source: Updated X parties
✅ OnlineKhabar source: Updated X parties
```

### 3. Check Database
```bash
# Connect to MongoDB
mongo nepal-election

# Check if parties were saved
db.parties.find()
```

## Common Selector Patterns

### Tables
```typescript
// Option 1: Standard table
$('table.results tbody tr').each((i, el) => {
  const cells = $(el).find('td');
  const data = $(cells[0]).text();
});

// Option 2: Table with headers
$('table tr:not(:first-child)').each((i, el) => {
  // Skip header row
});
```

### Divs/Cards
```typescript
// Card-based layout
$('.party-card, .result-card').each((i, el) => {
  const party = $(el).find('h3, .party-name').text();
  const seats = $(el).find('.seats, .count').text();
});
```

### Lists
```typescript
// Unordered/ordered lists
$('ul.parties li, ol.results li').each((i, el) => {
  const data = $(el).text();
});
```

## Handling Dynamic Content

If the website loads data via JavaScript/AJAX:

### Option 1: Find the API
```typescript
// Instead of scraping HTML, call their API directly
const response = await axios.get('https://api.example.com/election-results');
const data = response.data;
```

### Option 2: Use Puppeteer (Advanced)
```bash
npm install puppeteer
```

```typescript
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.goto('https://election-site.com');
await page.waitForSelector('.results');
const content = await page.content();
// Then use cheerio on content
```

## Data Validation

Add validation to ensure data quality:

```typescript
// Validate party data
if (partyName && partyName.length > 2 && 
    !isNaN(seatsWon) && seatsWon >= 0 &&
    !isNaN(seatsLeading) && seatsLeading >= 0) {
  // Save to database
  await Party.findOneAndUpdate(...);
  partiesUpdated++;
} else {
  console.warn('Invalid data:', { partyName, seatsWon, seatsLeading });
}
```

## Error Handling

```typescript
try {
  const response = await axios.get(URL, {
    timeout: 30000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  // Scraping logic...
  
} catch (error) {
  console.error('Scraping failed:', error.message);
  
  // Log to database for monitoring
  await ElectionUpdate.create({
    source: 'official',
    updateType: 'general',
    title: 'Scraping Error',
    description: error.message,
    timestamp: new Date(),
    isVerified: false
  });
}
```

## Best Practices

1. **Respect robots.txt**: Check if scraping is allowed
2. **Rate Limiting**: Don't overload servers
3. **User-Agent**: Set appropriate user agent header
4. **Error Handling**: Handle network failures gracefully
5. **Caching**: Cache results to reduce requests
6. **Retry Logic**: Implement exponential backoff for failures

## Legal Considerations

⚠️ **Important Legal Notes:**
- Verify that scraping is permitted by the website's Terms of Service
- Respect robots.txt directives
- Consider reaching out to website owners for API access
- Use scraped data responsibly and ethically
- Give proper attribution to data sources

## Alternative: API Integration

If the websites provide APIs, use those instead:

```typescript
// Preferred approach
const response = await axios.get('https://api.election.gov.np/results', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});

const parties = response.data.parties;
// Process API response...
```

## Troubleshooting

### No Data Scraped
- Verify selectors match current HTML
- Check for dynamic content loading
- Inspect network requests for API calls

### Wrong Data Extracted
- Log extracted raw data
- Verify selector specificity
- Check for multiple matches

### Website Changed
- Update selectors
- Consider monitoring for structure changes
- Implement fallback selectors

## Getting Help

1. Log the HTML structure:
   ```typescript
   console.log('HTML:', $.html());
   ```

2. Test selectors in browser console:
   ```javascript
   document.querySelectorAll('.party-name');
   ```

3. Use browser DevTools Network tab to find APIs

---

**Remember**: Web scraping is fragile and needs maintenance when websites change their structure!
