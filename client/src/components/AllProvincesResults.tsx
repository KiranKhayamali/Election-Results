import React, { useState, useEffect } from 'react';
import { getAllProvincesResults } from '../services/api';
import { useSocket } from '../hooks/useSocket';
import './AllProvincesResults.css';

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
  leadingCandidate: LeadingCandidate;
  totalVoters: number;
  votesCast: number;
  counting_status: string;
}

interface TopCandidate {
  candidateName: string;
  partyName: string;
  votes: number;
  constituentName: string;
}

interface ProvinceData {
  provinceNumber: number;
  provinceName: string;
  totalConstituencies: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  constituencies: Constituency[];
  topCandidates: TopCandidate[];
  allCandidatesCount: number;
}

interface AllProvincesData {
  provinces: ProvinceData[];
  totalProvinces: number;
  lastUpdated: string;
}

const AllProvincesResults: React.FC = () => {
  const [provincesData, setProvincesData] = useState<ProvinceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedProvince, setExpandedProvince] = useState<number | null>(null);
  const { isConnected } = useSocket();

  const fetchAllProvincesResults = async () => {
    try {
      setLoading(true);
      const data = await getAllProvincesResults();
      setProvincesData(data.provinces);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch provinces data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProvincesResults();
  }, []);

  // Listen for live updates
  useEffect(() => {
    if (isConnected) {
      fetchAllProvincesResults();
    }
  }, [isConnected]);

  if (loading) {
    return (
      <div className="all-provinces-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading all provinces results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="all-provinces-container">
        <div className="error">
          <p>Error: {error}</p>
          <button onClick={fetchAllProvincesResults}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="all-provinces-container">
      <div className="provinces-header">
        <h1>All Provinces Results</h1>
        <div className="header-meta">
          <span className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '● Live' : '○ Offline'}
          </span>
          <span className="province-count">{provincesData.length} Provinces</span>
        </div>
      </div>

      <div className="provinces-grid">
        {provincesData.map((province) => (
          <div key={province.provinceNumber} className="province-card">
            <div
              className="province-header"
              onClick={() =>
                setExpandedProvince(
                  expandedProvince === province.provinceNumber ? null : province.provinceNumber
                )
              }
            >
              <div className="province-title">
                <h2>{province.provinceName}</h2>
                <span className="province-number">Province {province.provinceNumber}</span>
              </div>
              <div className="province-stats-compact">
                <div className="stat">
                  <span className="stat-value">{province.totalConstituencies}</span>
                  <span className="stat-label">Total</span>
                </div>
                <div className="stat completed">
                  <span className="stat-value">{province.completedCount}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="stat in-progress">
                  <span className="stat-value">{province.inProgressCount}</span>
                  <span className="stat-label">In Progress</span>
                </div>
              </div>
              <div className="expand-icon">{expandedProvince === province.provinceNumber ? '▼' : '▶'}</div>
            </div>

            {expandedProvince === province.provinceNumber && (
              <div className="province-details">
                {/* Top Candidates Section */}
                <div className="top-candidates-section">
                  <h3>Top Candidates</h3>
                  <div className="candidates-list">
                    {province.topCandidates.slice(0, 5).map((candidate, idx) => (
                      <div key={idx} className="top-candidate-item">
                        <div className="rank-badge">{idx + 1}</div>
                        <div className="candidate-info">
                          <div className="candidate-name">{candidate.candidateName}</div>
                          <div className="candidate-meta">
                            <span className="party-name">{candidate.partyName}</span>
                            <span className="votes">{Number(candidate.votes).toLocaleString()} votes</span>
                          </div>
                          <div className="constituency">{candidate.constituentName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Constituencies Section */}
                <div className="constituencies-section">
                  <h3>All Constituencies ({province.constituencies.length})</h3>
                  <div className="constituencies-list">
                    {province.constituencies.map((constituency) => (
                      <div key={constituency.constituencyNumber} className="constituency-item">
                        <div className="constituency-header">
                          <div className="constituency-info">
                            <div className="constituency-name">
                              {constituency.constituencyNumber}. {constituency.constituencyName}
                            </div>
                            <div className={`status-badge ${constituency.counting_status.toLowerCase()}`}>
                              {constituency.counting_status}
                            </div>
                          </div>
                        </div>

                        {constituency.leadingCandidate && (
                          <div className="leading-detail">
                            <div className="leading-candidate">
                              <div className="candidate-header">
                                <span className="leading-label">Leading</span>
                                <div className="candidate-name-votes">
                                  <span className="name">{constituency.leadingCandidate.candidateName}</span>
                                  <span className="party" style={{ color: constituency.leadingCandidate.partyColor }}>
                                    {constituency.leadingCandidate.partyName}
                                  </span>
                                </div>
                              </div>
                              <div className="vote-stats">
                                <div className="votes-received">
                                  <span className="votes-number">{Number(constituency.leadingCandidate.votes).toLocaleString()}</span>
                                  <span className="votes-percent">({constituency.leadingCandidate.votesPercentage.toFixed(1)}%)</span>
                                </div>
                              </div>

                              {constituency.leadingCandidate.voteDifference > 0 && (
                                <div className="vote-difference-section">
                                  <div className="difference-label">Leading by</div>
                                  <div className="difference-value">
                                    +{Number(constituency.leadingCandidate.voteDifference).toLocaleString()} votes
                                  </div>
                                </div>
                              )}

                              {constituency.leadingCandidate.secondPlaceName && (
                                <div className="second-place-info">
                                  <div className="second-label">2nd Place</div>
                                  <div className="second-name">{constituency.leadingCandidate.secondPlaceName}</div>
                                  <div className="second-votes">
                                    {Number(constituency.leadingCandidate.secondPlaceVotes).toLocaleString()} votes
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllProvincesResults;
