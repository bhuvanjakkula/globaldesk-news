'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// Live updates active across ALL news and ALL sections
export default function LiveUpdates() {
  const path = usePathname();
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState('Connecting to live newsroom...');
  const [interval, setIntervalSeconds] = useState(120);

  // Enabled on ALL public news sections and segments
  const enabled = !path.startsWith('/owner');

  useEffect(() => {
    if (!enabled || paused) return;
    let stopped = false;
    let busy = false;
    let revision = '';
    let failures = 0;
    let controller: AbortController | null = null;

    const triggerFullRefresh = () => {
      const active = document.activeElement;
      const editing = active?.matches('input,textarea,select,[contenteditable="true"]');
      if (!editing) {
        router.refresh();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('globaldesk:news-updated'));
        }
        setState('All news sections updated with latest 2-minute wire coverage');
        setTimeout(() => {
          if (!stopped) setState('Live engine active · Always updating every 2 minutes · All sections · Strictly today news');
        }, 5000);
      }
    };

    async function poll() {
      if (stopped || busy || document.hidden) return;
      busy = true;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 12000);

      try {
        const response = await fetch('/api/updates', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (stopped) return;
        if (typeof data.revision !== 'string') throw new Error('Invalid revision');

        failures = 0;
        setIntervalSeconds(data.feed_refresh_seconds || 120);

        if (revision && revision !== data.revision) {
          revision = data.revision;
          triggerFullRefresh();
        } else {
          revision = data.revision;
          setState('Live engine active · Always updating every 2 minutes · All sections · Strictly today news');
        }
      } catch {
        if (!stopped) {
          failures = Math.min(failures + 1, 5);
          if (failures >= 3) {
            setState('Reconnecting to live wires…');
          } else {
            setState('Synchronizing live newsroom feeds…');
          }
        }
      } finally {
        window.clearTimeout(timeout);
        busy = false;
      }
    }

    // Fast-check poll for instant revision changes (every 15s)
    let tick = 0;
    const timer = window.setInterval(() => {
      tick++;
      if (tick % Math.min(2 ** failures, 15) === 0) void poll();
    }, 1000);

    // Guaranteed 2-minute clock cycle (120 seconds): unconditionally triggers fresh news across all sections
    const hardRefreshTimer = window.setInterval(() => {
      triggerFullRefresh();
      void poll();
    }, 120000);

    const visible = () => {
      if (!document.hidden) {
        void poll();
      }
    };
    document.addEventListener('visibilitychange', visible);
    void poll();

    return () => {
      stopped = true;
      controller?.abort();
      window.clearInterval(timer);
      window.clearInterval(hardRefreshTimer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [enabled, paused, path, router]);

  if (!enabled) return null;

  return (
    <div className="live-update-bar">
      <div className="container">
        <span>{paused ? 'Auto updates paused' : state}</span>
        <small>Prominent international wires (Reuters, AP, Bloomberg, WSJ, NYT, BBC, CNN, CNBC, FT, Forbes, Fox News, ABC News, NASA) · Auto-updating every 2 minutes · Strictly Today News Only</small>
        <button onClick={() => setPaused((v) => !v)} aria-pressed={paused}>
          {paused ? 'Resume updates' : 'Pause updates'}
        </button>
      </div>
    </div>
  );
}
