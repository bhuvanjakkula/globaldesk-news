'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
export default function AccountForm(){
  const router=useRouter();const [mode,setMode]=useState<'signup'|'signin'>('signup');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  useEffect(()=>{const sync=()=>{setMode(window.location.hash==='#signin'?'signin':'signup');setError('');};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[]);
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');const data=new FormData(event.currentTarget);
    try{const response=await fetch('/account/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:mode,payload:{email:data.get('email'),password:data.get('password'),...(mode==='signup'?{mobile:data.get('mobile')}:{})}}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();if(!response.ok){setError(result.error||'Please try again.');return;}router.push('/account');router.refresh();
    }catch{setError('Unable to connect. Please try again.');}finally{setBusy(false);}
  }
  return <div className="gd-access" id="join"><span id="signin"/><span id="signup"/><div className="gd-access-top"><span className="gd-overline">YOUR WINDOW TO THE WORLD</span><span aria-hidden="true">↗</span></div><h2>{mode==='signup'?'A wider perspective starts here.':'Welcome back.'}</h2><p>{mode==='signup'?'Make room for a more informed day.':'Step back into the bigger picture.'}</p>
    <div className="gd-tabs" role="tablist" aria-label="Account access"><button type="button" role="tab" aria-selected={mode==='signup'} onClick={()=>{setMode('signup');setError('');}}>Sign up</button><button type="button" role="tab" aria-selected={mode==='signin'} onClick={()=>{setMode('signin');setError('');}}>Sign in</button></div>
    <form onSubmit={submit} key={mode} className="gd-account-form"><label htmlFor="reader-email">Email ID<input id="reader-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254}/></label><label htmlFor="reader-password">Password<input id="reader-password" name="password" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} placeholder={mode==='signup'?'Create a password':'Enter your password'} required minLength={12} maxLength={128}/></label>
      {mode==='signup'&&<><small className="gd-field-help">Use at least 12 characters.</small><label htmlFor="reader-mobile">Mobile number<input id="reader-mobile" name="mobile" type="tel" autoComplete="tel" placeholder="+91 98765 43210" required maxLength={32}/></label><small className="gd-field-help">Include your country code, starting with +.</small></>}
      {error&&<p className="gd-form-error" role="alert">{error}</p>}<button className="gd-submit" disabled={busy}>{busy?'Please wait…':mode==='signup'?'Create account':'Sign in'}<span aria-hidden="true">→</span></button>
    </form><div className="gd-form-support">Need a hand? <a href="mailto:globalnewsbhuvanjakkula@gmail.com">Contact customer support (globalnewsbhuvanjakkula@gmail.com) ↗</a></div></div>;
}
