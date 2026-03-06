# 📊 Extract Real Election Data - Step-by-Step Guide

## Quick Start

You have **2 options**:

### ⚡ Option 1: FASTEST - Use Your Browser (Copy-Paste Method)
- **Time**: 5-10 minutes per constituency
- **Best for**: Extracting 2-5 constituencies
- **Difficulty**: Easy

### 🤖 Option 2: Automated Script (JavaScript Console)
- **Time**: 1-2 minutes per constituency  
- **Best for**: Extracting many constituencies
- **Difficulty**: Medium
- **Uses**: Browser JavaScript to extract from rendered page

---

## 🔴 OPTION 1: Browser Copy-Paste Method (EASIEST)

### Step 1: Open the Official Website
1. Go to: https://result.election.gov.np/MapElectionResult2082.aspx
2. Wait for page to fully load (data appears)

### Step 2: Find Your Constituency
- Look for the constituency name in the list
- Example: **Bhaktapur-2**

### Step 3: Copy Candidate Data

You'll see a table like this:

```
Name                  Party                        Votes
Candidate 1 Name      Political Party Name        12,345
Candidate 2 Name      Another Party               10,123
Candidate 3 Name      Third Party                  5,234
```

### Step 4: Format the Data

Copy each candidate and format it as:
```
Candidate Name | Party Name | Vote Count (as number only, no commas)
```

### Step 5: Update the Import Script

Edit: `server/scripts/manualDataImport.ts`

Add your data like this:
```typescript
'Bhaktapur-2': [
  { name: 'Actual Candidate Name', party: 'Party Name', votes: 12345 },
  { name: 'Another Candidate', party: 'Another Party', votes: 10123 },
  { name: 'Third Candidate', party: 'Third Party', votes: 5234 },
],
```

### Step 6: Import Data
Run in terminal:
```bash
npm run import:manual
npm run cleanup:fake    # Remove fake constituencies
npm run server          # Start server
```

---

## 🟢 OPTION 2: Automated Browser Script (FASTER)

### Step 1: Open Developer Tools
1. Go to: https://result.election.gov.np/MapElectionResult2082.aspx
2. Wait for page to fully load
3. Press **F12** to open Developer Tools
4. Go to the **Console** tab (or press Ctrl+Shift+I → Console)

### Step 2: Run This Script

Copy and paste the entire script below into the Console and press Enter:

```javascript
// Extract all constituencies and candidates from the page
const extractData = () => {
  const data = {};
  
  // Find all constituency sections on the page
  const rows = Array.from(document.querySelectorAll('tr, .row, div[class*="result"]'));
  
  let currentConstituency = '';
  let constituencyData = [];
  
  rows.forEach(row => {
    const text = row.innerText || row.textContent;
    
    // Check if this row contains constituency name (has format like "Name-Number")
    if (text.match(/[A-Za-z]+-\d+/) && text.length < 50) {
      const match = text.match(/([A-Za-z]+)-(\d+)/);
      if (match) {
        // Save previous constituency if it has data
        if (currentConstituency && constituencyData.length > 0) {
          data[currentConstituency] = constituencyData;
        }
        
        // Start new constituency
        currentConstituency = text.trim();
        constituencyData = [];
      }
    }
    
    // Extract candidate data (name, party, votes)
    const cells = row.querySelectorAll('td, [class*="cell"], [class*="col"]');
    
    if (cells.length >= 2) {
      const name = cells[0]?.innerText?.trim();
      const party = cells[1]?.innerText?.trim();
      const votes = cells[2]?.innerText?.trim() || cells[cells.length-1]?.innerText?.trim();
      
      if (name && party && votes && name.length > 2) {
        const votesNumber = parseInt(votes.replace(/,/g, ''), 10);
        
        if (!isNaN(votesNumber) && votesNumber > 0) {
          constituencyData.push({
            name,
            party,
            votes: votesNumber
          });
        }
      }
    }
  });
  
  // Add last constituency
  if (currentConstituency && constituencyData.length > 0) {
    data[currentConstituency] = constituencyData;
  }
  
  return data;
};

// Run extraction
const electionData = extractData();

// Display results
console.log('=== EXTRACTED DATA ===');
console.log(JSON.stringify(electionData, null, 2));

// Copy to clipboard
console.log('\n✅ Copy this JavaScript code to use the data:');
console.log('const ELECTION_DATA = ' + JSON.stringify(electionData, null, 2));

// Also log a summary
console.log('\n📊 SUMMARY:');
Object.entries(electionData).forEach(([const_name, candidates]) => {
  console.log(`${const_name}: ${candidates.length} candidates`);
});
```

### Step 3: Copy the Output

The console will show:
```
=== EXTRACTED DATA ===
{
  "Bhaktapur-1": [
    {"name": "Candidate Name", "party": "Party", "votes": 12345},
    ...
  ]
}
```

### Step 4: Update manualDataImport.ts

Copy from `console.log('const ELECTION_DATA = ` section

Replace in `server/scripts/manualDataImport.ts`:
```typescript
const ELECTION_DATA: Record<string, Array<...>> = {
  // PASTE THE DATA HERE
};
```

### Step 5: Run Import
```bash
npm run import:manual
npm run cleanup:fake
npm run server
```

---

## 🟣 OPTION 3: Browser Network Tab (ADVANCED)

### Best For: Understanding API structure

### Steps:
1. Open: https://result.election.gov.np/MapElectionResult2082.aspx
2. Press **F12** → **Network** tab
3. Refresh the page
4. Look for requests containing:
   - `.json` files
   - `SecureJson.ashx` 
   - `Handler` requests
5. Click on them and check the **Response** tab
6. You may find JSON data with all election results

---

## 🟡 If Data Extraction Still Doesn't Work

### Alternative 1: Use Browser Extensions
Install **"Data Scraper"** or **"Table Capture"** extension:
1. Right-click on data table → Capture
2. Export as CSV/JSON
3. Convert to our format

### Alternative 2: Manual Entry
For each data point, type it directly into the import file

### Alternative 3: Ask the Website Support
Contact the Nepal Election Commission to request:
- Full dataset export
- API access for election data

---

## 📝 Example: Complete Bhaktapur-2 Data Format

Once you have the data, format it exactly like this:

```typescript
import mongoose from 'mongoose';
import Candidate from '../models/Candidate';
import Constituency from '../models/Constituency';
import Party from '../models/Party';

const ELECTION_DATA: Record<string, Array<{ name: string; party: string; votes: number }>> = {
  'Bhaktapur-1': [
    { name: 'Rukesh Ranjit', party: 'Rastriya Swatantra Party', votes: 14049 },
    { name: 'Prem Suwal', party: 'Nepal Majdoor Kisan Party', votes: 10206 },
    { name: 'Kiran Neupane', party: 'Nepali Congress', votes: 2202 },
    // ... (all 13 candidates)
  ],
  'Bhaktapur-2': [
    { name: 'Actual Name 1', party: 'Party Name', votes: 15000 },
    { name: 'Actual Name 2', party: 'Party Name', votes: 12000 },
    { name: 'Actual Name 3', party: 'Party Name', votes: 8000 },
    // ... (all candidates for Bhaktapur-2)
  ],
};
```

---

## ✅ Quick Checklist

- [ ] Opened official website
- [ ] Found Bhaktapur-2 results
- [ ] Extracted all candidate names
- [ ] Extracted all party names  
- [ ] Extracted all vote counts (numbers only)
- [ ] Formatted data correctly
- [ ] Updated `manualDataImport.ts`
- [ ] Ran `npm run import:manual`
- [ ] Ran `npm run cleanup:fake`
- [ ] Restarted server `npm run server`
- [ ] Verified at http://localhost:3000

---

## 🆘 Troubleshooting

**"Data not showing after import"**
- Make sure vote counts are NUMBERS only (no commas): ✅ `12345`, ❌ `12,345`
- Make sure party names match exactly with database

**"Party not found error"**
- Check spelling of party name carefully
- Use exact name from official website

**"No candidates extracted"**
- Try different selectors in the script
- Use Browser DevTools to inspect the HTML structure

---

**Questions?** See [OFFICIAL_DATA_IMPORT.md](OFFICIAL_DATA_IMPORT.md) for more help.
