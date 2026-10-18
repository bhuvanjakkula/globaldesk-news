import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ArticleFeed from '@/components/ArticleFeed';
import { getArticles, TOPICS, ENTERTAINMENT_TOPICS } from '@/lib/api';
import { isEntertainment } from '@/lib/visuals';
import EntertainmentCover from '@/components/EntertainmentCover';
import EntertainmentShowcase from '@/components/EntertainmentShowcase';

export const dynamic = 'force-dynamic';
export function generateStaticParams() { return TOPICS.map(t => ({ slug: t.slug })); }
type Props = { params: Promise<{slug:string}>; searchParams: Promise<{page?:string}> };
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params; const t = TOPICS.find(item => item.slug === slug);
  return { title: t ? `${t.name} News` : 'Topic not found' };
}
export default async function TopicPage({params, searchParams}: Props) {
  const {slug} = await params;
  const topic = TOPICS.find(t => t.slug === slug);
  if (!topic) notFound();
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page || '1',10) || 1);
  let data;
  try { data = await getArticles({category:slug, page}); }
  catch { return <div className="container page-pad"><div className="empty-state"><h1>Service unavailable</h1><p>Please start the API and database.</p></div></div>; }
  if (isEntertainment(slug)) {
    return <div className="container page-pad ent-section-page">
      <div className="breadcrumb"><Link href="/">Home</Link> / <Link href="/topics/entertainment">Entertainment</Link> / {topic.name}</div>
      <section className="ent-topic-hero">
        <EntertainmentCover slug={slug} className="ent-topic-cover" />
        <div className="ent-topic-header"><span className="ent-small-tag">CULTURE / {topic.name.toUpperCase()}</span><h1>{topic.name}<span className="ent-dot">.</span></h1><p>{topic.description}</p></div>
      </section>
      <nav className="ent-genre-pills" aria-label="Browse entertainment topics"><Link href="/topics/entertainment" className={slug === 'entertainment' ? 'is-current' : ''}>All Entertainment</Link>{ENTERTAINMENT_TOPICS.map(t => <Link key={t.slug} href={`/topics/${t.slug}`} className={slug === t.slug ? 'is-current' : ''}>{t.name}</Link>)}</nav>
      {slug === 'entertainment' && <EntertainmentShowcase compact />}
      <div className="section-head"><div><span className="section-kicker">THE CULTURE DESK</span><h2>{data.total} stories &amp; features</h2></div><span className="section-sub">Illustrative content appears with demo labels</span></div>
      <ArticleFeed data={data} path={`/topics/${slug}`}/>
    </div>;
  }
  return <div className="container page-pad"><div className="breadcrumb"><Link href="/">Home</Link> / Topics / {topic.name}</div><div className="topic-title"><span className="eyebrow">GLOBAL NEWS / {topic.name.toUpperCase()}</span><h1>{topic.name}<span className="title-period">.</span></h1><p>{topic.description}</p></div><div className="section-head"><div><span className="section-kicker">CURRENT LISTINGS</span><h2>{data.total} entries</h2></div><span className="section-sub">Newest first</span></div><ArticleFeed data={data} path={`/topics/${slug}`}/></div>;
}
