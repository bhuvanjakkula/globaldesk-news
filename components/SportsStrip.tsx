'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LIVE_GAMES_DATA, LiveGame } from '@/lib/sports';

export default function SportsStrip() {
  const [games, setGames] = useState<LiveGame[]>(LIVE_GAMES_DATA);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [clockTick, setClockTick] = useState(0);

  // Dynamic live game ticker rotation
  useEffect(() => {
    const timer = setInterval(() => {
      setClockTick((prev) => prev + 1);
    }, 15000); // cycle or refresh state
    return () => clearInterval(timer);
  }, []);

  const filtered = activeTab === 'all'
    ? games
    : games.filter((g) => g.sport === activeTab);

  return (
    <section className="sports-strip-container" aria-label="Live Sports Scoreboard">
      <div className="sports-strip-header">
        <div className="sports-strip-brand">
          <span className="sports-live-dot" />
          <strong className="sports-strip-title">WORLD SPORTS RADAR</strong>
          <span className="sports-strip-subtitle">TODAY'S MAIN GAMES &amp; CHAMPIONSHIPS</span>
        </div>
        <div className="sports-strip-tabs">
          {[
            { id: 'all', label: 'All Games' },
            { id: 'football', label: '⚽ Football' },
            { id: 'basketball', label: '🏀 NBA' },
            { id: 'motorsport', label: '🏎️ F1' },
            { id: 'tennis', label: '🎾 Tennis' },
            { id: 'cricket', label: '🏏 Cricket' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`sports-tab-btn ${activeTab === tab.id ? 'is-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
          <Link href="/sports" className="sports-full-link">
            Full Sports Center ↗
          </Link>
        </div>
      </div>

      <div className="sports-ticker-track">
        {filtered.map((game) => (
          <div key={game.id} className={`sports-game-card ${game.hot ? 'is-hot' : ''}`}>
            <div className="game-card-meta">
              <span className="game-league-pill">{game.league}</span>
              <span className={`game-status-pill status-${game.status.toLowerCase()}`}>
                {game.status === 'LIVE' ? (
                  <>
                    <span className="live-pulse" /> {game.clock}
                  </>
                ) : (
                  game.clock
                )}
              </span>
            </div>
            <div className="game-matchup">
              <div className="game-team">
                <span className="team-name">{game.homeTeam}</span>
                <span className="team-score">{game.homeScore}</span>
              </div>
              <div className="game-team">
                <span className="team-name">{game.awayTeam}</span>
                <span className="team-score">{game.awayScore}</span>
              </div>
            </div>
            <div className="game-card-footer">
              <span className="game-detail">{game.periodOrDetail}</span>
              <Link href={`/sports?game=${game.id}`} className="game-coverage-link">
                Analysis ↗
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
