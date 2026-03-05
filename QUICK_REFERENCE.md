# Nepal Election Results 2082 - Quick Reference

## 🚀 Quick Start Commands

### First Time Setup
```bash
# 1. Install dependencies
npm install
cd client && npm install && cd ..

# 2. Create .env file
copy .env.example .env

# 3. Edit .env with your MongoDB connection

# 4. Start the application
npm run dev
```

### Daily Development
```bash
# Start everything (backend + frontend)
npm run dev

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

## 📊 Project Overview

### What This Application Does
- Tracks live Nepal election results from multiple sources
- Shows party standings, constituency results, candidate information
- Real-time updates via WebSocket
- Responsive web interface

### Key Technologies
- **TypeScript** - Both frontend and backend
- **MongoDB** - Database
- **Express** - Backend framework
- **React** - Frontend framework
- **Socket.io** - Real-time updates
- **Cheerio** - Web scraping

## 🔧 Important Files to Configure

### 1. Environment Variables (`.env`)
```env
MONGODB_URI=mongodb://localhost:27017/nepal-election
PORT=5000
CLIENT_URL=http://localhost:3000
```

### 2. Web Scrapers (IMPORTANT!)
Update these files with correct CSS selectors:
- `server/services/scrapers/officialScraper.ts`
- `server/services/scrapers/ekantipurScraper.ts`
- `server/services/scrapers/onlinekhabarScraper.ts`

See `SCRAPER_GUIDE.md` for detailed instructions.

## 📂 Key Directories

```
├── server/              Backend TypeScript code
│   ├── controllers/     API endpoint logic
│   ├── models/          Database schemas
│   ├── routes/          API routes
│   ├── services/        Business logic & scrapers
│   └── index.ts         Server entry point
│
└── client/              Frontend React code
    ├── src/
    │   ├── components/  React components
    │   ├── services/    API calls
    │   └── hooks/       Custom hooks
    └── public/          Static files
```

## 🌐 API Endpoints Reference

### Get Election Overview
```bash
GET /api/elections/overview
```

### Get Party Standings
```bash
GET /api/parties/standings
```

### Get Province Results
```bash
GET /api/elections/province/1  # Koshi Province
```

### Get Live Updates
```bash
GET /api/elections/updates
```

### Manual Data Refresh
```bash
POST /api/elections/refresh
```

## 🐛 Common Issues & Solutions

### Issue: MongoDB Connection Failed
**Solution:**
```bash
# Check if MongoDB is running
# Windows: services.msc → Find "MongoDB Server"
# Mac/Linux: sudo systemctl status mongod

# Or use MongoDB Atlas (cloud) instead
```

### Issue: Port 5000 Already in Use
**Solution:**
Edit `.env`:
```env
PORT=5001
```

### Issue: Frontend Can't Connect to Backend
**Solution:**
Check `client/package.json`:
```json
"proxy": "http://localhost:5000"
```

### Issue: No Data Being Scraped
**Solution:**
1. Check scraper console logs
2. Verify website accessibility
3. Update HTML selectors in scrapers
4. See `SCRAPER_GUIDE.md`

## 🧪 Testing

### Test Backend API
```bash
# Start backend
npm run server

# In another terminal, test endpoint
curl http://localhost:5000/api/elections/overview
```

### Test Frontend
```bash
# Start frontend
cd client
npm start

# Open browser: http://localhost:3000
```

### Test WebSocket
Open browser console at http://localhost:3000:
```javascript
// You should see:
// ✅ Connected to WebSocket
```

## 📦 Project Structure at a Glance

### Backend Models
- **Party**: Political parties with seat counts
- **Constituency**: Electoral constituencies
- **Candidate**: Individual candidates
- **ElectionUpdate**: Update history log

### Frontend Components
- **Dashboard**: Main overview page
- **PartyStandings**: Party seat distribution
- **ProvinceView**: Province-wise results
- **LiveUpdates**: Real-time update feed

## 🔄 Data Flow

```
1. Cron job triggers (every 5 minutes)
   ↓
2. Scrapers fetch data from sources
   ↓
3. Data saved to MongoDB
   ↓
4. WebSocket emits update event
   ↓
5. React frontend receives update
   ↓
6. UI refreshes automatically
```

## 📝 Development Checklist

Before deploying:
- [ ] Update scraper selectors with actual website structure
- [ ] Test all API endpoints
- [ ] Verify WebSocket functionality
- [ ] Configure production MongoDB
- [ ] Set up proper error logging
- [ ] Add rate limiting to API
- [ ] Implement authentication (if needed)
- [ ] Configure CORS for production domain
- [ ] Set up SSL certificate
- [ ] Add monitoring/analytics

## 🎯 Next Steps for Customization

1. **Add More Sources**: Create new scrapers in `server/services/scrapers/`
2. **Enhance UI**: Modify components in `client/src/components/`
3. **Add Features**: 
   - Candidate profiles
   - Historical comparison
   - District-wise maps
   - Email notifications
   - PDF reports

## 📚 Documentation Files

- `README.md` - Complete project documentation
- `SETUP.md` - Step-by-step setup instructions
- `SCRAPER_GUIDE.md` - How to configure web scrapers
- `QUICK_REFERENCE.md` - This file!

## 💡 Pro Tips

1. **Use MongoDB Compass** for easier database visualization
2. **Use Postman** to test API endpoints
3. **Check browser DevTools** Network tab for debugging
4. **Monitor console logs** for scraper issues
5. **Test with mock data** before scraping real data

## 🆘 Getting Help

1. Check console logs (both backend and frontend)
2. Review error messages in browser DevTools
3. Verify database connection
4. Check network connectivity
5. Ensure all dependencies are installed

## 🔒 Security Notes

For production deployment:
- Change default MongoDB credentials
- Use environment variables for secrets
- Enable HTTPS
- Implement rate limiting
- Add authentication if handling sensitive data
- Sanitize user inputs
- Keep dependencies updated

## 📊 Performance Tips

- Enable MongoDB indexing (already configured)
- Use pagination for large datasets (implemented)
- Implement caching for frequently accessed data
- Compress API responses (compression middleware included)
- Optimize images and assets
- Use CDN for static files in production

---

**Happy Developing! 🚀🇳🇵**

For detailed information, see README.md
For setup help, see SETUP.md
For scraper configuration, see SCRAPER_GUIDE.md
