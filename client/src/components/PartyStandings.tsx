import React, { useEffect, useState } from 'react';
import { getPartyStandings } from '../services/api';
import { PartyStanding } from '../types';
import './PartyStandings.css';

const PartyStandings: React.FC = () => {
  const [standings, setStandings] = useState<PartyStanding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const data = await getPartyStandings();
        setStandings(data.standings);
      } catch (error) {
        console.error('Failed to fetch party standings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStandings();
  }, []);

  if (loading) {
    return <div className="loading">Loading party standings...</div>;
  }

  const majoritySeats = 83; // 165/2 + 1

  return (
    <div className="party-standings">
      <h1>Party Standings</h1>
      <p className="majority-info">Majority: {majoritySeats} seats</p>

      <div className="standings-grid">
        {standings.map((party) => {
          const totalSeats = party.seatsWon + party.seatsLeading;
          const percentToMajority = (totalSeats / majoritySeats) * 100;

          return (
            <div key={party._id} className="party-card">
              <div className="party-header" style={{ borderLeftColor: party.color }}>
                <h3>{party.name}</h3>
                {party.nameNepali && <p className="nepali-name">{party.nameNepali}</p>}
              </div>
              
              <div className="party-seats">
                <div className="seat-box won">
                  <span className="seat-number">{party.seatsWon}</span>
                  <span className="seat-label">Won</span>
                </div>
                <div className="seat-box leading">
                  <span className="seat-number">{party.seatsLeading}</span>
                  <span className="seat-label">Leading</span>
                </div>
                <div className="seat-box total">
                  <span className="seat-number">{totalSeats}</span>
                  <span className="seat-label">Total</span>
                </div>
              </div>

              {party.totalVotes > 0 && (
                <div className="vote-info">
                  <p>Total Votes: {party.totalVotes.toLocaleString()}</p>
                  {party.votePercentage > 0 && (
                    <p>Vote Share: {party.votePercentage.toFixed(2)}%</p>
                  )}
                </div>
              )}

              {totalSeats > 0 && (
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${Math.min(percentToMajority, 100)}%`,
                      backgroundColor: party.color 
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PartyStandings;
