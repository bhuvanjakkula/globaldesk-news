'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface FlashItem {
  id: string;
  title: string;
  category: string;
  time: string;
  isUrgent?: boolean;
}

const DEFAULT_FLASH_ITEMS: FlashItem[] = [
  { id: 'f-1', title: 'GLOBAL SUMMIT: International Climate Resilience Pact enters final multilateral review', category: 'WORLD', time: 'JUST NOW', isUrgent: true },
  { id: 'f-2', title: 'WALL STREET: Tech momentum lifts indices as semiconductor demand hits record quarterly highs', category: 'MARKETS', time: '2m ago' },
  { id: 'f-3', title: 'INNOVATION RADAR: Quantum annealing breakthrough achieves room-temperature coherence milestone', category: 'DEEPTECH', time: '5m ago', isUrgent: true },
  { id: 'f-4', title: 'CENTRAL BANKS: European Central Bank signals calibrated policy stance amid stable inflation', category: 'ECONOMY', time: '11m ago' },
  { id: 'f-5', title: 'GLOBALDESK TV: 24/7 Digital Anchor Broadcast live now across 4 specialized international streams', category: 'BROADCAST', time: 'LIVE' },
];

const MARKET_PILLS = [
  { symbol: 'S&P 500', val: '5,864.67', change: '+0.82%', up: true },
  { symbol: 'NASDAQ', val: '18,376.44', change: '+1.18%', up: true },
  { symbol: 'FTSE 100', val: '8,241.10', change: '-0.14%', up: false },
  { symbol: 'BTC/USD', val: '$91,420', change: '+3.45%', up: true },
  { symbol: 'BRENT', val: '$78.40', change: '-0.62%', up: false },
];

export default function FlashNewsBar() {
  const [items, setItems] = useState<FlashItem[]>(DEFAULT_FLASH_ITEMS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Live Clock (UTC)
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setCurrentTime(now.toUTCString().slice(17, 25) + ' UTC');
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real headlines from news API if available
  useEffect(() => {
    async function loadHeadlines() {
      try {
        const res = await fetch('/api/broadcast?channel=live', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.items && data.items.length) {
          const mapped: FlashItem[] = data.items.slice(0, 10).map((it: { id: string; title: string; source: string }, idx: number) => ({
            id: it.id,
            title: `${it.source.toUpperCase()}: ${it.title}`,
            category: idx === 0 ? 'FLASH WIRE' : idx % 2 === 0 ? 'BREAKING' : 'DEVELOPING',
            time: `${(idx + 1) * 2}m ago`,
            isUrgent: idx < 2,
          }));
          setItems(mapped);
        }
      } catch {
        // keep default items
      }
    }
    void loadHeadlines();
    const interval = setInterval(loadHeadlines, 120000); // sync every 2 minutes
    return () => clearInterval(interval);
  }, []);

  // Cycle Flash Headlines every 5s
  useEffect(() => {
    if (!items.length) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length]);

  // Audio beep generator using Web Audio API
  const playAlertChime = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch {
      // Audio not permitted or context error
    }
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (next) playAlertChime();
  };

  const current = items[currentIndex] || items[0];

  return (
    <div className="flash-news-banner" role="region" aria-label="Flash Breaking News Ticker">
      <div className="container flash-news-container">
        {/* Flashing Badge */}
        <div className="flash-tag">
          <span className="flash-pulse-beacon" aria-hidden="true" />
          <span className="flash-tag-text">FLASH NEWS</span>
        </div>

        {/* Live Headline Ticker */}
        <div className="flash-ticker-wrap">
          <span className="flash-category-pill">{current?.category || 'BULLETIN'}</span>
          <div className="flash-ticker-content" key={current?.id}>
            <span className="flash-headline-text">
              {current?.title}
            </span>
            <span className="flash-time-badge">{current?.time}</span>
          </div>
        </div>

        {/* Live Markets Quick Pills */}
        <div className="flash-markets-strip" aria-label="Live Market Indexes">
          {MARKET_PILLS.map((m) => (
            <div key={m.symbol} className="flash-market-pill">
              <span className="market-sym">{m.symbol}</span>
              <span className="market-val">{m.val}</span>
              <span className={`market-change ${m.up ? 'market-up' : 'market-down'}`}>
                {m.up ? '▲' : '▼'} {m.change}
              </span>
            </div>
          ))}
        </div>

        {/* Controls: Audio chime, Clock, Watch Live TV Link */}
        <div className="flash-actions">
          {currentTime && <span className="flash-clock">{currentTime}</span>}
          <button
            type="button"
            className={`flash-sound-btn ${soundEnabled ? 'sound-on' : ''}`}
            onClick={handleToggleSound}
            title={soundEnabled ? 'Mute alert chime' : 'Enable alert sound'}
            aria-label="Toggle alert sound"
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>
          <Link href="/tv" className="flash-live-tv-btn">
            <span className="live-tv-dot" />
            <span className="live-tv-icon">📺</span>
            LIVE TV
          </Link>
        </div>
      </div>
    </div>
  );
}
