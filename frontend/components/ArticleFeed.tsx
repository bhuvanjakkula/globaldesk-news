import Link from 'next/link';
import ArticleCard from './ArticleCard';
import type { ArticlePage } from '@/lib/api';
export default function ArticleFeed({ data, path, query }: { data: ArticlePage; path: string; query?: Record<string, string> }) {
  function href(page: number) {
    const params = new URLSearchParams(query || {});
    params.set('page', String(page));
    return `${path}?${params.toString()}`;
  }
  return <><div className="article-grid">{data.items.map(a => <ArticleCard key={a.slug} article={a}/>)}</div>
    {data.items.length === 0 && <div className="empty-state"><h3>No items found</h3><p>Try another term or section. Newly discovered sources remain hidden until permissions are reviewed.</p></div>}
    {data.total > data.page_size && <div className="pagination"><span>Page {data.page} of {Math.ceil(data.total / data.page_size)}</span><div>{data.page > 1 && <Link href={href(data.page - 1)}>← Previous</Link>}{data.page * data.page_size < data.total && <Link href={href(data.page + 1)}>Next →</Link>}</div></div>}
  </>;
}
