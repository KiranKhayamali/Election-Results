import React, { useEffect, useState } from 'react';
import { getLeadingCandidates } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import './LiveUpdates.css';

interface LeadingCandidate {
  _id: string;
  name: string;
  party: any;
  constituency: any;
  votesReceived: number;
  votePercentage: number;
  voteDifference: number;
  secondPlaceVotes: number;
  secondPlaceName: string;
  status: string;
}

const LiveUpdates: React.FC = () => {
  const [candidates, setCandidates] = useState<LeadingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected } = useSocket();

  const fetchTopCandidates = async () => {
    try {
      setLoading(true);
      const data = await getLeadingCandidates();
      setCandidates(data.candidates || []);
    } catch (error) {
      console.error('Failed to fetch candidates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopCandidates();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('data-update', () => {
        console.log('📡 New update received');
        fetchTopCandidates();
      });

      return () => {
        socket.off('data-update');
      };
    }
  }, [socket]);

  const getPartyColor = (party: any) => {
    if (typeof party === 'object' && party?.color) {
      return party.color || '#667eea';
    }
    return '#667eea';
  };

  const getPartyName = (party: any) => {
    if (typeof party === 'object' && party?.name) {
      return party.name;
    }
    return 'Unknown Party';
  };

  const getConstituencyName = (constituency: any) => {
    if (typeof constituency === 'object' && constituency?.name) {
      return constituency.name;
    }
    return 'Unknown';
  };

  const generateAvatarColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="live-updates">
      <div className="updates-header">
        <div>
          <h1>Popular Candidates</h1>
          <p className="subtitle">Top leading candidates across constituencies</p>
        </div>
        <div className="live-indicator">
          {isConnected ? (
            <span className="pulse">🔴 LIVE</span>
          ) : (
            <span>⚫ Offline</span>
          )}
        </div>
      </div>

      {loading && <div className="loading">Loading candidates...</div>}

      <div className="candidates-grid">
        {candidates.map((candidate, index) => (
          <div key={candidate._id} className="candidate-card">
            <div className="card-header">
              <div className="rank-badge">#{index + 1}</div>
              <div 
                className="candidate-avatar" 
                style={{ backgroundColor: generateAvatarColor(candidate.name) }}
              >
                <span className="avatar-initials">
                  {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                </span>
              </div>
            </div>
            
            <div className="candidate-info">
              <h3 className="candidate-name">{candidate.name}</h3>
              
              <p className="constituency-info">
                📍 {getConstituencyName(candidate.constituency)}
              </p>
              
              <div 
                className="party-badge"
                style={{ backgroundColor: getPartyColor(candidate.party) }}
              >
                {getPartyName(candidate.party)}
              </div>
              
              <div className="votes-section">
                <div className="vote-display">
                  <span className="votes-label">Votes Received</span>
                  <span className="votes-count">{candidate.votesReceived.toLocaleString()}</span>
                  <span className="vote-percent">{candidate.votePercentage.toFixed(2)}%</span>
                </div>
              </div>

              <div className="vote-difference-section">
                <div className="leading-badge">
                  <span className="icon">🥇</span>
                  <span className="text">LEADING</span>
                </div>
                <div className="vote-diff-display">
                  <div className="diff-label">Leading by</div>
                  <div className="diff-value">+{candidate.voteDifference.toLocaleString()}</div>
                </div>
              </div>

              {candidate.secondPlaceName !== 'N/A' && (
                <div className="second-place-info">
                  <div className="second-label">vs. 2nd Place</div>
                  <div className="second-details">
                    <span className="second-name">{candidate.secondPlaceName}</span>
                    <span className="second-votes">{candidate.secondPlaceVotes.toLocaleString()} votes</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {candidates.length === 0 && !loading && (
        <div className="no-updates">No leading candidates available</div>
      )}
    </div>
  );
};

export default LiveUpdates;

