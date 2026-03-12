import React, { useEffect, useState } from 'react';
import { getElectionOverview } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import { OverviewData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const data = await getElectionOverview();
      setOverview(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch election data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('data-update', () => {
        console.log('📡 Received data update');
        fetchOverview();
      });

      return () => {
        socket.off('data-update');
      };
    }
  }, [socket]);

  if (loading) {
    return <div className="loading">Loading election results...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!overview) {
    return <div className="no-data">No data available</div>;
  }

  const chartData = overview.parties.slice(0, 10).map(party => ({
    name: party.shortName || party.name,
    won: party.seatsWon,
    leading: party.seatsLeading
  }));

  return (
    <div className="dashboard">
      <div className="connection-status">
        {isConnected ? (
          <span className="connected">🟢 Live Updates Active</span>
        ) : (
          <span className="disconnected">🔴 Disconnected</span>
        )}
      </div>

      <div className="summary-cards">
        <div className="card">
          <h3>Total Constituencies</h3>
          <p className="big-number">{overview.summary.totalConstituencies}</p>
        </div>
        <div className="card">
          <h3>Results Declared</h3>
          <p className="big-number">{overview.summary.completedConstituencies}</p>
        </div>
        <div className="card">
          <h3>Counting in Progress</h3>
          <p className="big-number">{overview.summary.countingInProgress}</p>
        </div>
        <div className="card">
          <h3>Total Candidates</h3>
          <p className="big-number">{overview.summary.totalCandidates}</p>
        </div>
      </div>

      <div className="chart-section">
        <h2>Top 10 Parties - Seat Distribution</h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="won" fill="#4CAF50" name="Seats Won" />
            <Bar dataKey="leading" fill="#2196F3" name="Leading" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="party-table">
        <h2>Party Standings - Live Results</h2>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Party</th>
              <th>Seats Won</th>
              <th>Leading</th>
              <th>Total Seats</th>
              <th>Total Votes</th>
              <th>Vote %</th>
            </tr>
          </thead>
          <tbody>
            {overview.parties.map((party, index) => {
              const leadParty = overview.parties[0];
              const voteDiff = index > 0 ? leadParty.totalVotes - party.totalVotes : 0;
              const isLeading = index === 0;
              
              return (
                <tr key={party._id} className={isLeading ? 'leading-party' : ''}>
                  <td className="rank-cell">{isLeading ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</td>
                  <td>
                    <div className="party-info">
                      <span className="party-color" style={{ backgroundColor: party.color }}></span>
                      <span className={isLeading ? 'leading-text' : ''}>{party.name}</span>
                    </div>
                  </td>
                  <td className="seats-won">{party.seatsWon}</td>
                  <td className="seats-leading">{party.seatsLeading}</td>
                  <td className="seats-total">
                    <strong>{party.seatsWon + party.seatsLeading}</strong>
                  </td>
                  <td className="votes-total">
                    {party.totalVotes.toLocaleString('en-US')}
                    {voteDiff > 0 && (
                      <span className="vote-diff"> (-{voteDiff.toLocaleString('en-US')})</span>
                    )}
                  </td>
                  <td className="vote-percentage">
                    <span className={isLeading ? 'leading-percent' : ''}>{party.votePercentage.toFixed(2)}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="last-updated">
        Last updated: {new Date(overview.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
};

export default Dashboard;
