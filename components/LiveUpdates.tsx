'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const PUBLIC = ['/', '/news', '/markets', '/innovation', '/intelligence', '/briefings', '/search', '/sources'];

export default function LiveUpdates() {
  const path = usePathname();
  const router = useRouter();
  const [paused, setPaused] = useState(false);
  const [state, setState] = useState('Connecting to live newsroom...');
  const [interval, setIntervalSeconds] = useState(15);

  const enabled = PUBLIC.includes(path) || path.startsWith('/topics/') || path.startsWith('/story/');

  useEffect(() => {
    if (!enabled || paused) return;
    let stopped = false;
    let busy = false;
    let revision = '';
    let failures = 0;
    let controller: AbortController | null = null;

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
        setIntervalSeconds(data.feed_refresh_seconds || 15);

        const active = document.activeElement;
        const editing = active?.matches('input,textarea,select,[contenteditable="true"]');

        if (revision && revision !== data.revision) {
          revision = data.revision;
          if (!editing) {
            router.refresh();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('globaldesk:news-updated'));
            }
            setState('Live reports updated to front page');
            setTimeout(() => {
              if (!stopped) setState('Live newsroom connected · Auto-updates every 2 minutes · Strictly Today News Only');
            }, 4000);
          } else {
            setState('Updates ready · finish editing to load');
          }
        } else {
          revision = data.revision;
          setState('Live newsroom connected · Auto-updates every 2 minutes · Strictly Today News Only');
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

    let tick = 0;
    const timer = window.setInterval(() => {
      tick++;
      if (tick % Math.min(2 ** failures, 15) === 0) void poll();
    }, 1000);

    const visible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener('visibilitychange', visible);
    void poll();

    return () => {
      stopped = true;
      controller?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [enabled, paused, path, router]);

  if (!enabled) return null;

  return (
    <div className="live-update-bar">
      <div className="container">
        <span>{paused ? 'Auto updates paused' : state}</span>
        <small>Prominent international wires (Reuters, AP, Bloomberg, WSJ, NYT, BBC, CNN, CNBC, FT, Forbes, Fox News, ABC News, NASA) · Auto-updating every 2 minutes · Strictly Today Only</small>
        <button onClick={() => setPaused((v) => !v)} aria-pressed={paused}>
          {paused ? 'Resume updates' : 'Pause updates'}
        </button>
      </div>
    </div>
  );
}
