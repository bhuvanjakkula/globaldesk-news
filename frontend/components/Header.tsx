import Link from 'next/link';
import { MAIN_TOPICS, ENTERTAINMENT_TOPICS } from '@/lib/api';
import FlashNewsBar from './FlashNewsBar';

export default function Header() {
  return (
    <>
      {/* Dynamic Flash Breaking News Ticker Bar */}
      <FlashNewsBar />

      <div className="utility-bar">
        <div className="container utility-inner">
          <div className="utility-left">
            <span className="live-network-badge">
              <span className="live-dot-pulse" /> GLOBAL BROADCAST NETWORK
            </span>
            <span className="utility-tagline">24/7 VERIFIED SOURCES · LIVE EDITORIAL DESK</span>
          </div>
          <div className="utility-right">
            <span>EDITION: GLOBAL / INTERNATIONAL</span>
            <span className="edition-sep">·</span>
            <Link href="/tv" className="utility-tv-link">
              <span>LIVE STUDIO CHANNELS</span> ↗
            </Link>
          </div>
        </div>
      </div>

      <header className="site-header container">
        <div className="masthead-identity">
          <Link className="brand" href="/" aria-label="Global News Intelligence home">
            <span className="brand-mark">◎</span>
            <span>
              <b>GLOBAL<span className="brand-accent">DESK</span></b>
              <small>INTELLIGENCE &amp; BROADCAST NETWORK</small>
            </span>
          </Link>
          <div className="masthead-founder">
            <strong>Dr. Bhuvan Jakkula</strong>
            <span>EDITOR &amp; FOUNDER · GLOBALDESK</span>
          </div>
        </div>

        <form role="search" action="/search" className="header-search">
          <label htmlFor="searchbox" className="sr-only">Search global news</label>
          <input
            id="searchbox"
            name="q"
            placeholder="Search news, companies, markets, AI, topics…"
            maxLength={150}
          />
          <button type="submit" aria-label="Search">⌕</button>
        </form>

        <div className="header-cta-group">
          <Link className="tv-header-cta" href="/tv">
            <span className="tv-pulse" />
            <span className="tv-cta-text">NEWS TV LIVE</span>
          </Link>
          <Link className="header-link" href="/sources">
            Sources ↗
          </Link>
          <div className="header-auth">
            <a href="/account/access#signin">Sign in</a>
            <a href="/account/access#signup" className="auth-signup-btn">Get Access ↗</a>
          </div>
        </div>
      </header>

      <nav className="navigation" aria-label="Main topics">
        <div className="container nav-inner">
          <Link href="/news" className="nav-highlight">Top Stories</Link>
          <Link href="/tv" className="nav-tv-pill">
            <span className="nav-tv-dot" /> Live TV
          </Link>
          {MAIN_TOPICS.map((t) => (
            <Link key={t.slug} href={`/topics/${t.slug}`}>
              {t.name}
            </Link>
          ))}
          <Link href="/markets">Wall Street &amp; Markets</Link>
          <Link href="/innovation">Innovation Radar</Link>
          <Link href="/intelligence">Intelligence Lab</Link>
          <Link href="/events">Event Desk</Link>
          <Link href="/briefings">Daily Briefing</Link>
          <Link href="/watchdesk">Watch Desk</Link>
          <Link href="/compare">Compare</Link>
          <Link href="/research">Research</Link>
          <Link href="/owner">Owner</Link>
          <Link href="/about">About</Link>
        </div>
      </nav>

      <nav className="ent-navbar" aria-label="Entertainment genres">
        <div className="container ent-navbar-inner">
          <Link className="ent-navbar-title" href="/topics/entertainment">
            ✦ Culture &amp; Entertainment Wire
          </Link>
          {ENTERTAINMENT_TOPICS.map((t) => (
            <Link key={t.slug} href={`/topics/${t.slug}`}>
              {t.name}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
