'use client';
import {useEffect,useState} from 'react';
import {usePathname,useRouter} from 'next/navigation';
const PUBLIC=['/','/news','/markets','/innovation','/intelligence','/briefings','/search','/sources'];
export default function LiveUpdates(){
  const path=usePathname();const router=useRouter();const [paused,setPaused]=useState(false);const [state,setState]=useState('Connecting');const [interval,setIntervalSeconds]=useState(60);
  const enabled=PUBLIC.includes(path)||path.startsWith('/topics/')||path.startsWith('/story/');
  useEffect(()=>{
    if(!enabled||paused)return;
    let stopped=false;let busy=false;let revision='';let failures=0;let controller:AbortController|null=null;
    async function poll(){
      if(stopped||busy||document.hidden)return;
      busy=true;controller=new AbortController();const timeout=window.setTimeout(()=>controller?.abort(),4500);
      try{const response=await fetch('/api/updates',{cache:'no-store',signal:controller.signal});if(!response.ok)throw new Error();const data=await response.json();if(stopped)return;if(typeof data.revision!=='string')throw new Error();failures=0;setIntervalSeconds(data.feed_refresh_seconds||60);setState('Checking every second');
        const active=document.activeElement;const editing=active?.matches('input,textarea,select,[contenteditable="true"]');
        if(revision&&revision!==data.revision){if(!editing){revision=data.revision;router.refresh();setState('New updates loaded');}else{setState('Updates ready · finish editing to load');}}else revision=data.revision;
      }catch{if(!stopped){failures=Math.min(failures+1,5);setState('Connection interrupted · retrying');}}finally{window.clearTimeout(timeout);busy=false;}
    }
    let tick=0;const timer=window.setInterval(()=>{tick++;if(tick%Math.min(2**failures,30)===0)void poll();},1000);
    const visible=()=>{if(!document.hidden)void poll();};document.addEventListener('visibilitychange',visible);void poll();
    return()=>{stopped=true;controller?.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[enabled,paused,path,router]);
  if(!enabled)return null;
  return <div className="live-update-bar"><div className="container"><span>{paused?'Auto updates paused':state}</span><small>Connected feeds refresh every {interval}s after each fetch · source publication times vary</small><button onClick={()=>setPaused(v=>!v)} aria-pressed={paused}>{paused?'Resume updates':'Pause updates'}</button></div></div>;
}
