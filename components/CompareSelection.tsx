'use client';
import Link from 'next/link';
import { createContext, useContext, useEffect, useState } from 'react';
const KEY='globaldesk-comparison-v1';
type Context={slugs:string[];toggle:(slug:string)=>void;clear:()=>void};
const CompareContext=createContext<Context>({slugs:[],toggle:()=>{},clear:()=>{}});
export function CompareProvider({children}:{children:React.ReactNode}) {
  const [slugs,setSlugs]=useState<string[]>([]);
  useEffect(()=>{
    try {const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(saved)) setSlugs([...new Set(saved.filter(s=>typeof s==='string'&&/^[A-Za-z0-9_-]{1,180}$/.test(s)))].slice(0,4));}catch{}
  },[]);
  function save(next:string[]) {setSlugs(next);try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}}
  return <CompareContext.Provider value={{slugs,toggle:slug=>save(slugs.includes(slug)?slugs.filter(s=>s!==slug):slugs.length<4?[...slugs,slug]:slugs),clear:()=>save([])}}>{children}{slugs.length>0&&<div className="compare-tray" role="region" aria-label="Comparison selection"><span><strong>{slugs.length}/4</strong> stories selected</span>{slugs.length>=2?<Link href={`/compare?slugs=${encodeURIComponent(slugs.join(','))}`}>Compare coverage →</Link>:<span>Select one more story</span>}<button type="button" onClick={()=>save([])}>Clear selection</button></div>}</CompareContext.Provider>;
}
export default function CompareButton({slug}:{slug:string}) {
  const {slugs,toggle}=useContext(CompareContext);const selected=slugs.includes(slug);
  return <button className="compare-button" type="button" aria-pressed={selected} disabled={!selected&&slugs.length>=4} onClick={()=>toggle(slug)}>{selected?'✓ Selected for comparison':slugs.length>=4?'Comparison full (4/4)':'＋ Compare story'}</button>;
}
