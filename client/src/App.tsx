import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import PartyStandings from './components/PartyStandings';
import ProvinceView from './components/ProvinceView';
import LiveUpdates from './components/LiveUpdates';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <div className="container">
            <h1>🇳🇵 Nepal Election Results 2082</h1>
            <nav className="main-nav">
              <Link to="/">Dashboard</Link>
              <Link to="/parties">Party Standings</Link>
              <Link to="/provinces">Provinces</Link>
              <Link to="/updates">Live Updates</Link>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/parties" element={<PartyStandings />} />
            <Route path="/provinces" element={<ProvinceView />} />
            <Route path="/updates" element={<LiveUpdates />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <div className="container">
            <p>
              Data sources: 
              <a href="https://result.election.gov.np/" target="_blank" rel="noopener noreferrer">Official Election Commission</a>,
              <a href="https://election.ekantipur.com/?lng=eng" target="_blank" rel="noopener noreferrer">Ekantipur</a>,
              <a href="https://election.onlinekhabar.com/" target="_blank" rel="noopener noreferrer">OnlineKhabar</a>
            </p>
            <p>Built with MERN + TypeScript | Real-time updates via WebSocket</p>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
