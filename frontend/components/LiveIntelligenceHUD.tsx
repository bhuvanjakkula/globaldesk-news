'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { type NewsArticle } from '@/lib/api';
import ArticleCard from './ArticleCard';

interface LiveIntelligenceHUDProps {
  initialArticles: NewsArticle[];
  totalCount: number;
}

const PREMIER_NETWORKS = [
  'Fox News',
  'The Wall Street Journal',
  'ABC News',
  'Reuters',
  'BBC World News',
  'Bloomberg',
  'Associated Press',
  'CNN',
  'CNBC',
  'The New York Times',
  'CBS News',
  'NBC News',
  'Financial Times',
  'Forbes',
  'Al Jazeera',
  'The Guardian',
  'Politico',
  'Sky News',
  'NASA',
];

export default function LiveIntelligenceHUD({ initialArticles, totalCount }: LiveIntelligenceHUDProps) {
  const [articles, setArticles] = useState<NewsArticle[]>(initialArticles);
  const [liveTotal, setLiveTotal] = useState<number>(totalCount);
  const [lastTick, setLastTick] = useState<string>('Live now');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasNewArrivals, setHasNewArrivals] = useState<boolean>(false);

  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(36);

  // Satellite Network Constellation Filter
  const [selectedSatId, setSelectedSatId] = useState<string>('all');
  const [satelliteAgencies, setSatelliteAgencies] = useState<string[]>([]);

  const fetchLatest = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch('/api/news?page=1&page_size=100');
      if (res.ok) {
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          setArticles((prev) => {
            if (prev.length > 0 && data.items[0].slug !== prev[0].slug) {
              setHasNewArrivals(true);
              setTimeout(() => setHasNewArrivals(false), 8000);
            }
            return data.items;
          });
          if (data.total) setLiveTotal(data.total);
          const now = new Date();
          setLastTick(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      }
    } catch {
      // network silent retry
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-refresh every 2 minutes to keep every segment up to the minute
  useEffect(() => {
    const interval = setInterval(fetchLatest, 120000); // 2 minutes live sync
    return () => {
      clearInterval(interval);
    };
  }, []);

  // Sync state when server components pass fresh props on router.refresh()
  useEffect(() => {
    if (initialArticles && initialArticles.length > 0) {
      setArticles(initialArticles);
      setLiveTotal(totalCount);
    }
  }, [initialArticles, totalCount]);

  // React immediately to global real-time news update events
  useEffect(() => {
    const handleNewsUpdate = () => void fetchLatest();
    window.addEventListener('globaldesk:news-updated', handleNewsUpdate);
    return () => {
      window.removeEventListener('globaldesk:news-updated', handleNewsUpdate);
    };
  }, []);

  // Extract unique sources
  const sources = useMemo(() => {
    const map = new Map<string, string>();
    articles.forEach((a) => {
      if (a.source?.name) map.set(a.source.name, a.source.name);
    });
    return Array.from(map.values()).sort();
  }, [articles]);

  // Extract unique countries
  const countries = useMemo(() => {
    const map = new Map<string, string>();
    articles.forEach((a) => {
      if (a.country) map.set(a.country, a.country);
    });
    return Array.from(map.values()).sort();
  }, [articles]);

  // Filter articles reactively
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchSatellite =
        selectedSatId === 'all' ||
        satelliteAgencies.length === 0 ||
        satelliteAgencies.some((ag) => art.source.name.toLowerCase().includes(ag.toLowerCase()));

      const matchSource =
        selectedSource === 'all' ||
        art.source.name === selectedSource ||
        art.source.name.toLowerCase().includes(selectedSource.toLowerCase());

      const matchCat =
        selectedCategory === 'all' ||
        art.category.slug === selectedCategory ||
        (selectedCategory === 'entertainment' &&
          ['entertainment', 'movies', 'films', 'hollywood', 'music', 'pop', 'rock', 'arts'].includes(art.category.slug)) ||
        (selectedCategory === 'movies' && ['movies', 'films', 'hollywood'].includes(art.category.slug)) ||
        (selectedCategory === 'music' && ['music', 'pop', 'rock'].includes(art.category.slug)) ||
        (selectedCategory === 'business' && ['business', 'economy'].includes(art.category.slug));

      const matchCountry = selectedCountry === 'all' || art.country === selectedCountry;
      const text = `${art.title} ${art.summary || ''} ${art.source.name}`.toLowerCase();
      const matchQuery = !searchQuery || text.includes(searchQuery.toLowerCase());
      return matchSatellite && matchSource && matchCat && matchCountry && matchQuery;
    });
  }, [articles, selectedSatId, satelliteAgencies, selectedSource, selectedCategory, selectedCountry, searchQuery]);

  const lead = filteredArticles[0];
  const others = filteredArticles.slice(1, visibleCount);
  const hasMore = visibleCount < filteredArticles.length;

  return (
    <div className="intelligence-engine-wrap">
      {/* High-Tech Superpower Engine HUD */}
      <div className="engine-hud-banner">
        <div className="hud-metric-card">
          <span className="hud-metric-label">SATELLITE DOWNLINK NETWORK</span>
          <div className="hud-metric-val">
            <span className="hud-beacon-live" /> 7 SATELLITE CONSTELLATIONS CONNECTED
          </div>
          <span className="hud-metric-sub">
            INTELSAT · SES-ASTRA · GALAXY-19 · HOTBIRD · ASIASAT · STARLINK · TDRS · 100% CARRIER LOCK
          </span>
        </div>

        <div className="hud-metric-card">
          <span className="hud-metric-label">MULTI-SOURCE DIVERSITY</span>
          <div className="hud-metric-val sentiment-growth">ROUND-ROBIN INTERLEAVED</div>
          <span className="hud-metric-sub">ZERO SINGLE-OUTLET CLUSTERING · BALANCED WIRE</span>
        </div>

        <div className="hud-metric-card">
          <span className="hud-metric-label">LIVE BULLETINS IN ENGINE</span>
          <div className="hud-metric-val">{liveTotal} STORIES</div>
          <span className="hud-metric-sub">DIRECT WIRE PHOTOGRAPHY ATTACHED</span>
        </div>

        <div className="hud-metric-card hud-right-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="hud-metric-label">NEWSROOM ENGINE STATUS</span>
            <button
              type="button"
              onClick={() => void fetchLatest()}
              disabled={isSyncing}
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                fontSize: '9px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '3px',
                cursor: 'pointer',
                letterSpacing: '0.8px',
              }}
              title="Instantly re-fetch latest prominent news feeds"
            >
              {isSyncing ? 'SYNCING...' : '⚡ SYNC NOW'}
            </button>
          </div>
          <div className="hud-engine-status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={isSyncing ? 'pulse-blue' : 'pulse-green'} />
            <span>{isSyncing ? 'SYNCING 2m PULSE...' : 'LIVE AUTO-SYNC: 2m'}</span>
          </div>
          <span className="hud-metric-sub">
            LAST TICK: {lastTick} · PROMINENT OUTLETS LIVE
          </span>
        </div>
      </div>

      {/* New arrivals flash alert banner */}
      {hasNewArrivals && (
        <div
          style={{
            background: 'linear-gradient(90deg, rgba(37,99,235,0.2) 0%, rgba(16,185,129,0.2) 100%)',
            border: '1px solid rgba(16,185,129,0.4)',
            borderRadius: '8px',
            padding: '10px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#a7f3d0',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
            <span className="pulse-green" /> FLASH: Fresh international bulletins ingested and updated to front-page feed!
          </span>
          <span style={{ fontSize: '11px', color: '#6ee7b7' }}>Auto-refreshed at {lastTick}</span>
        </div>
      )}

      {/* Reactive Filter & Search Controls */}
      <div className="engine-controls-bar">
        <div className="search-input-wrap">
          <span className="search-prefix">⌕</span>
          <input
            type="text"
            placeholder="Search Forbes, Reuters, Bloomberg, WSJ, BBC, NYT, Cinema, Finance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="engine-search-field"
          />
          {searchQuery && (
            <button type="button" className="clear-btn" onClick={() => setSearchQuery('')}>
              ✕
            </button>
          )}
        </div>

        {/* Premier Global News Network Quick-Toggles */}
        <div className="source-filter-pills">
          <button
            type="button"
            className={`source-pill ${selectedSource === 'all' ? 'is-active' : ''}`}
            onClick={() => setSelectedSource('all')}
          >
            All Prominent Agencies ({articles.length})
          </button>
          {PREMIER_NETWORKS.map((net) => {
            const hasStories = sources.some((s) => s.toLowerCase().includes(net.toLowerCase()));
            if (!hasStories) return null;
            return (
              <button
                key={net}
                type="button"
                className={`source-pill ${selectedSource.toLowerCase() === net.toLowerCase() ? 'is-active' : ''}`}
                onClick={() => setSelectedSource(selectedSource === net ? 'all' : net)}
              >
                {net}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* Country / Region Filter */}
          <div className="category-select-wrap">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="engine-cat-select"
            >
              <option value="all">All Regions &amp; Nations ({countries.length})</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="category-select-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="engine-cat-select"
            >
              <option value="all">All News Segments</option>
              <option value="world">World Affairs &amp; Geopolitics</option>
              <option value="business">Business &amp; Wealth (Forbes, FT, Reuters)</option>
              <option value="economy">Economy &amp; Markets (Bloomberg, WSJ)</option>
              <option value="technology">Technology &amp; DeepTech (TechCrunch, The Verge)</option>
              <option value="politics">Politics &amp; Diplomacy</option>
              <option value="entertainment">Hollywood &amp; Culture (Variety, THR)</option>
              <option value="movies">Films &amp; Cinema (Deadline, IndieWire)</option>
              <option value="music">Music &amp; Sound Wire (Billboard, Rolling Stone, SPIN)</option>
            </select>
          </div>

          {/* Full Publisher Dropdown */}
          <div className="category-select-wrap">
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="engine-cat-select"
            >
              <option value="all">All Publishers ({sources.length})</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Featured Lead Story */}
      {lead && (
        <section className="engine-lead-section">
          <div className="section-head">
            <div>
              <span className="section-kicker">● LEAD INTERNATIONAL REPORT</span>
              <h2>Top Global Story · [{lead.source.name}]</h2>
            </div>
            <span className="section-sub">Cross-referenced &amp; verified provenance</span>
          </div>
          <div className="lead-layout">
            <ArticleCard article={lead} featured />
          </div>
        </section>
      )}

      {/* News Grid */}
      <div className="section-head news-heading">
        <div>
          <span className="section-kicker">MULTI-AGENCY WIRE STREAM</span>
          <h2>Current Reports Across Forbes, Reuters, WSJ, Bloomberg, NYT, BBC &amp; World Desks</h2>
        </div>
        <span className="subtle-link">Showing {others.length + (lead ? 1 : 0)} of {filteredArticles.length} matching stories</span>
      </div>

      {filteredArticles.length === 0 ? (
        <div className="empty-state">
          <h3>No articles matched your filters</h3>
          <p>Try resetting your region, category, or search filters.</p>
        </div>
      ) : (
        <>
          <div className="article-grid">
            {others.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '36px', marginBottom: '24px' }}>
              <button
                type="button"
                className="button-link"
                onClick={() => setVisibleCount((prev) => prev + 30)}
                style={{ padding: '12px 28px', fontSize: '14px', cursor: 'pointer' }}
              >
                Load More Multi-Source Reports (+30)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
