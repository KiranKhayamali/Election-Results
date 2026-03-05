# Setup Guide

## Prerequisites Installation

### 1. Install Node.js
Download and install Node.js (v18 or higher) from https://nodejs.org/

Verify installation:
```bash
node --version
npm --version
```

### 2. Install MongoDB

**Option A: Local MongoDB**
- Download from https://www.mongodb.com/try/download/community
- Install MongoDB Community Server
- Start MongoDB service

**Option B: MongoDB Atlas (Cloud)**
- Sign up at https://www.mongodb.com/cloud/atlas
- Create a free cluster
- Get connection string

### 3. Install Git (if not already installed)
Download from https://git-scm.com/

## Project Setup

### Step 1: Download/Clone Project
```bash
cd "c:\Users\kiran\OneDrive\Desktop\Free Work\Election\Election Result"
```

### Step 2: Install Backend Dependencies
```bash
npm install
```

Expected output: All dependencies installed successfully

### Step 3: Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```

### Step 4: Configure Environment Variables
```bash
# Copy example environment file
copy .env.example .env
```

Edit `.env` file with your settings:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/nepal-election
# For MongoDB Atlas, use: mongodb+srv://username:password@cluster.mongodb.net/nepal-election

PRIMARY_SOURCE_URL=https://result.election.gov.np/
EKANTIPUR_URL=https://election.ekantipur.com/?lng=eng
ONLINEKHABAR_URL=https://election.onlinekhabar.com/

POLLING_INTERVAL=300000
CLIENT_URL=http://localhost:3000
```

### Step 5: Start MongoDB
```bash
# If using local MongoDB
mongod

# If using MongoDB Atlas, no action needed
```

### Step 6: Run the Application

**Option A: Run Everything (Recommended)**
```bash
npm run dev
```

This starts:
- Backend on http://localhost:5000
- Frontend on http://localhost:3000

**Option B: Run Separately**

Terminal 1 - Backend:
```bash
npm run server
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

### Step 7: Access the Application
Open browser and navigate to:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Verification Checklist

✅ Node.js installed (v18+)
✅ MongoDB running
✅ Backend dependencies installed
✅ Frontend dependencies installed
✅ .env file configured
✅ Backend server running (port 5000)
✅ Frontend app running (port 3000)
✅ Can access http://localhost:3000

## Common Issues

### Port Already in Use
If port 5000 or 3000 is already in use:

**Change Backend Port:**
Edit `.env`:
```env
PORT=5001
```

**Change Frontend Proxy:**
Edit `client/package.json`:
```json
"proxy": "http://localhost:5001"
```

### MongoDB Connection Failed
- Ensure MongoDB service is running
- Check connection string in `.env`
- For Atlas, check firewall/IP whitelist

### Dependencies Installation Failed
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules
rm -rf client/node_modules

# Reinstall
npm install
cd client && npm install
```

## Production Deployment

### Build for Production
```bash
# Build backend
npm run build:server

# Build frontend
cd client
npm run build
cd ..
```

### Run Production Build
```bash
# Set environment
set NODE_ENV=production

# Start server
npm start
```

### Deploy to Cloud

**Backend Options:**
- Heroku
- DigitalOcean
- AWS EC2
- Railway

**Frontend Options:**
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront

**Database:**
- MongoDB Atlas (recommended)
- mLab

## Development Tips

1. **Check Logs**: Monitor console output for errors
2. **Database GUI**: Use MongoDB Compass for easier database management
3. **API Testing**: Use Postman or ThunderClient for API testing
4. **Hot Reload**: Both backend and frontend auto-reload on code changes

## Next Steps

1. Update web scraper selectors in `server/services/scrapers/`
2. Customize styling in `client/src/components/*.css`
3. Add authentication if needed
4. Set up production database
5. Configure domain and SSL certificate

## Support

Need help? Check:
- README.md for feature documentation
- Console logs for error messages
- Network tab in browser DevTools
- MongoDB logs

---

Happy coding! 🚀
