'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function WatchActions({ id, unread }: { id: string; unread: number }) {
  const router = useRouter(); const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  async function action(value: 'review'|'remove') {
    if (value==='remove' && !window.confirm('Remove this monitor and its review checkpoints? You can recreate the monitor later.')) return;
    setBusy(true);setMessage('');
    try {
      const response=await fetch('/watchdesk/actions',{ method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:value,payload:{id}}),signal:AbortSignal.timeout(10000) });
      const result=await response.json();
      if (!response.ok) { setMessage(result.error || 'Action failed.');return; }
      setMessage(value==='review'?`${result.reviewed} currently sampled matching listings marked reviewed.`:'Monitor removed.');
      router.refresh();
    } catch { setMessage('Service unavailable. Please retry.'); }
    finally { setBusy(false); }
  }
  return <div className="watch-actions"><button type="button" disabled={busy || unread===0} onClick={()=>action('review')}>Mark sampled matches reviewed</button><button type="button" className="watch-remove" disabled={busy} onClick={()=>action('remove')}>Remove monitor</button>{message && <p role="status">{message}</p>}</div>;
}
