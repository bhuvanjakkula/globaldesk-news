import Link from 'next/link';
import CompareButton from './CompareSelection';
import { formattedDate, type NewsArticle } from '@/lib/api';
import { getArticleVisual } from '@/lib/visuals';

export default function ArticleCard({ article, featured = false }: { article: NewsArticle; featured?: boolean }) {
  const visual = getArticleVisual(article);

  return (
    <article className={`article-card ${featured ? 'article-featured' : ''}`}>
      <Link href={`/story/${article.slug}`} className="article-image-container" aria-label={article.title}>
        <div
          className="article-card-image"
          style={{ backgroundImage: `url('${visual.imageUrl}')` }}
          role="img"
          aria-label={article.title}
        >
          <div className="article-image-overlay" />
          <div className="article-image-badges">
            <span className="source-badge">
              <span className="source-dot" />
              {article.source.name}
            </span>
            {visual.isExactPublisherImage ? (
              <span className="exact-image-badge" title="Authentic Publisher Image Attached">
                ORIGINAL WIRE PHOTO
              </span>
            ) : (
              <span className="exact-image-badge" style={{ background: 'rgba(15, 23, 42, 0.85)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)' }} title="Respective Source Verified Wire Card">
                VERIFIED SOURCE WIRE
              </span>
            )}
            <span className="visual-time-badge">{visual.readingTime}</span>
          </div>
        </div>
      </Link>

      <div className="article-card-body">
        <div className="article-meta">
          <span className="category-chip">{article.category.name}</span>
          <span className="meta-topic-pill">{visual.topicLabel}</span>
          {article.is_demo && <span className="demo-chip">FICTIONAL DEMO</span>}
        </div>

        <h3>
          <Link href={`/story/${article.slug}`} title={article.title}>
            {article.title}
          </Link>
        </h3>

        <p>{article.summary || 'Metadata-only verified article listing. Open the source for the original reporting.'}</p>

        <div className="article-bottom">
          <span className="article-source-stamp">
            <span className="stamp-icon">◉</span> {article.source.name} <span className="middle-dot">·</span> {formattedDate(article.published_at)}
          </span>
          <Link href={`/story/${article.slug}`} className="read-more-link" aria-label={`Read story: ${article.title}`}>
            Read story <span className="arrow-icon">↗</span>
          </Link>
        </div>

        <CompareButton slug={article.slug} />
      </div>
    </article>
  );
}
