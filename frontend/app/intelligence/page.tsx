import Link from 'next/link';
import TrackEvent from '@/components/TrackEvent';
import { getIntelligence, TOPICS, formattedDate } from '@/lib/api';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Intelligence workspace' };
type Params = Record<string, string | string[] | undefined>;
export default async function Intelligence({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const scalar = (key: string) => typeof params[key] === 'string' ? params[key] : '';
  const number = (key: string, fallback: number, max: number) => {
    const n = Number(scalar(key)); return Number.isInteger(n) && n >= 1 && n <= max ? n : fallback;
  };
  const hours = number('hours', 168, 720), min_sources = number('min_sources', 1, 20);
  const category = TOPICS.some(t => t.slug === scalar('category')) ? scalar('category') : '';
  let report;
  try { report = await getIntelligence({ hours, category, min_sources }); }
  catch { return <div className="container page-pad"><div className="empty-state"><h1>Intelligence temporarily unavailable</h1><p>The analysis service could not be reached. Please try again.</p><Link href="/intelligence">Retry workspace →</Link></div></div>; }
  return <div className="intelligence-workspace"><div className="container page-pad">
    <div className="intel-heading"><div><span className="eyebrow">GLOBALDESK / SIGNAL LAB</span><h1>Connect the coverage.</h1><p>Trace related headlines, compare publishers and inspect the evidence behind each suggested group.</p></div><span className="intel-status">● Analysis on request</span></div>
    {report.demo_articles > 0 && <p className="intel-notice"><strong>Demonstration data.</strong> {report.demo_articles} of {report.analyzed_articles} analyzed listings are fictional. Demo groups do not describe real events.</p>}
    <div className="intel-metrics" aria-label="Analysis overview">{[[report.analyzed_articles,'Listings analyzed'],[report.event_count,'Suggested groups'],[report.source_count,'Publisher domains'],[`${hours}h`,'Lookback window']].map(([value,label]) => <div key={String(label)}><strong>{value}</strong><span>{label}</span></div>)}</div>
    <form action="/intelligence" className="archive-filters intel-filters">
      <label>Lookback<select name="hours" defaultValue={hours}>{[24,72,168,720].map(h => <option key={h} value={h}>{h/24} {h===24?'day':'days'}</option>)}{![24,72,168,720].includes(hours) && <option value={hours}>{hours} hours</option>}</select></label>
      <label>Exact section<select name="category" defaultValue={category}><option value="">All sections</option>{TOPICS.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select></label>
      <label>Minimum publisher domains<select name="min_sources" defaultValue={min_sources}>{[1,2,3,5].map(n => <option key={n} value={n}>{n===1?'All coverage':`${n}+ publishers`}</option>)}{![1,2,3,5].includes(min_sources) && <option value={min_sources}>{min_sources}+ publishers</option>}</select></label>
      <div className="filter-actions"><button type="submit">Analyze coverage →</button><Link href="/intelligence">Reset</Link></div>
    </form>
    {report.truncated && <p role="status" className="intel-notice">Analysis is limited to the latest {report.sample_limit} permitted listings. Narrow the section or time window to inspect other coverage.</p>}
    <div className="intel-columns"><section aria-label="Suggested coverage groups"><div className="section-head"><div><span className="section-kicker">EVIDENCE EXPLORER</span><h2>Coverage signals</h2></div></div>
      {!report.events.length && <div className="empty-state"><h3>No matching coverage</h3><p>Expand the window or lower the minimum publisher count. Unrelated headlines remain separate.</p></div>}
      {report.events.map(event => <article className="intel-event" key={event.id}>
        <div className="intel-event-top"><span>{event.category}</span><span>{event.contains_demo?'DEMO / FICTIONAL':'SOURCE METADATA'}</span></div>
        <h3>{event.title}</h3><div className="intel-event-stats"><span>{event.article_count} {event.article_count===1?'listing':'listings'}</span><span>{event.source_count} publisher {event.source_count===1?'domain':'domains'}</span><span>{event.minimum_similarity===null?'Single listing':`Minimum similarity ${Math.round(event.minimum_similarity*100)}%`}</span></div>
        {event.shared_terms.length>0 && <div className="intel-terms" aria-label="Shared headline terms">{event.shared_terms.map(term => <span key={term}>{term}</span>)}</div>}
        <p className="intel-context">{event.countries.join(' · ')} / {formattedDate(event.first_seen)} – {formattedDate(event.last_seen)}</p>
        <details><summary>Inspect {event.article_count===1?'source listing':'coverage and provenance'} <span aria-hidden="true">↗</span></summary><ol className="intel-timeline">{event.articles.map(article => <li key={article.slug}><span className="intel-publisher">{article.source.name} · {article.source.domain}</span><Link href={`/story/${article.slug}`}>{article.title}</Link><small><time dateTime={article.published_at}>{new Date(article.published_at).toISOString().replace('T',' ').slice(0,16)} UTC</time> · {article.language}{article.is_demo?' · Fictional fixture':''}</small></li>)}</ol></details>
        <details><summary>Track this coverage over time</summary><TrackEvent slugs={event.articles.map(a=>a.slug)}/></details>
      </article>)}
    </section><aside className="intel-method"><span className="eyebrow">OPEN METHODOLOGY</span><h2>Every match is inspectable.</h2><p>Headlines are normalized into terms and weighted by their frequency in this sample. Cosine similarity compares those terms.</p><dl><dt>Grouping rule</dt><dd>Every pair must meet {Math.round(report.method.threshold*100)}% similarity and share at least {report.method.minimum_shared_terms} terms.</dd><dt>Boundaries</dt><dd>Same section and language; no more than {report.method.maximum_group_span_hours} hours apart.</dd><dt>Publication checks</dt><dd>Only published listings from permitted sources enter analysis. Blocking a source removes it on the next request.</dd></dl><p>{report.method.note}</p><p>Similarity is a matching score, not a confidence or truth rating. Publisher domains can share ownership or syndicated reporting.</p><small>Method: {report.algorithm}<br/>Computed {new Date(report.generated_at).toISOString().replace('T',' ').slice(0,16)} UTC</small><Link href="/search">Inspect the archive →</Link></aside></div>
  </div></div>;
}
