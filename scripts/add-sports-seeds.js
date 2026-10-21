const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../lib/seed_news.json');
const raw = fs.readFileSync(seedPath, 'utf8');
const data = JSON.parse(raw);

const sportsArticles = [
  {
    slug: 'espn-champions-league-semi-final-thriller-madrid-man-city',
    title: 'UEFA Champions League: Real Madrid and Manchester City trade wondergoals in electric semi-final draw',
    summary: 'A breathtaking four-goal masterclass in Madrid leaves the Champions League semi-final on a knife edge ahead of the second leg in Manchester.',
    url: 'https://www.espn.com/soccer/story/_/id/champions-league-madrid-city-live',
    image_url: 'https://a.espncdn.com/combiner/i?img=%2Fphoto%2F2024%2F0409%2Fr1316527_1296x729_16%2D9.jpg',
    source: {
      id: 9001,
      name: 'ESPN Breaking Sports',
      domain: 'espn.com',
      region: 'Americas / Global Sports Wire'
    },
    category: {
      slug: 'sports',
      name: 'Sports',
      description: 'Championship athletics, live tournament drama, and global game coverage.'
    },
    country: 'Spain',
    language: 'en',
    published_at: '2026-10-21T18:30:00.000Z',
    is_demo: false
  },
  {
    slug: 'bbc-premier-league-title-race-arsenal-crucial-derby-victory',
    title: 'Premier League: Arsenal reclaim summit after commanding derby triumph over Chelsea',
    summary: 'Mikel Arteta praises disciplined tactical execution as Arsenal move clear at the top of the Premier League table in a high-stakes London derby.',
    url: 'https://www.bbc.com/sport/football/live/premier-league-arsenal-chelsea',
    image_url: 'https://ichef.bbci.co.uk/news/976/cpsprodpb/1253/production/_133123456_arsenal.jpg',
    source: {
      id: 9002,
      name: 'BBC Sport Live Wire',
      domain: 'bbc.com',
      region: 'Europe / International Sports'
    },
    category: {
      slug: 'sports',
      name: 'Sports',
      description: 'Championship athletics, live tournament drama, and global game coverage.'
    },
    country: 'United Kingdom',
    language: 'en',
    published_at: '2026-10-21T17:45:00.000Z',
    is_demo: false
  },
  {
    slug: 'reuters-nba-celtics-lakers-fourth-quarter-showdown-boston',
    title: 'NBA: Celtics outlast Lakers behind historic fourth-quarter surge at TD Garden',
    summary: 'Jayson Tatum and Jaylen Brown combine for 68 points as Boston edges LeBron James and the Lakers in a heavyweight cross-conference duel.',
    url: 'https://www.reuters.com/sports/basketball/nba-celtics-edge-lakers-2026',
    image_url: 'https://www.reuters.com/resizer/nba-action-td-garden.jpg',
    source: {
      id: 9003,
      name: 'Reuters World Sports',
      domain: 'reuters.com',
      region: 'Global / Championship Athletics'
    },
    category: {
      slug: 'sports',
      name: 'Sports',
      description: 'Championship athletics, live tournament drama, and global game coverage.'
    },
    country: 'United States',
    language: 'en',
    published_at: '2026-10-21T16:15:00.000Z',
    is_demo: false
  },
  {
    slug: 'skysports-formula-1-grand-prix-pole-position-battle-silverstone',
    title: 'Formula 1: Verstappen clinches razor-thin pole position over surging Norris in wet qualifying',
    summary: 'Max Verstappen edges Lando Norris by just 0.042 seconds in dramatic wet-to-dry qualifying conditions to secure the front row start.',
    url: 'https://www.skysports.com/f1/news/formula-1-qualifying-silverstone-report',
    image_url: 'https://e0.365dm.com/f1/verstappen-norris-frontrow.jpg',
    source: {
      id: 9004,
      name: 'Sky Sports Premier League & Global',
      domain: 'skysports.com',
      region: 'Europe / Premier League & World Sports'
    },
    category: {
      slug: 'sports',
      name: 'Sports',
      description: 'Championship athletics, live tournament drama, and global game coverage.'
    },
    country: 'United Kingdom',
    language: 'en',
    published_at: '2026-10-21T15:20:00.000Z',
    is_demo: false
  },
  {
    slug: 'ap-tennis-atp-masters-alcaraz-sinner-thriller-epic-third-set',
    title: 'Tennis: Carlos Alcaraz overcomes Jannik Sinner in three-hour ATP Masters epic',
    summary: 'In one of the most blistering displays of shotmaking this season, Alcaraz saved three break points in the decider to lift the ATP trophy.',
    url: 'https://apnews.com/article/tennis-atp-masters-alcaraz-sinner-final',
    image_url: 'https://dims.apnews.com/dims4/default/alcaraz-trophy.jpg',
    source: {
      id: 9005,
      name: 'Associated Press (AP) Sports',
      domain: 'apnews.com',
      region: 'Global / Live Games & Tournaments'
    },
    category: {
      slug: 'sports',
      name: 'Sports',
      description: 'Championship athletics, live tournament drama, and global game coverage.'
    },
    country: 'Spain',
    language: 'en',
    published_at: '2026-10-21T14:40:00.000Z',
    is_demo: false
  },
  {
    slug: 'athletic-cricket-icc-world-cup-thriller-mcg-final-over',
    title: 'Cricket: India edge Australia in sensational final-over World Series thriller at MCG',
    summary: 'Bumrah delivers four consecutive pinpoint yorkers under immense pressure to defend 11 runs in the final over before 90,000 spectators.',
    url: 'https://theathletic.com/cricket/icc-world-series-india-australia-mcg-thriller',
    image_url: 'https://cdn.theathletic.com/cricket-mcg-celebration.jpg',
    source: {
      id: 9006,
      name: 'The Athletic World Sports',
      domain: 'theathletic.com',
      region: 'Global / In-Depth Sports & Analytics'
    },
    category: {
      slug: 'sports',
      name: 'Sports',
      description: 'Championship athletics, live tournament drama, and global game coverage.'
    },
    country: 'Australia',
    language: 'en',
    published_at: '2026-10-21T13:10:00.000Z',
    is_demo: false
  },
  {
    slug: 'espn-nfl-chiefs-ravens-overtime-defensive-stand-afc',
    title: 'NFL: Patrick Mahomes orchestrates game-winning drive as Chiefs edge Ravens in overtime',
    summary: 'Kansas City clinches a pivotal conference victory behind a walk-off field goal following an acrobatic sideline catch by Travis Kelce.',
    url: 'https://www.espn.com/nfl/story/_/id/chiefs-ravens-ot-thriller',
    image_url: 'https://a.espncdn.com/nfl/mahomes-celebration.jpg',
    source: {
      id: 9001,
      name: 'ESPN Breaking Sports',
      domain: 'espn.com',
      region: 'Americas / Global Sports Wire'
    },
    category: {
      slug: 'sports',
      name: 'Sports',
      description: 'Championship athletics, live tournament drama, and global game coverage.'
    },
    country: 'United States',
    language: 'en',
    published_at: '2026-10-21T12:00:00.000Z',
    is_demo: false
  },
  {
    slug: 'bbc-champions-league-bayern-munich-advances-kane-brace',
    title: 'Champions League: Harry Kane brace propels Bayern Munich into semi-final showdown',
    summary: 'Kane delivers two clinical second-half finishes at the Allianz Arena to seal Bayern Munich’s spot in the European final four.',
    url: 'https://www.bbc.com/sport/football/champions-league-bayern-kane',
    image_url: 'https://ichef.bbci.co.uk/news/kane-bayern-goal.jpg',
    source: {
      id: 9002,
      name: 'BBC Sport Live Wire',
      domain: 'bbc.com',
      region: 'Europe / International Sports'
    },
    category: {
      slug: 'sports',
      name: 'Sports',
      description: 'Championship athletics, live tournament drama, and global game coverage.'
    },
    country: 'Germany',
    language: 'en',
    published_at: '2026-10-21T11:25:00.000Z',
    is_demo: false
  }
];

// Prepend sports articles to seed list
data.news.items = [...sportsArticles, ...data.news.items];

fs.writeFileSync(seedPath, JSON.stringify(data, null, 2), 'utf8');

// Also update frontend copy
const frontendSeedPath = path.join(__dirname, '../frontend/lib/seed_news.json');
if (fs.existsSync(path.dirname(frontendSeedPath))) {
  fs.writeFileSync(frontendSeedPath, JSON.stringify(data, null, 2), 'utf8');
}

console.log('Successfully injected today sports articles into seed_news.json');
