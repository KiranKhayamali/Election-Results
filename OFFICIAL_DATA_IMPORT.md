# 📊 Official Data Import Guide

## Quick Start

Since we cannot directly scrape https://result.election.gov.np/MapElectionResult2082.aspx due to JavaScript-based dynamic loading, you'll need to manually extract the data using the browser's inspection tools.

## Step-by-Step Instructions

### Option 1: Using Browser DevTools (Recommended for Browsers)

1. **Open the Official Website**: https://result.election.gov.np/MapElectionResult2082.aspx
2. **Open Browser DevTools**: Press `F12` or right-click → "Inspect"
3. **Navigate to Network Tab**: Click "Network" tab
4. **Look for API Calls**: 
   - Refresh the page
   - Look for requests to `/Handlers/SecureJson.ashx`
   - Click on the requests that return JSON data
   - In the "Response" tab, you can see the raw JSON data
5. **Extract the Data**: Copy the JSON data containing constituencies, candidates, and votes
6. **Format the Data**: Convert to the format required below

### Option 2: Manual Copy-Paste

1. Visit https://result.election.gov.np/MapElectionResult2082.aspx
2. For **each constituency**:
   - Find the constituency name (e.g., "Bhaktapur-1")
   - List ALL candidates with:
     - Full name
     - Party affiliation
     - Vote count
   - Copy this information

### Data Format Required

Once you have the data, update `server/scripts/manualDataImport.ts` with this format:

```typescript
const ELECTION_DATA = {
  'Constituency Name': [
    { name: 'Candidate Full Name', party: 'Party Name', votes: 12345 },
    { name: 'Another Candidate', party: 'Another Party', votes: 11000 },
    // ... all candidates in this constituency
  ],
  'Another Constituency': [
    // ... candidates ...
  ],
};
```

### Example for Bhaktapur-1

```typescript
'Bhaktapur-1': [
  { name: 'Sunita Gupta', party: 'Rastriya Swatantra Party', votes: 25000 },
  { name: 'Bhim Prasad Sharma', party: 'Nepali Congress', votes: 24000 },
  { name: 'Kiran Rana', party: 'CPN-UML', votes: 22000 },
],
```

### Supported Party Names (Use Exact Names)

The database already has these parties. Use them exactly:
- Rastriya Swatantra Party
- Nepali Congress
- CPN-UML
- Nepal Communist Party Maoist
- Rastriya Prajatantra Party
- Janata Samajbadi Party
- Janamat Party
- Nagarik Unmukti Party
- Nepali Communist Party
- Ujaylo Nepal
- Any others you find (will be created automatically)

## Steps to Import

1. **Extract Data**: Follow one of the options above
2. **Update the Script**: Edit `server/scripts/manualDataImport.ts`
   - Find: `const ELECTION_DATA = { // ... };`
   - Replace with your actual data
3. **Run Import**: Execute the import script
   ```bash
   npm run import:manual
   ```
4. **Restart Server**: Kill and restart the server
   ```bash
   npm run server
   ```
5. **Verify**: Check the browser at http://localhost:3000 to see updated results

## To Find Bhaktapur-1 Data

1. Open the map result page: https://result.election.gov.np/MapElectionResult2082.aspx
2. Click on Bhaktapur region (likely in Province 3)
3. Find "Bhaktapur-1" constituency
4. View all candidates and their vote counts
5. You mentioned RSP candidate is leading - note their name and exact vote count

## Important Notes

- Use exact candidate names from the official website
- Use exact party names from the official website
- Vote counts must be numbers (no commas or formatting)
- All fields (name, party, votes) are required
- You need at least a few constituencies to start with

## Troubleshooting

**Error: "Party not found"**
- The party name doesn't match exactly. Check spelling and capitalization
- Solution: Use the exact name from the official website

**Data not showing**
- Make sure you filled in the ELECTION_DATA object
- Run: `npm run import:manual`
- Then restart the server: stop and run `npm run server` again

**Still seeing old data?**
- Clear browser cache: Ctrl+Shift+Delete (Ctrl+Cmd+Delete on Mac)
- Delete from MongoDB: `mongo` → `show dbs` → `use nepal-election` → `db.candidates.deleteMany({})`

## Next Steps After Import

Once you've imported some data:
1. All constituencies will be populated with real data
2. The provincial card will show accurate vote distributions
3. The dashboard will display actual election results
4. You can import more constituencies incrementally

---

**Questions?** Check the API endpoints to verify data was imported correctly:
- http://localhost:5000/api/constituencies
- http://localhost:5000/api/elections/overview
