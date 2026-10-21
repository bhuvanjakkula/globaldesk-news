'use client';
import { useState } from 'react';
import { LIVE_GAMES_DATA, LiveGame } from '@/lib/sports';

export default function SportsScoreboard() {
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [games] = useState<LiveGame[]>(LIVE_GAMES_DATA);

  const sportsList = [
    { id: 'all', name: 'All Major Games', count: games.length },
    { id: 'football', name: 'Football / Soccer', count: games.filter((g) => g.sport === 'football').length },
    { id: 'basketball', name: 'Basketball / NBA', count: games.filter((g) => g.sport === 'basketball').length },
    { id: 'motorsport', name: 'Formula 1 & Racing', count: games.filter((g) => g.sport === 'motorsport').length },
    { id: 'nfl', name: 'American Football / NFL', count: games.filter((g) => g.sport === 'nfl').length },
    { id: 'tennis', name: 'ATP / WTA Tennis', count: games.filter((g) => g.sport === 'tennis').length },
    { id: 'cricket', name: 'ICC Cricket Championship', count: games.filter((g) => g.sport === 'cricket').length },
  ];

  const displayedGames = selectedSport === 'all'
    ? games
    : games.filter((g) => g.sport === selectedSport);

  return (
    <div className="sports-scoreboard-wrap">
      <div className="scoreboard-tabs-bar">
        {sportsList.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedSport(s.id)}
            className={`scoreboard-tab ${selectedSport === s.id ? 'is-active' : ''}`}
          >
            <span>{s.name}</span>
            <small className="tab-count">{s.count}</small>
          </button>
        ))}
      </div>

      <div className="scoreboard-grid">
        {displayedGames.map((game) => (
          <div key={game.id} className="scoreboard-match-card">
            <div className="match-card-top">
              <span className="match-league-badge">{game.league}</span>
              <span className={`match-status-badge status-${game.status.toLowerCase()}`}>
                {game.status === 'LIVE' && <span className="status-live-beacon" />}
                {game.clock}
              </span>
            </div>

            <div className="match-card-teams">
              <div className="match-team-row">
                <span className="match-team-title">{game.homeTeam}</span>
                <span className="match-team-points">{game.homeScore}</span>
              </div>
              <div className="match-team-row">
                <span className="match-team-title">{game.awayTeam}</span>
                <span className="match-team-points">{game.awayScore}</span>
              </div>
            </div>

            <div className="match-card-bottom">
              <span className="match-detail-text">📍 {game.venue} · {game.periodOrDetail}</span>
              <span className="match-wire-badge">ESPN &amp; BBC SPORT VERIFIED</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
