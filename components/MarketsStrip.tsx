import Link from 'next/link';
import { getMarketNews } from '@/lib/markets';

export default async function MarketsStrip() {
  let news;
  try {
    news = await getMarketNews();
  } catch {
    // Graceful fallback
  }

  const items = news?.items?.slice(0, 3) || [];

  return (
    <section className="markets-promo">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="eyebrow">THE CAPITAL DESK / WALL STREET & GLOBAL EXCHANGES</span>
          <h2>Wall Street. A world of markets.</h2>
          <p>Official finance headlines, investment research gateways and 12 premier global exchanges.</p>
        </div>
        <Link className="subtle-link" href="/markets">Explore financial markets ↗</Link>
      </div>

      {items.length > 0 && (
        <div className="radar-promo-grid" style={{ marginTop: '1.25rem' }}>
          {items.map((m) => (
            <a href={m.url} key={m.id} target="_blank" rel="noopener noreferrer">
              <small>{m.region.toUpperCase()} · {m.published_at.slice(0, 10)}</small>
              <h3>{m.title}</h3>
              <span>{m.source} ↗</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
