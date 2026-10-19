import type { Metadata } from 'next';
import Link from 'next/link';
import CompareButton from '@/components/CompareSelection';
import { notFound } from 'next/navigation';
import { formattedDate, getArticle } from '@/lib/api';
import { getArticleVisual, isEntertainment } from '@/lib/visuals';
import EntertainmentCover from '@/components/EntertainmentCover';

export const dynamic = 'force-dynamic';
type Props = { params: Promise<{slug:string}> };
export async function generateMetadata({params}: Props): Promise<Metadata> {
  const {slug} = await params;
  try { const item = await getArticle(slug); return {title: item?.title || 'Story not found', robots: {index: false}}; }
  catch { return {title:'Story'}; }
}
export default async function Story({params}: Props) {
  const {slug} = await params;
  let article;
  try { article = await getArticle(slug); }
  catch { return <div className="container page-pad"><div className="empty-state">News API unavailable.</div></div>; }
  if (!article) notFound();
  
  const visual = getArticleVisual(article);

  return (
    <div className="container page-pad story-wrap">
      <div className="breadcrumb">
        <Link href="/">Home</Link> / <Link href={`/topics/${article.category.slug}`}>{article.category.name}</Link> / Overview
      </div>
      {isEntertainment(article.category.slug) && <EntertainmentCover slug={article.category.slug} className="story-ent-cover"/>}
      <div className="story-header">
        <div className="story-meta-pills" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <span className="category-chip">{article.category.name}</span>
          <span className="meta-topic-pill">{visual.topicLabel}</span>
          {visual.isExactPublisherImage && (
            <span className="exact-image-badge" style={{ background: '#059669', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
              ORIGINAL WIRE PHOTO
            </span>
          )}
          {article.is_demo && <span className="demo-chip">DEMO / FICTIONAL</span>}
        </div>
        <h1>{article.title}</h1>
        <p className="story-deck">{article.summary || 'Publisher metadata only. Visit the original source for the complete article.'}</p>
        <div className="story-byline">
          <strong>{article.source.name}</strong> <span>·</span> {formattedDate(article.published_at)} <span>·</span> {article.country}
        </div>
      </div>

      {visual.imageUrl && (
        <div className="story-hero-media" style={{ margin: '24px 0', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#12141a' }}>
          <img src={visual.imageUrl} alt={article.title} style={{ width: '100%', maxHeight: '520px', objectFit: 'cover', display: 'block' }} />
          <div className="story-hero-caption" style={{ padding: '10px 16px', fontSize: '12px', color: '#94a3b8', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Visual Attribution: {visual.isExactPublisherImage ? `Direct photojournalism wire from ${article.source.name}` : `Respective source newsroom wire masthead: ${article.source.name}`}</span>
            <span>Verified provenance · Zero generic stock imagery</span>
          </div>
        </div>
      )}

      <CompareButton slug={article.slug}/>
      <div className="story-content">
        <div>
          <h2>{article.is_demo ? 'About this demonstration' : 'Source and publication details'}</h2>
          {article.is_demo ? (
            <>
              <p>This is an original, fictional sample written to demonstrate how the news platform presents articles by topic and region. It is not an actual breaking-news report.</p>
              <p>When approved live integrations are added, this page will provide transparent provenance and a link to the publisher’s original work. Full copyrighted articles are not mirrored here.</p>
            </>
          ) : (
            <>
              <p>This verified listing is syndicated in real-time from <strong>{article.source.name}</strong>. Full investigative reporting, complete editorial text, and multimedia assets are available directly at the publisher&apos;s digital domain.</p>
              <p>Visit the original source to read the full report, analyze primary documents, and explore follow-up coverage.</p>
            </>
          )}
          {article.url && <a className="button-link" href={article.url} target="_blank" rel="noopener noreferrer nofollow">Read original story at {article.source.name} ↗</a>}
          <Link href={`/topics/${article.category.slug}`} className="text-link">← More in {article.category.name}</Link>
        </div>
        <aside className="story-sidebar">
          <h3>Source transparency</h3>
          <dl>
            <dt>Publisher</dt>
            <dd>{article.source.name}</dd>
            <dt>Coverage</dt>
            <dd>{article.country}</dd>
            <dt>Language</dt>
            <dd>{article.language}</dd>
            <dt>Wire Status</dt>
            <dd>{article.is_demo ? 'Fictional demo' : 'Verified Live Syndicate'}</dd>
            <dt>Asset Provenance</dt>
            <dd>{visual.isExactPublisherImage ? 'Direct Publisher Media' : 'Editorial Syndicate'}</dd>
          </dl>
        </aside>
      </div>
    </div>
  );
}
