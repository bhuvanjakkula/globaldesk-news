'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
export default function DecisionForm(){
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;const data=new FormData(form);setBusy(true);setMessage('');
    try{
      const response=await fetch('/editorial/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'moderate',payload:{action:data.get('decision'),target:data.get('target'),reason:data.get('reason')}}),signal:AbortSignal.timeout(10000)});
      const result=await response.json();if(!response.ok){setMessage(result.error||'Decision failed.');return;}
      setMessage('Decision saved and audited. Public visibility has been updated.');form.reset();router.refresh();
    }catch{setMessage('Service unavailable. Retry the decision.');}finally{setBusy(false);}
  }
  return <form className="collection-editor" onSubmit={submit}><h2>Record an editorial decision</h2><label>Action<select name="decision"><option value="withdraw">Withdraw a story</option><option value="block-source">Block a source</option></select></label><label>Exact story slug or source domain<input name="target" required maxLength={220}/></label><label>Reason<textarea name="reason" required minLength={12} maxLength={1000} rows={3}/></label><label><input type="checkbox" required/> I reviewed the target and intend to remove its public visibility.</label><p>Source blocking hides all its stories. Restoration and rights approval require the trusted operator workflow.</p><button disabled={busy}>{busy?'Saving…':'Save decision'}</button><p role="status">{message}</p></form>;
}
