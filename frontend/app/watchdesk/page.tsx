import Link from 'next/link';
import CompareButton from '@/components/CompareSelection';
import { cookies } from 'next/headers';
import { getOwner, OWNER_COOKIE, ownerApi } from '@/lib/owner';
import type { WatchReport } from '@/lib/watch-types';
import WatchEditor from './WatchEditor';
import WatchActions from './WatchActions';
export const dynamic='force-dynamic';
export const metadata={ title:'Watch Desk',robots:{index:false,follow:false} };
export default async function WatchDesk() {
  let owner,report: WatchReport;
  try {
    owner=await getOwner();
    if (!owner) return <div className="container page-pad"><div className="empty-state"><span className="eyebrow">PRIVATE WATCH DESK</span><h1>Your signals stay private.</h1><p>Sign in to create topic monitors and review matching coverage.</p><Link href="/owner">Open owner sign-in →</Link></div></div>;
    const token=(await cookies()).get(OWNER_COOKIE)!.value;
    const response=await ownerApi('/watch/report',{headers:{Authorization:`Bearer ${token}`}});
    if (!response.ok) throw new Error('Report unavailable');
    report=await response.json();
  } catch { return <div className="container page-pad"><div className="empty-state"><h1>Watch Desk temporarily unavailable</h1><p>Please retry when the API is available. Your saved monitors remain in the database.</p><Link href="/watchdesk">Retry Watch Desk →</Link></div></div>; }
  const unread=report.monitors.reduce((sum,w)=>sum+w.unreviewed_count,0);
  return <div className="intelligence-workspace"><div className="container page-pad">
    <div className="intel-heading"><div><span className="eyebrow">GLOBALDESK / YOUR WATCH DESK</span><h1>Follow what matters.</h1><p>Save your signal filters. See why coverage matches. Keep your place as stories arrive or change.</p></div><span className="intel-status">Private · Owner access</span></div>
    <p className="intel-notice"><strong>Prototype content.</strong> Fictional stories remain labeled. Activity changes describe permitted listings in the sampled archive, not real-world importance or factual confidence.</p>
    <div className="intel-metrics"><div><strong>{report.monitors.length}</strong><span>Saved monitors / {report.monitor_limit}</span></div><div><strong>{unread}</strong><span>Unreviewed matches across monitors</span></div><div><strong>{report.sampled_articles}</strong><span>Listings in analysis sample</span></div><div><strong>0</strong><span>Owner access cost</span></div></div>
    <div className="watch-toolbar"><p>Updated {new Date(report.generated_at).toISOString().replace('T',' ').slice(0,16)} UTC · Evaluated when opened or refreshed</p><Link href="/watchdesk" prefetch={false}>Refresh signals ↻</Link></div>
    {report.truncated && <p role="status" className="intel-notice">Only the latest {report.sample_limit} listings are analyzed. The sample is incomplete, so percentage trends are suppressed. Counts below are observed sample counts.</p>}
    <div className="watch-layout"><section aria-label="Saved topic monitors">
      {!report.monitors.length && <div className="watch-empty"><span className="eyebrow">A DESK BUILT AROUND YOU</span><h2>Start with one question.</h2><p>Choose a starter on the right or define your own keywords. Monitors stay private and persist across browser sessions.</p><p>Try “AI” in Technology. Complete-word matching avoids unrelated words such as “said”.</p></div>}
      {report.monitors.map(monitor=><article className="watch-card" key={monitor.id}>
        <div className="watch-card-head"><div><span className="eyebrow">{monitor.category || 'All sections'} / {monitor.hours/24}-DAY WINDOW</span><h2>{monitor.name}</h2></div><span className={monitor.unreviewed_count?'watch-badge':'watch-badge watch-reviewed'}>{monitor.unreviewed_count?`${monitor.unreviewed_count} new or changed`:'Reviewed'}</span></div>
        <div className="intel-terms">{monitor.keywords.map(phrase=><span key={phrase}>{phrase}</span>)}</div><p className="watch-rule">Match {monitor.match_mode==='all'?'all':'any'} phrase{monitor.exclude.length?` · Exclude: ${monitor.exclude.join(', ')}`:''}</p>
        <div className="watch-comparison"><div><span>Current window</span><strong>{monitor.current_count}</strong><div className="watch-bar"><i style={{width:`${Math.max(monitor.current_count,monitor.previous_count)?monitor.current_count/Math.max(monitor.current_count,monitor.previous_count)*100:0}%`}}/></div></div><div><span>Previous equal window</span><strong>{monitor.previous_count}</strong><div className="watch-bar watch-bar-previous"><i style={{width:`${Math.max(monitor.current_count,monitor.previous_count)?monitor.previous_count/Math.max(monitor.current_count,monitor.previous_count)*100:0}%`}}/></div></div></div>
        <p className="watch-context"><strong>{monitor.trend}</strong>{monitor.change_percent!==null?` · ${monitor.change_percent>0?'+':''}${monitor.change_percent}% observed volume`:''} · {monitor.publisher_domains} publisher {monitor.publisher_domains===1?'domain':'domains'}{monitor.demo_count?` · ${monitor.demo_count} fictional entries`:''}</p>
        {monitor.publisher_domains===1 && monitor.current_count>0 && <p className="watch-caveat">Single-domain coverage. This is not independent corroboration.</p>}
        {!monitor.items.length && <p className="briefing-note">No permitted listings matched this window. Adjust the monitor or choose a longer lookback.</p>}
        <ol className="watch-results">{monitor.items.map(item=><li key={item.article.slug}><div className="watch-result-meta"><span>{item.article.source.name} · {item.article.is_demo?'DEMO / FICTIONAL':item.article.country}</span><span>{item.new_or_changed?'Unreviewed':'Reviewed'}</span></div><Link href={`/story/${item.article.slug}`}>{item.article.title}</Link><p>{item.evidence.map(reason=>`“${reason.phrase}” in ${reason.fields.join(' and ')}`).join(' · ')}</p><time dateTime={item.article.published_at}>{new Date(item.article.published_at).toISOString().replace('T',' ').slice(0,16)} UTC</time><CompareButton slug={item.article.slug}/></li>)}</ol>
        {monitor.has_more && <p className="briefing-note">Showing the latest {monitor.display_limit} of {monitor.current_count} sampled matches. Review action covers all currently sampled matches, including those beyond this preview.</p>}
        <WatchActions id={monitor.id} unread={monitor.unreviewed_count}/><details className="watch-edit"><summary>Edit this monitor</summary><WatchEditor existing={monitor}/></details>
      </article>)}
    </section><aside className="watch-sidebar">{report.monitors.length<report.monitor_limit?<WatchEditor/>:<div className="watch-editor"><h2>Monitor limit reached</h2><p>Edit or remove one of your twelve monitors to add another.</p></div>}<div className="watch-method"><span className="eyebrow">EXPLAINABLE BY DESIGN</span><h3>Your review checkpoint follows content.</h3><p>Marking a monitor reviewed stores a fingerprint for each sampled matching listing. A new listing or changed title, description or attribution returns to your review queue.</p><p>{report.method}</p><p>Matches can appear in several monitors. Publisher-domain counts do not establish independent reporting.</p></div></aside></div>
  </div></div>;
}
