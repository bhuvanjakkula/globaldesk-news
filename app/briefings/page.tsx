import Link from 'next/link';
import ArticleCard from '@/components/ArticleCard';
import { getDailyBriefing } from '@/lib/api';
export const metadata = { title: 'Daily global briefing' };
export const dynamic = 'force-dynamic';
export default async function Briefings({ searchParams }: { searchParams: Promise<{ day?: string | string[] }> }) {
  const params = await searchParams;
  const day = typeof params.day === 'string' ? params.day : undefined;
  const valid = !day || (/^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) && new Date(day).toISOString().slice(0, 10) === day);
  let briefing;
  if (valid) {
    try { briefing = await getDailyBriefing(day); }
    catch { return <div className="container page-pad"><div className="empty-state"><h1>Briefing unavailable</h1><p>Please check the API and try again.</p></div></div>; }
  }
  return <div className="container page-pad">
    <div className="breadcrumb"><Link href="/">Home</Link> / Daily briefing</div>
    <div className="topic-title"><span className="eyebrow">YOUR GLOBAL READING LIST</span><h1>The daily briefing<span className="title-period">.</span></h1><p>A source-linked reading list across all sections. Entries are selected chronologically, without AI-generated analysis.</p></div>
    <form className="search-large" action="/briefings"><label htmlFor="briefing-day">Day (UTC)</label><input id="briefing-day" name="day" type="date" defaultValue={day || briefing?.date} required/><button>View briefing</button></form>
    {!valid && <p role="alert">Choose a valid calendar date.</p>}
    {briefing && <><p className="briefing-note">{briefing.note}</p>{briefing.sections.map(section => <section key={section.category.slug}><div className="section-head"><div><span className="section-kicker">{section.total} ENTRIES · {briefing.date} UTC</span><h2>{section.category.name}</h2></div><Link className="subtle-link" href={`/search?category=${section.category.slug}&date_from=${briefing.date}&date_to=${briefing.date}`}>View all →</Link></div>{section.items.length ? <div className="article-grid">{section.items.map(article => <ArticleCard key={article.slug} article={article}/>)}</div> : <p className="briefing-note">No permitted listings for this section on this date.</p>}</section>)}</>}
  </div>;
}
