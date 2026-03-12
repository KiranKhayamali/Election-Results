import React, { useEffect, useState } from 'react';
import { getAllProvincesResults } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import './ProvinceView.css';

interface LeadingCandidate {
  candidateName: string;
  partyName: string;
  partyColor: string;
  votes: number;
  votesPercentage: number;
  voteDifference: number;
  secondPlaceName: string;
  secondPlaceVotes: number;
  constituentName: string;
}

interface Constituency {
  constituencyNumber: number;
  constituencyName: string;
  leadingCandidate?: LeadingCandidate;
  totalVoters: number;
  votesCast: number;
  countingStatus: string;
}

interface Province {
  provinceNumber: number;
  provinceName: string;
  totalConstituencies: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  constituencies: Constituency[];
}

// Normalize API payloads from multiple backend shapes into one UI-safe structure.
const normalizeProvinces = (rawProvinces: any[] = []): Province[] => {
  return rawProvinces.map((province: any) => ({
    provinceNumber: Number(province?.provinceNumber) || 0,
    provinceName: province?.provinceName || 'Unknown Province',
    totalConstituencies: Number(province?.totalConstituencies) || 0,
    completedCount: Number(province?.completedCount) || 0,
    inProgressCount: Number(province?.inProgressCount) || 0,
    notStartedCount: Number(province?.notStartedCount) || 0,
    constituencies: (province?.constituencies || []).map((c: any) => ({
      constituencyNumber: Number(c?.constituencyNumber) || 0,
      constituencyName: c?.constituencyName || c?.constituency || 'Unknown Constituency',
      countingStatus: c?.countingStatus || c?.counting_status || 'not-started',
      totalVoters: Number(c?.totalVoters) || 0,
      votesCast: Number(c?.votesCast) || Number(c?.totalVotesCast) || 0,
      leadingCandidate: c?.leadingCandidate
        ? {
            candidateName: c.leadingCandidate.candidateName || 'Unknown',
            partyName: c.leadingCandidate.partyName || 'Unknown',
            partyColor: c.leadingCandidate.partyColor || '#667eea',
            votes: Number(c.leadingCandidate.votes) || 0,
            votesPercentage: Number(c.leadingCandidate.votesPercentage) || 0,
            voteDifference: Number(c.leadingCandidate.voteDifference) || 0,
            secondPlaceName: c.leadingCandidate.secondPlaceName || '',
            secondPlaceVotes: Number(c.leadingCandidate.secondPlaceVotes) || 0,
            constituentName: c.leadingCandidate.constituentName || ''
          }
        : c?.leadingCandidate || c?.leadingCandidateName || c?.leadingParty
        ? {
            candidateName: c?.leadingCandidate || c?.leadingCandidateName || 'Unknown',
            partyName: c?.leadingParty || 'Unknown',
            partyColor: c?.partyColor || '#667eea',
            votes: Number(c?.leadingVotes) || 0,
            votesPercentage: Number(c?.votesPercentage) || 0,
            voteDifference: Number(c?.voteDifference) || 0,
            secondPlaceName: c?.secondPlaceCandidate || '',
            secondPlaceVotes: Number(c?.secondPlaceVotes) || 0,
            constituentName: c?.constituency || c?.constituencyName || ''
          }
        : undefined
    }))
  }));
};

const ProvinceView: React.FC = () => {
  const [provincesData, setProvincesData] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProvince, setExpandedProvince] = useState<number | null>(null);
  const { socket, isConnected } = useSocket();

  const fetchAllProvincesData = async () => {
    try {
      setLoading(true);
      const data = await getAllProvincesResults();
      const normalizedProvinces = normalizeProvinces(data?.provinces);
      setProvincesData(normalizedProvinces);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch provinces data';
      setError(errorMessage);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProvincesData();
  }, []);

  // Listen for live updates
  useEffect(() => {
    if (socket) {
      socket.on('data-update', () => {
        console.log('📡 Received province data update');
        fetchAllProvincesData();
      });

      return () => {
        socket.off('data-update');
      };
    }
  }, [socket]);

  const getStatusColor = (status: string): string => {
    const statusLower = String(status || 'not-started').toLowerCase();
    if (statusLower.includes('completed')) return '#4caf50';
    if (statusLower.includes('progress')) return '#ff9800';
    return '#999';
  };

  if (loading) {
    return (
      <div className="province-view">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading all provinces results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="province-view">
        <div className="error-container">
          <p className="error-message">Error: {error}</p>
          <button className="retry-btn" onClick={fetchAllProvincesData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="province-view">
      <div className="province-header-section">
        <h1>All Provinces Results</h1>
        <div className="header-stats">
          <span className="total-provinces">
            {provincesData.length} Provinces
          </span>
          <span className={`connection-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Live Updates' : '🔴 Offline'}
          </span>
        </div>
      </div>

      <div className="provinces-container">
        {provincesData.map((province) => {
          const isExpanded = expandedProvince === province.provinceNumber;

          return (
            <div key={province.provinceNumber} className="province-section">
              <div
                className={`province-title ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpandedProvince(isExpanded ? null : province.provinceNumber)}
              >
                <div className="title-content">
                  <h2>{province.provinceName}</h2>
                  <span className="province-number">Province {province.provinceNumber}</span>
                </div>

                <div className="province-stats">
                  <div className="stat-box">
                    <span className="stat-label">Total</span>
                    <span className="stat-value">{province.totalConstituencies}</span>
                  </div>
                  <div className="stat-box completed">
                    <span className="stat-label">Completed</span>
                    <span className="stat-value">{province.completedCount}</span>
                  </div>
                  <div className="stat-box in-progress">
                    <span className="stat-label">In Progress</span>
                    <span className="stat-value">{province.inProgressCount}</span>
                  </div>
                </div>

                <div className="expand-icon">{isExpanded ? '▼' : '▶'}</div>
              </div>

              {isExpanded && (
                <div className="province-details-section">
                  <div className="constituencies-grid">
                    {province.constituencies.map((constituency) => (
                      <div key={constituency.constituencyNumber} className="constituency-card">
                        <div className="constituency-header">
                          <div className="constituency-title">
                            <span className="const-number">#{constituency.constituencyNumber}</span>
                            <h4>{constituency.constituencyName}</h4>
                          </div>
                          <span
                            className={`status-badge ${String(constituency.countingStatus || 'not-started').toLowerCase()}`}
                            style={{
                              borderColor: getStatusColor(constituency.countingStatus),
                              color: getStatusColor(constituency.countingStatus)
                            }}
                          >
                            {constituency.countingStatus || 'not-started'}
                          </span>
                        </div>

                        {constituency.leadingCandidate ? (
                          <div className="leading-section">
                            <div className="leading-label">Leading</div>
                            <div className="candidate-info">
                              <h5>{constituency.leadingCandidate.candidateName}</h5>
                              <div
                                className="party-badge"
                                style={{
                                  backgroundColor: constituency.leadingCandidate.partyColor || '#667eea'
                                }}
                              >
                                {constituency.leadingCandidate.partyName}
                              </div>
                            </div>

                            <div className="vote-details">
                              <div className="votes-box">
                                <span className="vote-label">Votes</span>
                                <span className="vote-number">
                                  {Number(constituency.leadingCandidate.votes).toLocaleString()}
                                </span>
                                <span className="vote-percent">
                                  ({constituency.leadingCandidate.votesPercentage.toFixed(1)}%)
                                </span>
                              </div>

                              {constituency.leadingCandidate.voteDifference > 0 && (
                                <div className="vote-difference">
                                  <span className="label">Margin</span>
                                  <span className="value">
                                    +{Number(constituency.leadingCandidate.voteDifference).toLocaleString()} 
                                  </span>
                                </div>
                              )}
                            </div>

                            {constituency.leadingCandidate.secondPlaceName && (
                              <div className="second-place">
                                <div className="second-label">2nd Place</div>
                                <div className="second-name">{constituency.leadingCandidate.secondPlaceName}</div>
                                <div className="second-votes">
                                  {Number(constituency.leadingCandidate.secondPlaceVotes).toLocaleString()} votes
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="no-candidate-data">
                            <div className="no-data-title">Candidate data not available yet</div>
                            <div className="no-data-subtitle">
                              This constituency is listed, but source pages have not published a candidate table.
                            </div>
                          </div>
                        )}

                        <div className="constituency-stats">
                          <div className="stat-item">
                            <span className="stat-label">Voters</span>
                            <span className="stat-value">
                              {Number(constituency.totalVoters).toLocaleString()}
                            </span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Cast</span>
                            <span className="stat-value">
                              {Number(constituency.votesCast).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProvinceView;
