import Link from 'next/link';
import {cookies} from 'next/headers';
import {getOwner,OWNER_COOKIE,ownerApi} from '@/lib/owner';
import DecisionForm from './DecisionForm';
export const dynamic='force-dynamic';
export const metadata={title:'Editorial Desk',robots:{index:false,follow:false}};
type Report={page:number;has_more:boolean;articles:{slug:string;title:string;status:string;source:string;is_demo:boolean}[];sources:{domain:string;name:string;status:string;expires_at:string|null}[];ingestion_runs:{id:string;status:string;started_at:string;finished_at:string|null;results:Record<string,unknown>}[];audit:{action:string;target:string;actor:string;reason:string;created_at:string}[]};
export default async function Editorial({searchParams}:{searchParams:Promise<{page?:string}>}){
  const requested=Number((await searchParams).page||1);const page=Number.isInteger(requested)&&requested>0&&requested<=10000?requested:1;
  let report:Report;
  try{
    if(!await getOwner())return <div className="container page-pad"><h1>Private Editorial Desk</h1><Link href="/owner">Sign in as owner →</Link></div>;
    const token=(await cookies()).get(OWNER_COOKIE)!.value;
    const response=await ownerApi(`/editorial?page=${page}`,{headers:{Authorization:`Bearer ${token}`}});
    if(!response.ok)throw new Error('Unavailable');report=await response.json();
  }catch{return <div className="container page-pad"><h1>Editorial service unavailable</h1><Link href="/editorial">Retry →</Link></div>;}
  return <div className="container page-pad"><span className="eyebrow">GLOBALDESK / PRIVATE EDITORIAL</span><h1>Editorial Desk</h1><p>Review stored listings, remove public visibility and inspect the decision record.</p><DecisionForm/>
    <h2>Stored listings · page {report.page}</h2><ul className="research-items">{report.articles.map(a=><li key={a.slug}><strong>{a.title}</strong><small>{a.slug} · {a.source} · {a.status} {a.is_demo?'· DEMO / FICTIONAL':''}</small></li>)}</ul><nav aria-label="Editorial pages">{page>1&&<Link href={`/editorial?page=${page-1}`}>← Previous </Link>}{report.has_more&&<Link href={`/editorial?page=${page+1}`}>Next →</Link>}</nav>
    <h2>Discovery job history</h2><p>Latest 20 runs. A running job without a finish time may have been interrupted; inspect the worker before retrying.</p>{!report.ingestion_runs.length&&<p>No discovery runs recorded.</p>}<ul className="research-items">{report.ingestion_runs.map(r=><li key={r.id}><strong>{r.status}</strong> · {r.started_at}<small>{r.finished_at?`Finished ${r.finished_at}`:'No finish recorded'}</small><details><summary>Section results</summary><pre>{JSON.stringify(r.results,null,2)}</pre></details></li>)}</ul>
    <h2>Source registry</h2><ul className="research-items">{report.sources.map(s=><li key={s.domain}>{s.name}<small>{s.domain} · {s.status} · {s.expires_at?`Rights expire ${s.expires_at}`:'No expiry recorded'}</small></li>)}</ul>
    <h2>Latest 50 audit records</h2><ul className="research-items">{report.audit.map((a,i)=><li key={i}><strong>{a.action}</strong> · {a.target}<small>{a.actor} · {a.created_at}</small><p>{a.reason}</p></li>)}</ul></div>;
}
