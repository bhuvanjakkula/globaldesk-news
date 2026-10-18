'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { CollectionConfig } from '@/lib/evidence-types';
export default function CollectionEditor({slugs,existing}:{slugs:string[];existing?:CollectionConfig}) {
  const router=useRouter();const [name,setName]=useState(existing?.name||'');const [note,setNote]=useState(existing?.note||'');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  async function save(event:React.FormEvent){
    event.preventDefault();setBusy(true);setMessage('');
    try{
      const response=await fetch('/research/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',payload:{...(existing?{id:existing.id,version:existing.version}:{}),name,note,slugs}}),signal:AbortSignal.timeout(10000)});
      const data=await response.json();if(!response.ok){setMessage(data.error||'Collection could not be saved.');return;}
      setMessage('Collection saved. Current content fingerprints are now the comparison baseline.');router.refresh();
      if(!existing){setName('');setNote('');}
    }catch{setMessage('Service unavailable. Please retry.');}finally{setBusy(false);}
  }
  return <form className="collection-editor" onSubmit={save}><h3>{existing?'Update research collection':'Save a private research collection'}</h3><label>Collection name<input value={name} onChange={e=>setName(e.target.value)} maxLength={80} required placeholder="Your research question"/></label><label>Your research note<textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={1000} rows={4} placeholder="What needs further verification?"/></label><p>Stores story identifiers, content fingerprints and your note. Saving refreshes the baseline; publisher metadata is reloaded through current permissions.</p><button type="submit" disabled={busy}>{busy?'Saving…':existing?'Save & refresh baseline':'Save collection →'}</button>{message&&<p role="status">{message} <Link href="/research">Open Research Library →</Link></p>}</form>;
}
