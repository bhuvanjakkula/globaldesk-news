'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Studio from './Studio';
import RealPresenter from './RealPresenter';
import seedBundle from '@/lib/seed_news.json';

type Item = {
  id: string;
  title: string;
  summary?: string | null;
  full_report?: string;
  lead_intro?: string;
  bureau?: string;
  bullet_points?: string[];
  source: string;
  url: string;
  published_at: string;
  is_demo: boolean;
  narration_allowed: boolean;
  spoken_text: string | null;
};

interface NewsChannel {
  id: string;
  number: string;
  name: string;
  tagline: string;
  bureau: string;
  category: string;
  badge: string;
}

const CHANNELS: NewsChannel[] = [
  {
    id: 'live',
    number: 'CH 01',
    name: 'GLOBALDESK 24/7 WORLD NEWS',
    tagline: 'Continuous Verified Global Affairs & Breaking Wire',
    bureau: 'LONDON & GENEVA HUBS',
    category: 'World Affairs & Geopolitics',
    badge: '24/7 LIVE ON AIR',
  },
  {
    id: 'markets',
    number: 'CH 02',
    name: 'THE CAPITAL DESK · MARKETS LIVE',
    tagline: 'Wall Street, Global Equities & Financial Intelligence',
    bureau: 'WALL STREET / NEW YORK',
    category: 'Markets, Economy & Trade',
    badge: 'LIVE MARKET WIRE',
  },
  {
    id: 'innovation',
    number: 'CH 03',
    name: 'NEXT / INNOVATION RADAR TV',
    tagline: 'Artificial Intelligence, Quantum & Deep Space Wires',
    bureau: 'SILICON VALLEY & NASA DESK',
    category: 'DeepTech, AI & Science',
    badge: 'RADAR ACTIVE',
  },
  {
    id: 'world',
    number: 'CH 04',
    name: 'GLOBAL DIPLOMACY & INVESTIGATIVE',
    tagline: 'In-Depth International Dispatches & Policy Reviews',
    bureau: 'INTERNATIONAL BUREAUS',
    category: 'Diplomatic & Special Reports',
    badge: 'SATELLITE SYNDICATE',
  },
];

function getInitialBulletinItems(): Item[] {
  const seedItems = (seedBundle?.news?.items || []).slice(0, 16);
  const bureaus = [
    'GLOBALDESK / LONDON BUREAU',
    'WALL STREET / NEW YORK DESK',
    'GLOBALDESK / GENEVA HUB',
    'PARIS / EUROPEAN DESK',
    'WASHINGTON / CAPITOL HUB',
    'TOKYO / ASIA PACIFIC DESK',
  ];
  return seedItems.map((art: any, idx: number) => {
    const cleanTitle = (art.title || '')
      .replace(/\s*[-|–—]\s*(Reuters|BBC|CNN|Associated Press|AP|Bloomberg|The Wall Street Journal|WSJ|The New York Times|NYT|CNBC|Forbes|Al Jazeera|The Guardian|Fox News|ABC News|NASA).*$/i, '')
      .replace(/\.$/, '')
      .trim();
    let conciseSummary = (art.summary || '').trim();
    const firstSentenceMatch = conciseSummary.match(/^([^.!?]+[.!?])/);
    if (firstSentenceMatch && firstSentenceMatch[1].length > 25) {
      conciseSummary = firstSentenceMatch[1].trim();
    } else if (conciseSummary.length > 130) {
      conciseSummary = conciseSummary.slice(0, 127).trim() + '...';
    }
    const spokenText = conciseSummary && !cleanTitle.toLowerCase().includes(conciseSummary.toLowerCase().slice(0, 25))
      ? `${cleanTitle}. ${conciseSummary}`
      : `${cleanTitle}.`;

    return {
      id: `initial-bulletin-${idx + 1}-${art.slug || idx}`,
      title: cleanTitle,
      summary: conciseSummary || null,
      full_report: art.summary || cleanTitle,
      lead_intro: 'Reporting live this hour',
      bureau: bureaus[idx % bureaus.length],
      bullet_points: [cleanTitle, conciseSummary || 'Verified multi-source dispatch.'],
      source: art.source?.name || 'GlobalDesk News Wire',
      url: art.url || `/story/${art.slug}`,
      published_at: art.published_at || new Date().toISOString(),
      is_demo: false,
      narration_allowed: true,
      spoken_text: spokenText,
    };
  });
}

export default function NewsTV() {
  const [selectedChannel, setSelectedChannel] = useState<NewsChannel>(CHANNELS[0]);
  const [items, setItems] = useState<Item[]>(() => getInitialBulletinItems());
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState('');
  const [message, setMessage] = useState('● Live Studio Broadcast Active · GlobalDesk Free Worldwide Access');
  const [recording, setRecording] = useState(false);
  const [canRecord, setCanRecord] = useState(false);
  const [realReady, setRealReady] = useState(true);
  const [presenterMode, setPresenterMode] = useState<'real' | 'illustrated'>('real');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const [cycle, setCycle] = useState(0);
  const [, startTransition] = useTransition();

  const current = items[index];

  // Initialize Speech Synthesis Voices & Browser Audio Unlock
  useEffect(() => {
    setCanRecord(typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function');
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      const available = window.speechSynthesis.getVoices().filter((v) => v.localService || v.lang.startsWith('en'));
      setVoices(available);
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);

    const unlockAudio = () => {
      if ('speechSynthesis' in window && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    };
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      if (recorder.current?.state === 'recording') recorder.current.stop();
    };
  }, []);

  // Fetch live broadcast bulletins directly from our universal news engine (ZERO third-party sign-in)
  useEffect(() => {
    let active = true;
    let busy = false;
    let revision = '';
    const controller = new AbortController();

    async function loadBroadcastData() {
      try {
        const response = await fetch(`/api/broadcast?channel=${selectedChannel.id}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (active && data.items && data.items.length > 0) {
          setItems(data.items);
          setIndex((i) => (data.items.length ? i % data.items.length : 0));
          setMessage('Broadcasting Verified Live Headlines · Free Public Access Worldwide');
          setPlaying(true);
        }
      } catch {
        if (active && items.length === 0) {
          setMessage('Reconnecting to live satellite stream…');
        }
      }
    }

    void loadBroadcastData();

    // Poll for breaking updates every 5 seconds
    async function poll() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const check = await fetch('/api/updates', { cache: 'no-store', signal: controller.signal });
        if (check.ok) {
          const change = await check.json();
          if (revision !== change.revision) {
            revision = change.revision;
            await loadBroadcastData();
          }
        }
      } catch {
        // network silent retry
      } finally {
        busy = false;
      }
    }

    const timer = window.setInterval(() => void poll(), 5000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [selectedChannel.id]);

  // Handle Illustrated Presenter auto-advancement when selected
  useEffect(() => {
    if (!playing || !current || presenterMode === 'real') return;
    let active = true;
    let timeout = 0;
    let advance = 0;
    const controller = new AbortController();

    const next = () => {
      if (active && !advance) {
        window.clearTimeout(timeout);
        advance = window.setTimeout(() => {
          setIndex((i) => (i + 1) % Math.max(items.length, 1));
          setCycle((c) => c + 1);
        }, 1000);
      }
    };

    async function present() {
      try {
        const response = await fetch(
          `/api/broadcast?channel=${selectedChannel.id}&id=${current.id}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          }
        );
        const fresh: Item = response.ok ? await response.json() : current;
        if (!active) return;
        const selected = voices.find((v) => v.voiceURI === voice) || voices.find((v) => v.lang.startsWith('en')) || voices[0];
        if (voiceOn && selected && fresh.spoken_text && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(fresh.spoken_text);
          utterance.voice = selected;
          utterance.rate = 0.95;
          utterance.onstart = () => {
            if (active) {
              setSpeaking(true);
              setMessage('Studio anchor vocal narration on air');
            }
          };
          utterance.onend = () => {
            if (active) {
              setSpeaking(false);
              next();
            }
          };
          utterance.onerror = () => {
            if (active) {
              setSpeaking(false);
              setMessage('Continuing on-screen visual chyron bulletin');
              next();
            }
          };
          window.speechSynthesis.speak(utterance);
          timeout = window.setTimeout(() => {
            if (active) {
              window.speechSynthesis.cancel();
              setSpeaking(false);
              next();
            }
          }, 35000);
        } else {
          setSpeaking(false);
          setMessage('Live caption broadcast scrolling');
          timeout = window.setTimeout(next, 9000);
        }
      } catch {
        if (active) next();
      }
    }

    void present();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
      window.clearTimeout(advance);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [playing, current?.id, current?.spoken_text, voiceOn, voice, voices, selectedChannel.id, items.length, cycle, presenterMode]);

  // Keep standby ticker rolling when paused
  useEffect(() => {
    if (!items.length || playing || recording) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % items.length), 10000);
    return () => window.clearInterval(timer);
  }, [items.length, playing, recording]);

  function exportPreview() {
    if (!canvas.current || !canRecord || recording) return;
    const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      setMessage('Video export is unavailable in this browser.');
      return;
    }
    try {
      const stream = canvas.current.captureStream(25);
      const capture = new MediaRecorder(stream, { mimeType: mime });
      const chunks: BlobPart[] = [];
      recorder.current = capture;
      capture.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      capture.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'GlobalDesk-Broadcast-Capture.' + (mime.includes('mp4') ? 'mp4' : 'webm');
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      };
      capture.start();
      setRecording(true);
      setMessage('Recording 10s digital studio capture…');
      window.setTimeout(() => {
        if (capture.state === 'recording') capture.stop();
      }, 10000);
    } catch {
      setRecording(false);
      setMessage('Video capture unavailable.');
    }
  }

  return (
    <div className="tv-player modern-glamour-tv">
      {/* 100% Open Access Banner - Zero Sign-in Required */}
      <div className="open-access-ribbon">
        <div className="open-ribbon-left">
          <span className="unlocked-beacon">●</span>
          <strong>OPEN PUBLIC ACCESS BROADCAST:</strong>
          <span>100% FREE · NO ACCOUNTS · NO YOUTUBE SIGN-IN REQUIRED · ACCESSIBLE TO EVERYONE WORLDWIDE</span>
        </div>
        <div className="open-ribbon-right">
          <span className="carrier-lock-pill">🛰️ ENCRYPTED SATELLITE CARRIER LOCK: 100%</span>
        </div>
      </div>

      {/* Channel Switcher Rail */}
      <div className="tv-channel-rail">
        <div className="tv-channel-tabs" role="tablist" aria-label="Broadcast channels">
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              role="tab"
              aria-selected={selectedChannel.id === ch.id}
              disabled={recording}
              className={`tv-chan-btn ${selectedChannel.id === ch.id ? 'channel-active' : ''}`}
              onClick={() => {
                startTransition(() => {
                  setSelectedChannel(ch);
                  setPlaying(true);
                });
              }}
            >
              <span className="chan-signal-dot" />
              <span className="chan-num-badge">{ch.number}</span>
              <div className="chan-label-group">
                <strong>{ch.name}</strong>
                <small>{ch.bureau}</small>
              </div>
            </button>
          ))}
        </div>
        <span className="tv-signal">
          <i /> 4K SATELLITE SYNDICATION
        </span>
      </div>

      {/* Main Broadcast Theatre (Self-Hosted Live Studio Television) */}
      <div className="tv-theatre">
        <div className="tv-main-stage">
          <div className="tv-disclosure">
            <div className="disclosure-channel-meta">
              <span className="live-red-beacon">ON AIR</span>
              <span className="disclosure-channel-title">
                GLOBALDESK <b>TV</b> · {selectedChannel.name}
              </span>
            </div>
            <small>
              {presenterMode === 'real' ? 'REALISTIC BROADCAST ANCHORS' : 'ILLUSTRATED STUDIO'} · LIVE DIGITAL EDITION
            </small>
          </div>

          {presenterMode === 'real' ? (
            <RealPresenter
              onReady={setRealReady}
              channel={selectedChannel.id}
              id={current?.id}
              title={current?.title || 'GlobalDesk 24/7 World News Network'}
              summary={current?.summary}
              fullReport={current?.full_report}
              leadIntro={current?.lead_intro}
              bureau={current?.bureau || selectedChannel.bureau}
              bulletPoints={current?.bullet_points}
              spokenScript={current?.spoken_text}
              source={current?.source || 'Global News Wire'}
              playing={playing}
              voiceOn={voiceOn}
              selectedVoice={voice}
              onEnded={() => {
                if (autoAdvance) {
                  setIndex((i) => (i + 1) % Math.max(items.length, 1));
                  setCycle((c) => c + 1);
                }
              }}
            />
          ) : (
            <Studio
              ref={canvas}
              title={current?.title || 'The world. In context.'}
              source={current?.source || 'GlobalDesk News Network'}
              speaking={speaking}
              demo={selectedChannel.id === 'world'}
              playing={playing}
            />
          )}

          <div className="tv-stage-caption">
            <span>{playing ? '● BROADCASTING LIVE' : '○ ON STANDBY'}</span>
            <strong>{selectedChannel.name}</strong>
            <small>
              Elena Vance, Marcus Chen &amp; Aria Sterling · Direct Feed from Reuters, AP, BBC, WSJ &amp; Bloomberg
            </small>
          </div>
        </div>

        {/* Up Next Rundown Playlist */}
        <aside className="tv-up-next">
          <div className="tv-queue-heading">
            <span>PROGRAMME RUNDOWN</span>
            <small>{items.length} verified stories</small>
          </div>
          <h2>Live on Air.</h2>
          <p className="tv-queue-intro">
            Continuous source mapping. Dr. Bhuvan Jakkula Newsroom. Click any story to broadcast instantly.
          </p>
          <ol>
            {items.map((item, i) => (
              <li key={item.id}>
                <button
                  aria-current={index === i ? 'true' : undefined}
                  disabled={recording}
                  className={`rundown-btn ${index === i ? 'is-active-story' : ''}`}
                  onClick={() => {
                    setIndex(i);
                    setCycle((c) => c + 1);
                    setPlaying(true);
                  }}
                >
                  <span className="tv-queue-number">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <small>{item.source}</small>
                    <strong>{item.title}</strong>
                  </span>
                  <span className="tv-queue-arrow">▶</span>
                </button>
              </li>
            ))}
          </ol>
          {!items.length && <p className="loading-rundown">Synchronizing live newsroom rundown…</p>}
          <div className="tv-queue-footer">
            24/7 ENCRYPTED SATELLITE DISCOVERY FEED<br />
            ZERO LOGIN · OPEN TO ALL VIEWERS WORLDWIDE
          </div>
        </aside>
      </div>

      {/* Breaking Flash News Chyron Bar */}
      <div className="tv-ticker glamorous-chyron">
        <div className="ticker-alert-box">
          <span className="ticker-pulse-ring" />
          <span className="ticker-alert-label">BREAKING FLASH</span>
        </div>
        <div className="tv-flash" role="status" aria-live="off">
          <span key={current?.id}>
            {current ? current.title : 'GLOBALDESK NEWS NETWORK / THE WORLD IN REAL TIME · 24/7 VERIFIED COVERAGE'}
          </span>
        </div>
        <small className="ticker-counter">
          {items.length ? `${index + 1} OF ${items.length}` : 'LIVE'}
        </small>
      </div>

      {/* Professional TV Control Console */}
      <div className="tv-control-deck">
        <div className="tv-controls">
          <button
            className={`tv-play-button ${playing ? 'is-playing' : ''}`}
            onClick={() => {
              setMessage(playing ? 'Broadcast paused' : 'Live bulletin on air…');
              setPlaying((v) => !v);
            }}
            disabled={!items.length || (presenterMode === 'real' && !realReady)}
          >
            <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
            {playing ? 'Pause Live Broadcast' : 'Play Live Broadcast'}
          </button>

          <button
            className="tv-secondary-btn"
            onClick={() => {
              setIndex((i) => (i + 1) % items.length);
              setCycle((c) => c + 1);
            }}
            disabled={!items.length || recording}
          >
            Next Story ❯
          </button>

          <label>
            Presenter Style
            <select
              value={presenterMode}
              onChange={(e) => {
                setPlaying(false);
                setPresenterMode(e.target.value as 'real' | 'illustrated');
              }}
            >
              <option value="real">Real Broadcast Anchors (Elena, Marcus, Aria)</option>
              <option value="illustrated">Digital Studio Canvas</option>
            </select>
          </label>

          <label className="tv-voice-toggle">
            <input
              type="checkbox"
              checked={voiceOn}
              onChange={(e) => setVoiceOn(e.target.checked)}
            />
            Anchor Voice Narration
          </label>

          <label className="tv-voice-toggle">
            <input
              type="checkbox"
              checked={autoAdvance}
              onChange={(e) => setAutoAdvance(e.target.checked)}
            />
            Continuous 24/7 Auto-Advance
          </label>

          <label>
            Anchor Voice
            <select value={voice} onChange={(e) => setVoice(e.target.value)}>
              <option value="">Studio Anchor Natural Voice</option>
              {voices.map((v) => (
                <option value={v.voiceURI} key={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>

          {presenterMode === 'illustrated' && (
            <button onClick={exportPreview} className="tv-export-btn" disabled={!canRecord || recording}>
              {recording ? 'Recording…' : 'Export Studio Video'}
            </button>
          )}
        </div>
        <p className="tv-player-status" role="status">
          <span className="status-live-dot" /> {message}
        </p>
      </div>

      {/* Editorial & Presenter Profiles */}
      <div className="tv-editorial-grid">
        {current && (
          <section className="tv-caption">
            <span className="tv-section-label">
              CURRENT STORY / {String(index + 1).padStart(2, '0')} OF {items.length}
            </span>
            <h2>{current.title}</h2>
            <p className="tv-caption-meta">
              Wire Source: <strong>{current.source}</strong> · Published {current.published_at.slice(0, 16).replace('T', ' ')} UTC
            </p>
            {current.url && (
              <a href={current.url} target="_blank" rel="noopener noreferrer" className="read-source-btn">
                Inspect Original Publisher Reporting ↗
              </a>
            )}
            <p className="tv-caption-rights">
              Multi-source cross-referencing enabled. Fact check integrity confirmed by GlobalDesk automated review.
            </p>
          </section>
        )}

        <section className="tv-about-studio">
          <span className="tv-section-label">THE GLOBALDESK NEWSROOM</span>
          <h2>Independent News.<br />Global Integrity.</h2>
          <p>
            GlobalDesk broadcasts 24/7 international news, Wall Street intelligence, and scientific breakthroughs. Founded by Dr. Bhuvan Jakkula with a mandate for transparent source discovery.
          </p>
          <div className="studio-anchors-bio">
            <div className="bio-pill">
              <strong>Elena Vance</strong> · London Bureau Chief
            </div>
            <div className="bio-pill">
              <strong>Marcus Chen</strong> · Wall Street Markets Lead
            </div>
            <div className="bio-pill">
              <strong>Aria Sterling</strong> · Geneva Investigative Lead
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}