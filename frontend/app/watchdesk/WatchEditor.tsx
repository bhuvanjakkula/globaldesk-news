'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TOPICS } from '@/lib/api';
import type { WatchConfig } from '@/lib/watch-types';
const starters = [
  { name: 'AI & cybersecurity', keywords: 'AI, cybersecurity, software supply chain', category: 'technology' },
  { name: 'Business & markets', keywords: 'company, financing, trade', category: 'business' },
  { name: 'Music & culture', keywords: 'music, concert, rock', category: '' },
];
export default function WatchEditor({ existing }: { existing?: WatchConfig }) {
  const router = useRouter();
  const [name,setName] = useState(existing?.name || '');
  const [keywords,setKeywords] = useState(existing?.keywords.join(', ') || '');
  const [exclude,setExclude] = useState(existing?.exclude.join(', ') || '');
  const [category,setCategory] = useState(existing?.category || '');
  const [mode,setMode] = useState(existing?.match_mode || 'any');
  const [hours,setHours] = useState(existing?.hours || 168);
  const [busy,setBusy] = useState(false); const [message,setMessage] = useState('');
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    const phrases = (value: string) => value.split(',').map(t=>t.trim()).filter(Boolean);
    try {
      const response = await fetch('/watchdesk/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', payload: { ...(existing ? { id: existing.id } : {}), name, keywords: phrases(keywords), exclude: phrases(exclude), category: category || null, match_mode: mode, hours } }), signal: AbortSignal.timeout(10000) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error || 'Could not save monitor.'); return; }
      setMessage(existing ? 'Monitor updated. Review checkpoints reset for the revised monitor.' : 'Monitor saved. Matching listings are ready below.');
      if (!existing) { setName(''); setKeywords(''); setExclude(''); }
      router.refresh();
    } catch { setMessage('Service unavailable. Please retry.'); }
    finally { setBusy(false); }
  }
  return <form className="watch-editor" onSubmit={save}>
    {!existing && <><span className="eyebrow">BUILD YOUR SIGNAL FILTER</span><h2>Create a private monitor</h2><div className="watch-starters" aria-label="Starter monitor suggestions">{starters.map(starter => <button type="button" key={starter.name} onClick={()=>{setName(starter.name);setKeywords(starter.keywords);setCategory(starter.category);}}>{starter.name} +</button>)}</div></>}
    <div className="watch-fields"><label>Monitor name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required placeholder="What do you want to track?"/></label>
      <label>Words or phrases, separated by commas<input value={keywords} onChange={e=>setKeywords(e.target.value)} maxLength={480} required placeholder="AI, cybersecurity, data centers"/><small>Up to 8 phrases. Matches complete words, not parts of words.</small></label>
      <label>Exclude phrases<input value={exclude} onChange={e=>setExclude(e.target.value)} maxLength={300} placeholder="Optional noise filters"/></label>
      <label>Match rule<select value={mode} onChange={e=>setMode(e.target.value as 'any'|'all')}><option value="any">Any phrase</option><option value="all">All phrases</option></select></label>
      <label>Exact section<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All sections</option>{TOPICS.map(t=><option value={t.slug} key={t.slug}>{t.name}</option>)}</select></label>
      <label>Comparison window<select value={hours} onChange={e=>setHours(Number(e.target.value))}>{[24,72,168,720].map(h=><option key={h} value={h}>{h/24} {h===24?'day':'days'} versus previous {h/24} {h===24?'day':'days'}</option>)}</select></label>
    </div><button className="watch-primary" type="submit" disabled={busy}>{busy?'Saving…':existing?'Save changes':'Save monitor →'}</button>
    {existing && <p className="briefing-note">Saving changes resets this monitor’s review checkpoints.</p>}
    {message && <p role="status" className="watch-message">{message}</p>}
  </form>;
}
