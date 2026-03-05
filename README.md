# 🇳🇵 Nepal Election Results 2082 - Live Tracker

A full-stack MERN application with TypeScript for tracking Nepal's 2082 election results in real-time. The application aggregates data from multiple sources including the official Election Commission website, Ekantipur, and OnlineKhabar.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![Node](https://img.shields.io/badge/Node-20+-green)
![React](https://img.shields.io/badge/React-18.2-blue)

## ✨ Features

### 🎯 Core Features
- **Real-time Updates**: WebSocket integration for live election result updates
- **Multi-Source Data Aggregation**: Primary source from official Election Commission, secondary sources from Ekantipur and OnlineKhabar
- **Comprehensive Dashboard**: Overview of election statistics, party standings, and constituency results
- **Province-wise Results**: Detailed breakdown by all 7 provinces
- **Live Update Feed**: Timeline of election updates with source verification
- **Responsive Design**: Mobile-friendly interface for all devices

### 📊 Data Features
- Party seat distribution (won and leading)
- Constituency-wise results
- Candidate tracking with vote counts
- Source cross-referencing and verification
- Historical update tracking

## 🏗️ Tech Stack

### Backend
- **Node.js** & **Express** - Server framework
- **TypeScript** - Type safety
- **MongoDB** with **Mongoose** - Database
- **Socket.io** - Real-time communication
- **Axios** & **Cheerio** - Web scraping
- **Node-cron** - Scheduled data updates

### Frontend
- **React** with **TypeScript** - UI framework
- **React Router** - Navigation
- **Socket.io-client** - Real-time updates
- **Recharts** - Data visualization
- **Axios** - HTTP client

## 📁 Project Structure

```
Election Result/
├── server/                      # Backend TypeScript code
│   ├── controllers/             # Route controllers
│   │   ├── electionController.ts
│   │   ├── partyController.ts
│   │   ├── constituencyController.ts
│   │   └── candidateController.ts
│   ├── models/                  # Mongoose models
│   │   ├── Party.ts
│   │   ├── Constituency.ts
│   │   ├── Candidate.ts
│   │   └── ElectionUpdate.ts
│   ├── routes/                  # API routes
│   │   ├── electionRoutes.ts
│   │   ├── partyRoutes.ts
│   │   ├── constituencyRoutes.ts
│   │   └── candidateRoutes.ts
│   ├── services/                # Business logic
│   │   ├── aggregationService.ts
│   │   └── scrapers/
│   │       ├── officialScraper.ts
│   │       ├── ekantipurScraper.ts
│   │       └── onlinekhabarScraper.ts
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts
│   └── index.ts                 # Entry point
├── client/                      # React TypeScript frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── PartyStandings.tsx
│   │   │   ├── ProvinceView.tsx
│   │   │   └── LiveUpdates.tsx
│   │   ├── services/            # API services
│   │   │   └── api.ts
│   │   ├── hooks/               # Custom hooks
│   │   │   └── useSocket.ts
│   │   ├── types/               # TypeScript types
│   │   │   └── index.ts
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "Election Result"
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/nepal-election
   PRIMARY_SOURCE_URL=https://result.election.gov.np/
   EKANTIPUR_URL=https://election.ekantipur.com/?lng=eng
   ONLINEKHABAR_URL=https://election.onlinekhabar.com/
   POLLING_INTERVAL=300000
   CLIENT_URL=http://localhost:3000
   ```

5. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

### Running the Application

**Development Mode (recommended):**
```bash
# From root directory - runs both backend and frontend
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend development server on http://localhost:3000

**Alternatively, run separately:**

Backend:
```bash
npm run server
```

Frontend:
```bash
npm run client
```

### Building for Production

```bash
# Build backend
npm run build:server

# Build frontend
cd client
npm run build

# Start production server
npm start
```

## 📡 API Endpoints

### Elections
- `GET /api/elections/overview` - Overall election statistics
- `GET /api/elections/updates` - Recent updates (query: limit, skip, source)
- `GET /api/elections/province/:provinceNumber` - Province-specific results
- `POST /api/elections/refresh` - Manually trigger data refresh

### Parties
- `GET /api/parties` - All parties
- `GET /api/parties/standings` - Party standings (sorted by seats)
- `GET /api/parties/:id` - Specific party details

### Constituencies
- `GET /api/constituencies` - All constituencies
- `GET /api/constituencies/province/:provinceNumber` - By province
- `GET /api/constituencies/:id` - Specific constituency
- `GET /api/constituencies/:id/results` - Constituency results with candidates

### Candidates
- `GET /api/candidates` - All candidates (query: limit, skip)
- `GET /api/candidates/search?q=name` - Search candidates
- `GET /api/candidates/party/:partyId` - Candidates by party
- `GET /api/candidates/constituency/:constituencyId` - Candidates by constituency
- `GET /api/candidates/:id` - Specific candidate

## 🔌 WebSocket Events

### Server → Client
- `data-update` - New data available from a source
- `aggregation-complete` - Data aggregation cycle completed

### Client → Server
- `subscribe` - Subscribe to updates (payload: `{ channel: 'election-updates' }`)

## 🎨 Features Overview

### Dashboard
- Real-time connection status
- Summary cards (constituencies, results, candidates)
- Top 10 parties bar chart
- Complete party standings table

### Party Standings
- Visual seat distribution cards
- Progress bars toward majority (83 seats)
- Vote counts and percentages
- Bilingual party names (English/Nepali)

### Province View
- Interactive province selector
- Constituency-wise breakdown
- Voter turnout statistics
- Leading candidate information

### Live Updates
- Source-filtered update feed
- Verified badge for official sources
- Real-time update notifications
- Timestamp for each update

## 🔧 Configuration

### Data Scraping
The application uses web scraping to aggregate data. **Important:** You'll need to inspect the actual HTML structure of the source websites and update the selectors in:
- `server/services/scrapers/officialScraper.ts`
- `server/services/scrapers/ekantipurScraper.ts`
- `server/services/scrapers/onlinekhabarScraper.ts`

### Polling Interval
Modify `POLLING_INTERVAL` in `.env` (milliseconds):
- 300000 = 5 minutes (default)
- 180000 = 3 minutes
- 600000 = 10 minutes

## 🛠️ Development

### Available Scripts

**Backend:**
- `npm run server` - Start development server with nodemon
- `npm run build:server` - Compile TypeScript to JavaScript
- `npm start` - Run compiled production code

**Frontend:**
- `npm run client` - Start React development server
- `cd client && npm start` - Alternative frontend start
- `cd client && npm run build` - Build for production

**Combined:**
- `npm run dev` - Run both backend and frontend concurrently
- `npm run install-all` - Install all dependencies

### TypeScript Configuration
- Backend: `tsconfig.json` (compiles to `dist/`)
- Frontend: `client/tsconfig.json` (React app config)

## 📝 Data Models

### Party
```typescript
{
  name: string;
  nameNepali?: string;
  shortName?: string;
  seatsWon: number;
  seatsLeading: number;
  totalVotes: number;
  sources: Source[];
}
```

### Constituency
```typescript
{
  name: string;
  constituencyNumber: number;
  province: string;
  provinceNumber: number;
  totalVoters: number;
  countingStatus: 'not-started' | 'in-progress' | 'completed';
}
```

### Candidate
```typescript
{
  name: string;
  party: ObjectId;
  constituency: ObjectId;
  votesReceived: number;
  status: 'leading' | 'won' | 'lost' | 'counting';
}
```

## 🔐 Security Considerations
- Uses Helmet for security headers
- CORS configuration for client-server communication
- Input sanitization recommended for production
- Rate limiting recommended for API endpoints

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check `MONGODB_URI` in `.env`

**WebSocket Not Connecting:**
- Verify `CLIENT_URL` in backend `.env`
- Check CORS configuration
- Ensure both servers are running

**Data Not Updating:**
- Check scraper console logs
- Verify source website accessibility
- Update HTML selectors if website structure changed

## 📄 License
MIT License - feel free to use this project for any purpose.

## 🤝 Contributing
Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support
For issues and questions:
- Open an issue on GitHub
- Check existing issues for solutions

## 🙏 Acknowledgments
- Election Commission of Nepal for official data
- Ekantipur and OnlineKhabar for secondary sources
- Inspired by nepalelection.chat

---

**Built with ❤️ for Nepal's democratic process**
