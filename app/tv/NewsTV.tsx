'use client';
import { useEffect, useRef, useState } from 'react';
import Studio from './Studio';
import RealPresenter from './RealPresenter';

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

export default function NewsTV() {
  const [channel, setChannel] = useState('live');
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voice, setVoice] = useState('');
  const [message, setMessage] = useState('Digital studio initialized · Ready on air');
  const [recording, setRecording] = useState(false);
  const [canRecord, setCanRecord] = useState(false);
  const [realReady, setRealReady] = useState(true);
  const [presenterMode, setPresenterMode] = useState<'real' | 'illustrated'>('real');
  const canvas = useRef<HTMLCanvasElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const [cycle, setCycle] = useState(0);

  const current = items[index];

  useEffect(() => {
    setCanRecord(typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function');
    if (!('speechSynthesis' in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices().filter((v) => v.localService || v.lang.startsWith('en')));
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
      if (recorder.current?.state === 'recording') recorder.current.stop();
    };
  }, []);

  useEffect(() => {
    let active = true;
    let busy = false;
    let revision = '';
    const controller = new AbortController();
    setItems([]);
    setIndex(0);
    setPlaying(false);
    setMessage('Connecting to live news satellite feed…');

    async function poll() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const check = await fetch('/api/updates', { cache: 'no-store', signal: controller.signal });
        if (!check.ok) throw new Error();
        const change = await check.json();
        if (revision !== change.revision) {
          const response = await fetch('/api/broadcast?channel=' + channel, {
            cache: 'no-store',
            signal: controller.signal,
          });
          if (!response.ok) throw new Error();
          const data = await response.json();
          if (active) {
            setItems(data.items);
            setIndex((i) => (data.items.length ? i % data.items.length : 0));
            setMessage(data.items.length ? 'Live Bulletin Ready · Satellite verified' : 'No permitted headlines in this channel.');
            revision = change.revision;
          }
        }
      } catch {
        if (active) setMessage('Reconnecting to live newsroom stream…');
      } finally {
        busy = false;
      }
    }

    void poll();
    const timer = window.setInterval(() => void poll(), 2000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [channel]);

  // Handle Illustrated Presenter auto-advancement
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
        const response = await fetch('/api/broadcast?' + new URLSearchParams({ channel: channel === 'world' ? 'demo' : channel, id: current.id }), {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error();
        const fresh: Item = await response.json();
        if (!active) return;
        const selected = voices.find((v) => v.voiceURI === voice) || voices.find((v) => v.lang.startsWith('en')) || voices[0];
        if (voiceOn && selected && fresh.narration_allowed && fresh.spoken_text && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(fresh.spoken_text);
          utterance.voice = selected;
          utterance.rate = 0.95;
          utterance.onstart = () => {
            if (active) {
              setSpeaking(true);
              setMessage('Audio narration on air');
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
              setMessage('Continuing with on-screen captions');
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
          }, 45000);
        } else {
          setSpeaking(false);
          setMessage('Caption bulletin broadcasting');
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
  }, [playing, current?.id, current?.spoken_text, current?.narration_allowed, voiceOn, voice, voices, channel, items.length, cycle, presenterMode]);

  // Keep headline cycle when paused
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
        link.download = 'GlobalDesk-Studio-Broadcast.' + (mime.includes('mp4') ? 'mp4' : 'webm');
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
      {/* Live Channel Switching Bar */}
      <div className="tv-channel-rail">
        <div className="tv-channel-tabs" role="group" aria-label="Broadcast channels">
          {[
            ['live', 'GLOBALDESK 24/7 LIVE WORLD NEWS'],
            ['markets', 'THE CAPITAL DESK · MARKETS LIVE'],
            ['innovation', 'NEXT / INNOVATION RADAR TV'],
          ].map(([value, label]) => (
            <button
              key={value}
              disabled={recording}
              aria-pressed={channel === value}
              className={`tv-chan-btn ${channel === value ? 'channel-active' : ''}`}
              onClick={() => setChannel(value)}
            >
              <span className="chan-signal-dot" />
              {label}
            </button>
          ))}
        </div>
        <span className="tv-signal">
          <i /> 4K SATELLITE BROADCAST
        </span>
      </div>

      {/* Main Broadcast Theatre */}
      <div className="tv-theatre">
        <div className="tv-main-stage">
          <div className="tv-disclosure">
            <span>
              GLOBALDESK <b>TV</b>
            </span>
            <small>
              {presenterMode === 'real' ? 'REALISTIC BROADCAST ANCHORS' : 'ILLUSTRATED STUDIO'} · LIVE DIGITAL EDITION
            </small>
          </div>

          {presenterMode === 'real' ? (
            <RealPresenter
              onReady={setRealReady}
              channel={channel}
              id={current?.id}
              title={current?.title || 'GlobalDesk World News Network'}
              summary={current?.summary}
              fullReport={current?.full_report}
              leadIntro={current?.lead_intro}
              bureau={current?.bureau}
              bulletPoints={current?.bullet_points}
              spokenScript={current?.spoken_text}
              source={current?.source || 'GlobalDesk News Wire'}
              playing={playing}
              voiceOn={voiceOn}
              selectedVoice={voice}
              onEnded={() => {
                setIndex((i) => (i + 1) % Math.max(items.length, 1));
                setCycle((c) => c + 1);
              }}
            />
          ) : (
            <Studio
              ref={canvas}
              title={current?.title || 'The world. In context.'}
              source={current?.source || 'GlobalDesk News Network'}
              speaking={speaking}
              demo={channel === 'demo'}
              playing={playing}
            />
          )}

          <div className="tv-stage-caption">
            <span>{playing ? '● BROADCASTING LIVE' : '○ ON STANDBY'}</span>
            <strong>
              {channel === 'markets' ? 'The Capital Desk Live' : channel === 'innovation' ? 'Tomorrow, Explained' : 'GlobalDesk World News Live'}
            </strong>
            <small>Elena Vance, Marcus Chen &amp; Aria Sterling · Live Broadcast Studio</small>
          </div>
        </div>

        {/* Up Next Rundown Playlist */}
        <aside className="tv-up-next">
          <div className="tv-queue-heading">
            <span>PROGRAMME RUNDOWN</span>
            <small>{items.length} verified stories</small>
          </div>
          <h2>In this bulletin.</h2>
          <p className="tv-queue-intro">Real-time source mapping. Dr. Bhuvan Jakkula Newsroom.</p>
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
                  }}
                >
                  <span className="tv-queue-number">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <small>{item.is_demo ? 'GLOBAL REPORT' : item.source}</small>
                    <strong>{item.title}</strong>
                  </span>
                  <span className="tv-queue-arrow">↗</span>
                </button>
              </li>
            ))}
          </ol>
          {!items.length && <p className="loading-rundown">Synchronizing newsroom rundown…</p>}
          <div className="tv-queue-footer">
            24/7 ENCRYPTED SATELLITE DISCOVERY FEED<br />
            GLOBALDESK MULTI-SOURCE VERIFICATION
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
            {current ? current.title : 'GLOBALDESK NEWS NETWORK / THE WORLD. IN CONTEXT.'}
          </span>
        </div>
        <small className="ticker-counter">
          {items.length ? `${index + 1} OF ${items.length}` : '0 / 0'}
        </small>
      </div>

      {/* Control Console */}
      <div className="tv-control-deck">
        <div className="tv-controls">
          <label>
            Presenter View
            <select
              value={presenterMode}
              onChange={(e) => {
                setPlaying(false);
                setPresenterMode(e.target.value as 'real' | 'illustrated');
              }}
            >
              <option value="real">Real Human Anchors (Elena, Marcus, Aria)</option>
              <option value="illustrated">Digital Studio Canvas</option>
            </select>
          </label>

          <button
            className={`tv-play-button ${playing ? 'is-playing' : ''}`}
            onClick={() => {
              setMessage(playing ? 'Bulletin paused' : 'Broadcasting on air…');
              setPlaying((v) => !v);
            }}
            disabled={!items.length || (presenterMode === 'real' && !realReady)}
          >
            <span aria-hidden="true">{playing ? '⏸' : '▶'}</span>
            {playing ? 'Pause Broadcast' : 'Play Live Broadcast'}
          </button>

          <button
            className="tv-secondary-btn"
            onClick={() => {
              setIndex((i) => (i + 1) % items.length);
              setCycle((c) => c + 1);
            }}
            disabled={!items.length || recording}
          >
            Next Headline ❯
          </button>

          <label>
            Channel
            <select disabled={recording} value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="live">GlobalDesk World News 24/7 Live</option>
              <option value="markets">Wall Street &amp; Capital Markets</option>
              <option value="innovation">Innovation Radar &amp; DeepTech</option>
            </select>
          </label>

          <label className="tv-voice-toggle">
            <input
              type="checkbox"
              checked={voiceOn}
              onChange={(e) => setVoiceOn(e.target.checked)}
            />
            Studio Anchor Narration
          </label>

          <label>
            Voice Model
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
            <button
              onClick={exportPreview}
              className="tv-export-btn"
              disabled={!canRecord || recording}
            >
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
              Source: <strong>{current.source}</strong> · Transmitted {current.published_at.slice(0, 16).replace('T', ' ')} UTC
            </p>
            <a href={current.url} target="_blank" rel="noopener noreferrer" className="read-source-btn">
              Inspect Source Reporting ↗
            </a>
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