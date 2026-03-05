# Web Scraper Configuration Guide

⚠️ **IMPORTANT**: The web scrapers need to be configured with the correct HTML selectors based on the actual structure of the source websites.

## Overview

This application uses three scrapers:
1. **Official Scraper** - Primary source (result.election.gov.np)
2. **Ekantipur Scraper** - Secondary source
3. **OnlineKhabar Scraper** - Secondary source

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
