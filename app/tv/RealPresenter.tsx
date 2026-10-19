'use client';
import { useEffect, useRef, useState } from 'react';
import { NewsroomAudioEngine } from './NewsroomAudioEngine';
import { synthesizeConciseBroadcastDispatch } from '@/lib/live-news-engine';

export interface AnchorProfile {
  id: string;
  name: string;
  title: string;
  location: string;
  image: string;
  accent: string;
  voiceGender: 'female' | 'male';
}

export const ANCHORS: AnchorProfile[] = [
  {
    id: 'elena',
    name: 'Elena Vance',
    title: 'Chief International Anchor',
    location: 'GLOBALDESK / LONDON BUREAU',
    image: '/anchors/elena.jpg',
    accent: '#06b6d4',
    voiceGender: 'female',
  },
  {
    id: 'marcus',
    name: 'Marcus Chen',
    title: 'Global Markets & Technology Anchor',
    location: 'WALL STREET / NEW YORK DESK',
    image: '/anchors/marcus.jpg',
    accent: '#3b82f6',
    voiceGender: 'male',
  },
  {
    id: 'aria',
    name: 'Aria Sterling',
    title: 'Senior Investigative & Breaking News Anchor',
    location: 'GLOBALDESK / GENEVA HUB',
    image: '/anchors/aria.jpg',
    accent: '#10b981',
    voiceGender: 'female',
  },
];

interface RealPresenterProps {
  channel: string;
  id?: string;
  title: string;
  summary?: string | null;
  fullReport?: string;
  leadIntro?: string;
  bureau?: string;
  bulletPoints?: string[];
  spokenScript?: string | null;
  source: string;
  playing: boolean;
  voiceOn: boolean;
  selectedVoice?: string;
  onEnded: () => void;
  onReady: (ready: boolean) => void;
}

export default function RealPresenter({
  channel,
  id,
  title,
  summary,
  fullReport,
  leadIntro,
  bureau,
  bulletPoints,
  spokenScript,
  source,
  playing,
  voiceOn,
  selectedVoice,
  onEnded,
  onReady,
}: RealPresenterProps) {
  const [activeAnchor, setActiveAnchor] = useState<AnchorProfile>(ANCHORS[0]);
  const [cameraAngle, setCameraAngle] = useState<'studio' | 'close' | 'split'>('studio');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioBars, setAudioBars] = useState<number[]>([25, 40, 65, 80, 55, 35, 60, 75, 45, 30, 65, 80]);
  const [clock, setClock] = useState('');
  const [sfxEnabled, setSfxEnabled] = useState(true);

  const stageRef = useRef<HTMLDivElement>(null);
  const audioEngineRef = useRef<NewsroomAudioEngine | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const currentStoryKeyRef = useRef<string | null>(null);
  const isSpeechRunningRef = useRef<boolean>(false);

  // Initialize Web Audio API Newsroom Sound Engine
  useEffect(() => {
    audioEngineRef.current = new NewsroomAudioEngine();
    return () => {
      audioEngineRef.current?.destroy();
      audioEngineRef.current = null;
    };
  }, []);

  // Sync SFX state with audio engine
  useEffect(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.setMuted(!sfxEnabled);
    }
  }, [sfxEnabled]);

  // Inform parent that realistic presenter is ready
  useEffect(() => {
    onReady(true);
  }, [onReady]);

  // Live Studio Clock
  useEffect(() => {
    function tick() {
      const d = new Date();
      setClock(d.toTimeString().slice(0, 8) + ' UTC');
    }
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  // Play breaking stinger audio chime whenever headline changes while playing
  useEffect(() => {
    if (playing && title && audioEngineRef.current && sfxEnabled) {
      audioEngineRef.current.playBreakingChime();
    }
  }, [title, playing, sfxEnabled]);

  // Animate audio waveform when speaking
  useEffect(() => {
    if (!playing || !isSpeaking) {
      setAudioBars([15, 20, 25, 30, 20, 18, 22, 28, 20, 15, 24, 18]);
      return;
    }

    const interval = setInterval(() => {
      setAudioBars([
        20 + Math.random() * 55,
        35 + Math.random() * 60,
        45 + Math.random() * 50,
        60 + Math.random() * 38,
        40 + Math.random() * 55,
        25 + Math.random() * 60,
        50 + Math.random() * 45,
        65 + Math.random() * 35,
        35 + Math.random() * 55,
        25 + Math.random() * 65,
        55 + Math.random() * 40,
        70 + Math.random() * 28,
      ]);
    }, 90);

    return () => clearInterval(interval);
  }, [playing, isSpeaking]);

  // Stop speech synthesis if playback is paused
  useEffect(() => {
    if (!playing && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      currentStoryKeyRef.current = null;
      isSpeechRunningRef.current = false;
      setIsSpeaking(false);
    }
  }, [playing]);

  // Handle Speech Synthesis Narration (Authoritative, Ultra-Concise Prime-Time Broadcast)
  useEffect(() => {
    if (!playing || !title) {
      setIsSpeaking(false);
      return;
    }

    const storyKey = `${id || title}-${activeAnchor.id}-${voiceOn ? 'voice' : 'captions'}`;

    // CRITICAL ANTI-REPEAT GUARD:
    // If this exact story is already actively speaking, do NOT restart it!
    if (currentStoryKeyRef.current === storyKey && isSpeechRunningRef.current) {
      return;
    }

    currentStoryKeyRef.current = storyKey;
    isSpeechRunningRef.current = true;

    let active = true;
    let timer: NodeJS.Timeout;
    let safetyTimer: NodeJS.Timeout;

    if (voiceOn && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Flush previous speech queue
      window.speechSynthesis.cancel();

      // Clean headline: eliminate publisher suffixes
      const cleanTitle = title
        .replace(/\s*[-|–—]\s*(Reuters|BBC|CNN|Associated Press|AP|Bloomberg|The Wall Street Journal|WSJ|The New York Times|NYT|CNBC|Forbes|Al Jazeera|The Guardian|Fox News|ABC News|NASA|Politico|MarketWatch|Deadline|Variety|Marketing Dive).*$/i, '')
        .replace(/\.$/, '')
        .trim();

      // Synthesize ultra-concise, non-repeating broadcast dispatch (15-22 words max)
      const broadcastScript = spokenScript || synthesizeConciseBroadcastDispatch(cleanTitle, fullReport || summary);

      // Clean punctuation for clear broadcast speech articulation
      const spokenText = broadcastScript
        .replace(/['’‘]/g, '')
        .replace(/["“”]/g, '')
        .replace(/[◆⚡🛰️🎙️▶⏸]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const utterance = new SpeechSynthesisUtterance(spokenText);
      utteranceRef.current = utterance;
      const voices = window.speechSynthesis.getVoices();

      // Match voice
      let matchedVoice = voices.find((v) => v.voiceURI === selectedVoice);
      if (!matchedVoice) {
        if (activeAnchor.voiceGender === 'female') {
          matchedVoice = voices.find((v) => /female|samantha|victoria|zira|karen|catherine|jenny/i.test(v.name));
        } else {
          matchedVoice = voices.find((v) => /male|david|george|alex|daniel|guy/i.test(v.name));
        }
      }
      if (!matchedVoice) {
        matchedVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }

      if (matchedVoice) utterance.voice = matchedVoice;
      utterance.rate = 1.05; // Authoritative, crisp prime-time tempo
      utterance.pitch = activeAnchor.voiceGender === 'female' ? 1.02 : 0.98;

      let hasFinished = false;
      const finishStory = (delayMs = 600) => {
        if (hasFinished) return;
        hasFinished = true;
        setIsSpeaking(false);
        isSpeechRunningRef.current = false;
        utteranceRef.current = null;
        timer = setTimeout(() => {
          if (active) onEndedRef.current();
        }, delayMs);
      };

      utterance.onstart = () => {
        if (active) setIsSpeaking(true);
      };
      utterance.onend = () => {
        if (active) finishStory(600);
      };
      utterance.onerror = (e) => {
        if (e.error === 'canceled' || e.error === 'interrupted') return;
        if (active) finishStory(1000);
      };

      // Safety timeout: transition after 14s max if browser speech stalls
      safetyTimer = setTimeout(() => {
        if (active && !hasFinished) {
          window.speechSynthesis.cancel();
          finishStory(200);
        }
      }, 14000);

      // 60ms delay ensures browser speech synthesizer flushes previous buffers cleanly
      const startTimer = setTimeout(() => {
        if (active && playing) {
          window.speechSynthesis.speak(utterance);
        }
      }, 60);

      return () => {
        active = false;
        clearTimeout(startTimer);
        clearTimeout(timer);
        clearTimeout(safetyTimer);
      };
    } else {
      // Captions mode (concise 7s dwell time per bulletin)
      setIsSpeaking(false);
      isSpeechRunningRef.current = false;
      timer = setTimeout(() => {
        if (active) onEndedRef.current();
      }, 7000);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [playing, id, title, summary, fullReport, spokenScript, voiceOn, selectedVoice, activeAnchor.id]);

  return (
    <div className={`real-studio-theatre camera-${cameraAngle}`} ref={stageRef}>
      {/* Anchor Visual Feed with Studio Atmosphere */}
      <div
        className={`real-anchor-feed ${isSpeaking ? 'anchor-speaking' : ''}`}
        style={{
          backgroundImage: `url('${activeAnchor.image}')`,
        }}
      >
        {/* Background News Wall Live Studio Atmosphere */}
        <div className="studio-light-flare" />
        <div className="studio-vignette" />

        {/* Live Studio Camera Tally Light */}
        <div className="studio-tally-bar">
          <span className="tally-dot" />
          <span className="tally-text">
            {cameraAngle === 'close'
              ? 'CAM 2 · ANCHOR CLOSE · 4K UHD'
              : cameraAngle === 'split'
              ? 'CAM 3 · SPLIT WIRE · 4K UHD'
              : 'CAM 1 · STUDIO WIDE · 4K UHD'}
          </span>
          {isSpeaking && <span className="mic-on-pill">🎙️ MIC 1: ON AIR</span>}
        </div>

        {/* Split-Screen Graphic Overlay when cameraAngle === 'split' */}
        {cameraAngle === 'split' && (
          <div className="studio-split-screen">
            <div className="split-wire-card">
              <div className="split-card-header">
                <span className="split-wire-badge">INTELLIGENCE BRIEFING</span>
                <span className="split-bureau-badge">{bureau || activeAnchor.location}</span>
              </div>
              <div className="split-topic-lead">{leadIntro || 'DISPATCH REPORT'}</div>
              <h4 className="split-wire-title">{title}</h4>
              <p className="split-wire-report">{fullReport || summary}</p>
              {bulletPoints && bulletPoints.length > 0 && (
                <ul className="split-bullet-list">
                  {bulletPoints.map((bp, i) => (
                    <li key={i}>{bp}</li>
                  ))}
                </ul>
              )}
              <div className="split-telemetry">
                <span>🛰️ SOURCE: {source.toUpperCase()}</span>
                <span>LOCK: 100% · DVB-S2</span>
              </div>
            </div>
          </div>
        )}

        {/* Live Broadcast Header Overlay */}
        <div className="live-broadcast-hud">
          <div className="hud-left">
            <span className="live-on-air-pill">
              <span className="pulse-red-dot" />
              LIVE ON AIR
            </span>
            <span className="live-channel-callout">
              {channel === 'markets'
                ? 'GLOBAL CAPITAL 24/7'
                : channel === 'innovation'
                ? 'INNOVATION RADAR TV'
                : 'GLOBALDESK WORLD NEWSROOM'}
            </span>
            <span className="live-channel-callout sat-badge">
              🛰️ INTELSAT-34 / 55.5°W · LOCK: 100%
            </span>
            <button
              type="button"
              className={`sfx-toggle-pill ${sfxEnabled ? 'sfx-on' : 'sfx-off'}`}
              onClick={() => setSfxEnabled(!sfxEnabled)}
              title="Toggle newsroom broadcast fanfare and studio audio"
            >
              <span>{sfxEnabled ? '🔊 STUDIO SFX: ON' : '🔇 SFX: OFF'}</span>
            </button>
          </div>

          <div className="hud-right">
            <div className="audio-meter" title="Live Broadcast Vocal Waveform">
              {audioBars.map((val, idx) => (
                <span
                  key={idx}
                  className="meter-bar"
                  style={{
                    height: `${val}%`,
                    backgroundColor: val > 75 ? '#ef4444' : val > 50 ? '#f59e0b' : '#10b981',
                  }}
                />
              ))}
            </div>
            <span className="studio-clock-pill">{clock}</span>
          </div>
        </div>

        {/* Anchor Selection Switcher Deck (Overlay on video) */}
        <div className="anchor-switcher-deck">
          <span className="switcher-label">LIVE PRESENTER:</span>
          {ANCHORS.map((anchor) => (
            <button
              key={anchor.id}
              type="button"
              className={`anchor-switch-btn ${activeAnchor.id === anchor.id ? 'is-active' : ''}`}
              onClick={() => setActiveAnchor(anchor)}
              title={`Switch to ${anchor.name}`}
            >
              <img src={anchor.image} alt={anchor.name} className="anchor-btn-thumb" />
              <span>{anchor.name.split(' ')[0]}</span>
            </button>
          ))}
          <div className="camera-switch-group">
            <button
              type="button"
              className={`cam-btn ${cameraAngle === 'studio' ? 'is-active' : ''}`}
              onClick={() => setCameraAngle('studio')}
              title="Wide Studio View"
            >
              WIDE
            </button>
            <button
              type="button"
              className={`cam-btn ${cameraAngle === 'close' ? 'is-active' : ''}`}
              onClick={() => setCameraAngle('close')}
              title="Anchor Close View"
            >
              ANCHOR
            </button>
            <button
              type="button"
              className={`cam-btn ${cameraAngle === 'split' ? 'is-active' : ''}`}
              onClick={() => setCameraAngle('split')}
              title="Split Wire View"
            >
              SPLIT
            </button>
          </div>
        </div>

        {/* Lower-Third News Chyron with Complete Concise News Presentation */}
        <div className="broadcast-lower-third">
          <div className="lower-third-top">
            <span className="anchor-nametag">
              <span className="nametag-dot" style={{ backgroundColor: activeAnchor.accent }} />
              <strong>{activeAnchor.name}</strong>
              <small>{activeAnchor.title}</small>
            </span>
            <div className="top-badges-group">
              <span className="bureau-badge">{bureau || activeAnchor.location}</span>
              <span className="source-cert-badge">VERIFIED: {source.toUpperCase()}</span>
            </div>
          </div>

          <div className="lower-third-main">
            <div className="breaking-flag">
              <span className="flag-icon">⚡</span> BREAKING NEWS
            </div>
            {leadIntro && (
              <div className="lead-intro-ribbon">
                <span>{leadIntro.toUpperCase()}</span>
              </div>
            )}
            <div className="lower-third-headline">
              <span className="title-text">{title}</span>
            </div>
          </div>

          {/* Complete Concise News Teleprompter Deck */}
          {(fullReport || summary) && (
            <div className="broadcast-story-deck">
              <div className="deck-header-row">
                <span className="deck-lead-label">EDITORIAL DISPATCH</span>
                <span className="deck-meta-source">{source} Wire</span>
                <span className="deck-satellite-seal">🛰️ ENCRYPTED FEED</span>
              </div>
              <p className="deck-summary-text">{fullReport || summary}</p>
              {bulletPoints && bulletPoints.length > 0 && (
                <div className="deck-bullet-takeaways">
                  {bulletPoints.slice(0, 2).map((bp, i) => (
                    <div key={i} className="deck-bullet-item">
                      <span className="bullet-diamond">◆</span>
                      <span>{bp}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-strap ticker */}
          <div className="lower-third-ticker">
            <span className="ticker-label">LIVE WIRE</span>
            <div className="ticker-scroll">
              <span>
                AUTHENTIC MULTI-SOURCE SYNDICATION · REUTERS · FORBES · BLOOMBERG · THE WALL STREET JOURNAL · FINANCIAL TIMES · THE NEW YORK TIMES · BBC · CNN · FOX NEWS · DR. BHUVAN JAKKULA DESK
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
