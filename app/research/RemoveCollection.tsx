'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function RemoveCollection({id,version}:{id:string;version:number}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  async function remove(){
    if(!window.confirm('Remove this research collection and your note?'))return;
    setBusy(true);
    try{const response=await fetch('/research/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'remove',payload:{id,version}}),signal:AbortSignal.timeout(10000)});const data=await response.json();if(!response.ok)setMessage(data.error||'Could not remove collection.');else router.refresh();}catch{setMessage('Service unavailable. Please retry.');}finally{setBusy(false);}
  }
  return <div className="watch-actions"><button type="button" className="watch-remove" disabled={busy} onClick={remove}>Remove collection</button>{message&&<p role="alert">{message}</p>}</div>;
}
