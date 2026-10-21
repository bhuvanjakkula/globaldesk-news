import Link from 'next/link';
import { getArticles } from '@/lib/api';
import SportsScoreboard from '@/components/SportsScoreboard';
import ArticleFeed from '@/components/ArticleFeed';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'World Sports Center & Live Games | GlobalDesk',
  description: 'Real-time scores, tournament intelligence, and strictly today-only championship wire dispatches from ESPN, BBC Sport, Reuters Sports, Sky Sports, and Associated Press.',
};

export default async function SportsPage() {
  let data;
  try {
    data = await getArticles({ category: 'sports', page_size: 50 });
  } catch {
    return (
      <div className="container page-pad">
        <div className="empty-state">
          <h1>Sportsroom Service Initializing</h1>
          <p>Connecting to global championship wires and satellite sports telemetry. Refresh in a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sports-center-page">
      {/* Stadium Atmosphere Hero */}
      <section className="sports-hero-band">
        <div className="container sports-hero-inner">
          <div className="sports-hero-badge">
            <span className="sports-pulse-dot" />
            <span>GLOBAL SPORTS INTELLIGENCE WIRE · 24/7 LIVE COVERAGE</span>
          </div>
          <h1>
            World Sports <em>Arena.</em>
          </h1>
          <p>
            Championship athletics, live tournament scores, and verified dispatches from the world's premier sports wires. Strictly today's news coverage across all main games.
          </p>
          <div className="sports-hero-sources">
            <span>ESPN WIRE</span>
            <span>BBC SPORT</span>
            <span>REUTERS SPORTS</span>
            <span>SKY SPORTS</span>
            <span>AP SPORTS</span>
            <span>THE ATHLETIC</span>
            <span>F1 PADDOCK</span>
          </div>
        </div>
      </section>

      <div className="container page-pad">
        {/* Real-time Match Scores & Game Ticker */}
        <div className="section-head sports-section-head">
          <div>
            <span className="section-kicker">LIVE ARENA TELEMETRY</span>
            <h2>Today's Main Games &amp; Match Center</h2>
          </div>
          <span className="live-game-badge">AUTO-UPDATES EVERY 2 MINUTES</span>
        </div>

        <SportsScoreboard />

        {/* Championship Subcategories Navigation */}
        <nav className="sports-genre-nav" aria-label="Sports categories">
          <Link href="/sports" className="is-active">All Sports</Link>
          <Link href="/topics/football">⚽ Football / Soccer</Link>
          <Link href="/topics/basketball">🏀 Basketball / NBA</Link>
          <Link href="/topics/motorsport">🏎️ Motorsport / F1</Link>
          <Link href="/topics/tennis">🎾 Tennis / ATP</Link>
          <Link href="/topics/cricket">🏏 Cricket / ICC</Link>
        </nav>

        {/* Today's Breaking Sports Articles Grid */}
        <div className="section-head">
          <div>
            <span className="section-kicker">TODAY'S VERIFIED SPORTS WIRE</span>
            <h2>Latest Dispatches &amp; Championship Reports</h2>
          </div>
          <small className="sports-entry-count">{data.total} stories active in engine</small>
        </div>

        <ArticleFeed data={data} path="/sports" />
      </div>
    </div>
  );
}
