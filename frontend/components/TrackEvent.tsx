'use client';
import {useState} from 'react';
import Link from 'next/link';
export default function TrackEvent({slugs}:{slugs:string[]}){
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [saved,setSaved]=useState(false);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const data=new FormData(event.currentTarget);setBusy(true);
    try{const response=await fetch('/events/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',payload:{title:data.get('title'),slugs}}),signal:AbortSignal.timeout(12000)});const result=await response.json();if(!response.ok){setMessage(result.error||'Could not save event.');return;}setSaved(true);setMessage('Saved as a draft in your private Event Desk.');}catch{setMessage('Service unavailable. Please retry.');}finally{setBusy(false);}
  }
  if(slugs.length>12)return <p>Choose up to 12 evidence listings in the Event Desk.</p>;
  return <form onSubmit={submit} className="event-track"><label>Your investigation label<input name="title" required maxLength={160} placeholder="e.g. Semiconductor supply investigation" disabled={saved}/></label><button disabled={busy||saved}>{saved?'Event saved':busy?'Saving…':'Track this evidence'}</button><p role="status">{message}</p><Link href={saved?'/events':'/owner'}>{saved?'Open Event Desk →':'Owner sign-in required'}</Link></form>;
}
