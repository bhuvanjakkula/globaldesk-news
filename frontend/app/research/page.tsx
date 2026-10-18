import Link from 'next/link';
import { cookies } from 'next/headers';
import { getOwner,OWNER_COOKIE,ownerApi } from '@/lib/owner';
import type { ResearchReport } from '@/lib/evidence-types';
import CollectionEditor from './CollectionEditor';
import RemoveCollection from './RemoveCollection';
export const dynamic='force-dynamic';
export const metadata={title:'Research Library',robots:{index:false,follow:false}};
export default async function Research(){
  let report:ResearchReport;
  try{
    const owner=await getOwner();if(!owner)return <div className="container page-pad"><div className="empty-state"><h1>Your research stays private.</h1><p>Sign in to access saved research collections.</p><Link href="/owner">Owner sign-in →</Link></div></div>;
    const token=(await cookies()).get(OWNER_COOKIE)!.value;const response=await ownerApi('/research',{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw new Error('Unavailable');report=await response.json();
  }catch{return <div className="container page-pad"><div className="empty-state"><h1>Research Library unavailable</h1><p>Please retry when the API is available.</p><Link href="/research">Retry →</Link></div></div>;}
  return <div className="intelligence-workspace"><div className="container page-pad"><div className="intel-heading"><div><span className="eyebrow">GLOBALDESK / PRIVATE RESEARCH</span><h1>Keep the evidence connected.</h1><p>Saved comparisons, your research notes and visible content-change checkpoints.</p></div><span className="intel-status">{report.collections.length}/{report.limit} collections</span></div><p className="intel-notice">{report.retention} Changed fingerprints indicate altered metadata, not a verified correction or factual change.</p>
    {!report.collections.length&&<div className="watch-empty"><h2>Build your first evidence collection.</h2><p>Choose two to four stories using Compare buttons, open their comparison and save a private research note.</p><Link href="/search">Choose stories from the archive →</Link></div>}
    <div className="research-grid">{report.collections.map(collection=>{
      const current=collection.items.map(item=>item.article.slug);
      return <article className="watch-card" key={collection.id}><span className="eyebrow">VERSION {collection.version} / {new Date(collection.updated_at).toISOString().slice(0,10)} UTC</span><h2>{collection.name}</h2><p className="research-note">{collection.note||'No research note added.'}</p><div className="intel-terms"><span>{collection.changed_count} changed since saved</span><span>{collection.unavailable_count} unavailable</span></div>
        {collection.unavailable_count>0&&<p className="watch-caveat">Unavailable listings are hidden. Rebuild the selection with at least two currently permitted stories before updating the collection.</p>}
        <ul className="research-items">{collection.items.map(item=><li key={item.article.slug}><Link href={`/story/${item.article.slug}`}>{item.article.title}</Link><small>{item.article.source.name} · {item.article.is_demo?'DEMO / FICTIONAL':'Source metadata'} · {item.changed_since_saved?'Changed since saved':'Fingerprint unchanged'}</small></li>)}</ul>
        {current.length>=2&&<Link className="subtle-link" href={`/compare?slugs=${encodeURIComponent(current.join(','))}`}>Reopen current comparison →</Link>}
        {collection.unavailable_count===0&&<details className="watch-edit"><summary>Edit note & refresh baseline</summary><CollectionEditor key={collection.version} existing={collection} slugs={collection.slugs}/></details>}
        <RemoveCollection id={collection.id} version={collection.version}/></article>;
    })}</div></div></div>;
}
