# Installation and Startup Checklist

## ✅ Pre-Installation Checklist

Before you begin, ensure you have:
- [ ] Node.js v18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] MongoDB installed OR MongoDB Atlas account
- [ ] Git installed (optional)
- [ ] Code editor (VS Code recommended)

## 📦 Installation Steps

### Step 1: Install Backend Dependencies
```bash
cd "c:\Users\kiran\OneDrive\Desktop\Free Work\Election\Election Result"
npm install
```

**Expected packages:**
- express
- mongoose
- socket.io
- typescript
- ts-node
- axios
- cheerio
- and more...

✅ Success indicator: `added XXX packages` message

### Step 2: Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

**Expected packages:**
- react
- react-dom
- react-router-dom
- socket.io-client
- recharts
- typescript
- and more...

✅ Success indicator: `added XXX packages` message

### Step 3: Verify Environment File
- [ ] `.env` file exists in root directory
- [ ] Contains MongoDB URI
- [ ] Contains PORT=5000
- [ ] Contains CLIENT_URL=http://localhost:3000

### Step 4: Start MongoDB
Choose one:

**Option A: Local MongoDB**
```bash
# Windows - Check if service is running
# Or start manually:
mongod
```

**Option B: MongoDB Atlas**
- Update `.env` with Atlas connection string
- Format: `mongodb+srv://username:password@cluster.mongodb.net/nepal-election`

✅ Success indicator: MongoDB is accessible

## 🚀 First Run

### Terminal 1: Start Everything
```bash
npm run dev
```

This command runs:
1. Backend server on port 5000
2. Frontend dev server on port 3000

### What to Expect

**Terminal Output - Backend:**
```
🚀 Server running on port 5000
📊 Environment: development
⚡ TypeScript enabled
✅ MongoDB connected successfully
🔄 Starting data aggregation service...
✅ Data aggregation service started
```

**Terminal Output - Frontend:**
```
Compiled successfully!

You can now view nepal-election-client in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

**Browser:**
- [ ] Navigate to http://localhost:3000
- [ ] See "Nepal Election Results 2082" header
- [ ] See navigation menu
- [ ] Dashboard loads without errors

## 🧪 Verification Tests

### Test 1: Backend API
Open new terminal:
```bash
curl http://localhost:5000
```

Expected response:
```json
{
  "message": "Nepal Election Results API",
  "version": "1.0.0",
  "status": "running",
  "typescript": true
}
```

### Test 2: Database Connection
```bash
# Connect to MongoDB
mongo nepal-election

# Check collections
show collections
```

Expected: Database created (may be empty initially)

### Test 3: Frontend Accessibility
- [ ] http://localhost:3000 loads
- [ ] No console errors in browser DevTools
- [ ] Can navigate between pages

### Test 4: WebSocket Connection
Open browser console (F12) at http://localhost:3000:
Look for: `✅ Connected to WebSocket`

### Test 5: API Endpoints
Test in browser:
- http://localhost:5000/api/parties
- http://localhost:5000/api/elections/overview

Expected: JSON response (may be empty data initially)

## 🔧 Troubleshooting

### ❌ "Cannot find module"
**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
rm -rf client/node_modules
npm install
cd client && npm install
```

### ❌ "Port 5000 already in use"
**Solution:**
Edit `.env`:
```env
PORT=5001
```

Then update `client/package.json`:
```json
"proxy": "http://localhost:5001"
```

### ❌ "MongoDB connection failed"
**Solutions:**
1. Check if MongoDB service is running
2. Verify connection string in `.env`
3. Try MongoDB Atlas instead
4. Check firewall settings

### ❌ "ECONNREFUSED localhost:5000"
**Solution:**
Ensure backend is running:
```bash
npm run server
```

### ❌ TypeScript errors
**Solution:**
```bash
# Rebuild
npm run build:server
```

### ❌ React errors
**Solution:**
```bash
cd client
rm -rf node_modules package-lock.json
npm install
```

## 📋 Post-Installation Tasks

### 1. Configure Web Scrapers (CRITICAL)
- [ ] Read SCRAPER_GUIDE.md
- [ ] Visit https://result.election.gov.np/
- [ ] Inspect HTML structure
- [ ] Update `server/services/scrapers/officialScraper.ts`
- [ ] Repeat for Ekantipur and OnlineKhabar

### 2. Test Data Scraping
```bash
# Trigger manual update
curl -X POST http://localhost:5000/api/elections/refresh
```

Check console for:
- `✅ Official source: Updated X parties`
- `✅ Ekantipur source: Updated X parties`
- `✅ OnlineKhabar source: Updated X parties`

### 3. Verify Data in Database
```bash
mongo nepal-election
db.parties.find()
db.electionupdates.find()
```

### 4. Frontend Testing
- [ ] Dashboard shows data
- [ ] Charts render correctly
- [ ] Party standings page works
- [ ] Province view works
- [ ] Live updates page works
- [ ] WebSocket updates work

## 🎯 Success Criteria

Your installation is successful when:
- [x] Backend starts without errors
- [x] Frontend starts without errors
- [x] MongoDB connects successfully
- [x] WebSocket connects
- [x] API endpoints return responses
- [x] Frontend displays without errors
- [ ] Data scrapers configured (requires manual setup)
- [ ] Data appears in database (after scraper config)
- [ ] Real-time updates work

## 🚦 Status Check Commands

```bash
# Check if backend is running
curl http://localhost:5000

# Check if MongoDB is running
mongo --eval "db.adminCommand('ping')"

# Check Node version
node --version

# Check npm version
npm --version

# Check TypeScript
npx tsc --version
```

## 📞 Getting Help

If stuck:
1. Check console logs (backend terminal)
2. Check browser console (F12)
3. Verify all dependencies installed
4. Check MongoDB connection
5. Review error messages carefully
6. Consult documentation files

## 📚 Next Steps

After successful installation:
1. ✅ Read README.md for features
2. ✅ Read SCRAPER_GUIDE.md for configuration
3. ✅ Configure web scrapers
4. ✅ Test data aggregation
5. ✅ Customize UI as needed
6. ✅ Prepare for deployment

## 🎉 Congratulations!

If all checks pass, you're ready to:
- Track real election results
- Customize the application
- Add new features
- Deploy to production

---

**Need Help?** Check:
- README.md - Full documentation
- SETUP.md - Detailed setup
- SCRAPER_GUIDE.md - Scraper configuration
- QUICK_REFERENCE.md - Quick commands
- PROJECT_SUMMARY.md - What's included

Good luck with your Nepal Election Results tracker! 🇳🇵🚀
