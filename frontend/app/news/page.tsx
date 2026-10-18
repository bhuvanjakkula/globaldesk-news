import Link from 'next/link';
import { getArticles, MAIN_TOPICS } from '@/lib/api';
import LiveIntelligenceHUD from '@/components/LiveIntelligenceHUD';
import EntertainmentShowcase from '@/components/EntertainmentShowcase';
import InnovationStrip from '@/components/InnovationStrip';
import MarketsStrip from '@/components/MarketsStrip';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let data;
  try {
    data = await getArticles({ page_size: 100 });
  } catch {
    return (
      <div className="container page-pad">
        <div className="empty-state">
          <h1>Newsroom Service Connecting</h1>
          <p>The GlobalDesk multi-source satellite engine is initializing. Refresh in a moment.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Live Satellite Syndication Banner */}
      <div className="live-network-header-band">
        <div className="container live-network-inner">
          <div className="band-left">
            <span className="satellite-beacon" />
            <strong>WORLDWIDE SATELLITE NETWORK:</strong>
            <span>UK · USA · AUSTRALIA · FRANCE · GERMANY · SWITZERLAND · INDIA · CHINA · RUSSIA · POLAND · CANADA · MIDDLE EAST · AFRICA · HOLLYWOOD</span>
          </div>
          <div className="band-right">
            <span className="live-status-pill">45+ GLOBAL DESKS ACTIVE</span>
          </div>
        </div>
      </div>

      <div className="container page-pad">
        <div className="eyebrow">
          GLOBAL NEWS INTELLIGENCE NETWORK <span> / </span> 24/7 CURRENT DEVELOPMENTS
        </div>

        <section className="intro">
          <div>
            <h1>The world in real time.<br /><em>Without the noise.</em></h1>
            <p>
              High-engineering newsroom technology aggregating verified developments across global affairs, business, technology, finance and culture from international syndicates.
            </p>
          </div>
          <div className="intro-aside">
            <div className="intro-count">{data.total}</div>
            <span>
              live verified reports<br />
              active in news engine
            </span>
          </div>
        </section>

        {/* Real-time Markets & Innovation Strips */}
        <MarketsStrip />
        <InnovationStrip />

        {/* High-Tech Superpower Interactive Intelligence Engine */}
        <LiveIntelligenceHUD initialArticles={data.items} totalCount={data.total} />

        {/* Culture & Entertainment Showcase */}
        <EntertainmentShowcase />

        {/* Topics Exploration */}
        <div className="section-head">
          <div>
            <span className="section-kicker">CURATED LENSES</span>
            <h2>Explore by International Sector</h2>
          </div>
        </div>
        <div className="topic-grid">
          {MAIN_TOPICS.map((t, i) => (
            <Link href={`/topics/${t.slug}`} className="topic-tile" key={t.slug}>
              <span className="topic-index">0{i + 1}</span>
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <span className="topic-arrow">↗</span>
            </Link>
          ))}
        </div>

        {/* Newsroom Technology Transparency */}
        <div className="source-note high-tech-note">
          <div className="source-note-icon">◎</div>
          <div>
            <strong>High-Tech Superpower Multi-Source Architecture</strong>
            <p>
              GlobalDesk automatically synchronizes live feeds from The Wall Street Journal, The New York Times, CNN, Fox News, ABC News, The Washington Times, BBC News, and NASA Space &amp; Discovery. Exact original wire imagery and verified publisher metadata are preserved in real-time.
            </p>
          </div>
          <Link href="/about" className="note-cta-link">
            Engine Architecture ↗
          </Link>
        </div>
      </div>
    </>
  );
}
