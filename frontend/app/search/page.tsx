import type { Metadata } from 'next';
import Link from 'next/link';
import ArticleFeed from '@/components/ArticleFeed';
import { getArticles, getSources, getFilterOptions, TOPICS } from '@/lib/api';
export const metadata: Metadata = { title: 'Search & archives' };
export const dynamic = 'force-dynamic';
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function Search({ searchParams }: Props) {
  const params = await searchParams;
  const value = (key: string, max = 150) => (typeof params[key] === 'string' ? params[key] : '').slice(0, max);
  const query = Object.fromEntries(['q', 'country', 'category', 'source', 'language', 'date_from', 'date_to'].map(k => [k, value(k)]).filter(([, v]) => v));
  const page = Math.max(1, Number.parseInt(value('page') || '1', 10) || 1);
  const validDate = (v?: string) => !v || (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v);
  const invalidDates = !validDate(query.date_from) || !validDate(query.date_to) || (query.date_from && query.date_to && query.date_from > query.date_to);
  let sources, filters, data;
  try {
    [sources, filters] = await Promise.all([getSources(), getFilterOptions()]);
    if (!invalidDates) data = await getArticles({ ...query, page });
  } catch { return <div className="container page-pad"><div className="empty-state"><h1>Search temporarily unavailable</h1><p>Check the API connection and try again.</p></div></div>; }
  return <div className="container page-pad">
    <div className="breadcrumb"><Link href="/">Home</Link> / Search & archives</div>
    <div className="topic-title"><span className="eyebrow">FIND YOUR STORY</span><h1>Explore news<span className="title-period">.</span></h1><p>Search permitted headlines and descriptions. Combine topics, publishers, regions, languages and publication dates.</p></div>
    <form action="/search" className="archive-filters">
      <label className="filter-wide">Keywords<input name="q" defaultValue={query.q} maxLength={150} placeholder="Company, person or topic…" /></label>
      <label>Section<select name="category" defaultValue={query.category || ''}><option value="">All sections</option>{TOPICS.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select></label>
      <label>Publisher<select name="source" defaultValue={query.source || ''}><option value="">All approved sources</option>{sources.map(s => <option key={s.domain} value={s.domain}>{s.name}</option>)}</select></label>
      <label>Country / region<select name="country" defaultValue={query.country || ''}><option value="">All regions</option>{filters.countries.map(c => <option key={c}>{c}</option>)}</select></label>
      <label>Language<select name="language" defaultValue={query.language || ''}><option value="">All languages</option>{filters.languages.map(l => <option key={l}>{l}</option>)}</select></label>
      <label>From (UTC)<input type="date" name="date_from" defaultValue={query.date_from} /></label>
      <label>Through (UTC)<input type="date" name="date_to" defaultValue={query.date_to} /></label>
      <div className="filter-actions"><button type="submit">Search archive →</button><Link href="/search">Reset filters</Link></div>
    </form>
    {invalidDates ? <p role="alert">Choose valid dates with the start on or before the end.</p> : data && <><div className="section-head"><div><span className="section-kicker">SEARCH RESULTS</span><h2>{data.total} entries {query.q && `for “${query.q}”`}</h2></div></div><ArticleFeed data={data} path="/search" query={query} /></>}
  </div>;
}
