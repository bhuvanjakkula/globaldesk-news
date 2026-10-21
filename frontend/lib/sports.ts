/**
 * GlobalDesk Sports Intelligence & Live Games Center
 * Real-time match scores, championship tournaments, and today-only sports wire dispatches.
 * All major sports: Football / Soccer, Basketball (NBA), Formula 1, American Football (NFL), Tennis, Cricket.
 */

export interface LiveGame {
  id: string;
  sport: 'football' | 'basketball' | 'motorsport' | 'nfl' | 'tennis' | 'cricket';
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string | number;
  awayScore: string | number;
  status: 'LIVE' | 'FINAL' | 'UPCOMING';
  clock: string;
  venue: string;
  periodOrDetail: string;
  badge?: string;
  hot?: boolean;
}

export const LIVE_GAMES_DATA: LiveGame[] = [
  // --- FOOTBALL / SOCCER (Champions League / Premier League) ---
  {
    id: 'game-ucl-1',
    sport: 'football',
    league: 'UEFA Champions League',
    homeTeam: 'Real Madrid',
    awayTeam: 'Manchester City',
    homeScore: 2,
    awayScore: 2,
    status: 'LIVE',
    clock: "78'",
    venue: 'Santiago Bernabéu, Madrid',
    periodOrDetail: 'Second Half · Semi-Final Leg 1',
    badge: 'UCL',
    hot: true,
  },
  {
    id: 'game-epl-1',
    sport: 'football',
    league: 'Premier League',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    homeScore: 3,
    awayScore: 1,
    status: 'FINAL',
    clock: "FT",
    venue: 'Emirates Stadium, London',
    periodOrDetail: 'Matchday 31',
    badge: 'EPL',
  },
  {
    id: 'game-epl-2',
    sport: 'football',
    league: 'Premier League',
    homeTeam: 'Liverpool',
    awayTeam: 'Aston Villa',
    homeScore: 1,
    awayScore: 0,
    status: 'LIVE',
    clock: "52'",
    venue: 'Anfield, Liverpool',
    periodOrDetail: 'Second Half · Top 4 Race',
    badge: 'EPL',
    hot: true,
  },

  // --- BASKETBALL / NBA ---
  {
    id: 'game-nba-1',
    sport: 'basketball',
    league: 'NBA Championship',
    homeTeam: 'Boston Celtics',
    awayTeam: 'LA Lakers',
    homeScore: 112,
    awayScore: 108,
    status: 'LIVE',
    clock: 'Q4 02:40',
    venue: 'TD Garden, Boston',
    periodOrDetail: '4th Quarter · Primetime Clash',
    badge: 'NBA',
    hot: true,
  },
  {
    id: 'game-nba-2',
    sport: 'basketball',
    league: 'NBA Championship',
    homeTeam: 'Golden State Warriors',
    awayTeam: 'Denver Nuggets',
    homeScore: 98,
    awayScore: 104,
    status: 'FINAL',
    clock: 'FT',
    venue: 'Chase Center, San Francisco',
    periodOrDetail: 'Western Conference Duel',
    badge: 'NBA',
  },

  // --- MOTORSPORT / FORMULA 1 ---
  {
    id: 'game-f1-1',
    sport: 'motorsport',
    league: 'Formula 1 Grand Prix',
    homeTeam: 'Verstappen (Red Bull)',
    awayTeam: 'Norris (McLaren)',
    homeScore: 'P1',
    awayScore: '+1.42s',
    status: 'LIVE',
    clock: 'Lap 46/57',
    venue: 'Silverstone Circuit, UK',
    periodOrDetail: 'Championship Grand Prix',
    badge: 'F1',
    hot: true,
  },

  // --- AMERICAN FOOTBALL / NFL ---
  {
    id: 'game-nfl-1',
    sport: 'nfl',
    league: 'NFL International',
    homeTeam: 'Kansas City Chiefs',
    awayTeam: 'San Francisco 49ers',
    homeScore: 24,
    awayScore: 21,
    status: 'FINAL',
    clock: 'FT (OT)',
    venue: 'Arrowhead Stadium, Kansas City',
    periodOrDetail: 'Super Bowl Rematch',
    badge: 'NFL',
  },

  // --- TENNIS (ATP / WTA Masters) ---
  {
    id: 'game-tennis-1',
    sport: 'tennis',
    league: 'ATP Masters 1000',
    homeTeam: 'Carlos Alcaraz',
    awayTeam: 'Jannik Sinner',
    homeScore: '6-4, 4-6, 5',
    awayScore: '4',
    status: 'LIVE',
    clock: 'Set 3 · Game 10',
    venue: 'Centre Court',
    periodOrDetail: 'Finals · Championship Point',
    badge: 'ATP',
    hot: true,
  },

  // --- CRICKET (ICC World Series) ---
  {
    id: 'game-cricket-1',
    sport: 'cricket',
    league: 'ICC World Championship',
    homeTeam: 'India',
    awayTeam: 'Australia',
    homeScore: '312/6',
    awayScore: '289/8',
    status: 'LIVE',
    clock: 'Over 47.4',
    venue: 'Melbourne Cricket Ground',
    periodOrDetail: 'Target 313 · 24 needed off 14 balls',
    badge: 'ICC',
    hot: true,
  },
];

export function getLiveGames(filterSport?: string): LiveGame[] {
  if (!filterSport || filterSport === 'all' || filterSport === 'sports') {
    return LIVE_GAMES_DATA;
  }
  return LIVE_GAMES_DATA.filter((g) => g.sport === filterSport || g.league.toLowerCase().includes(filterSport.toLowerCase()));
}
