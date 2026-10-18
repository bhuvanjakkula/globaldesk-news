import type { Metadata } from 'next';
import Link from 'next/link';
import { getSources } from '@/lib/api';
export const metadata: Metadata = {title:'Sources'};
export const dynamic = 'force-dynamic';
export default async function Sources() {
  let sources;
  try {sources = await getSources();}
  catch {return <div className="container page-pad"><div className="empty-state">News API unavailable.</div></div>;}
  return <div className="container page-pad"><div className="breadcrumb"><Link href="/">Home</Link> / Sources</div><div className="topic-title"><span className="eyebrow">TRANSPARENCY FIRST</span><h1>Our sources<span className="title-period">.</span></h1><p>Only original demos and publishers explicitly cleared for metadata display appear here.</p></div><div className="sources-list">{sources.map(s=><div className="source-row" key={s.id}><div><strong>{s.name}</strong><p>{s.domain}</p></div><span>{s.region}</span></div>)}</div><div className="source-note"><div className="source-note-icon">i</div><div><strong>Why are some news organizations missing?</strong><p>The registry includes unapproved integration candidates that are intentionally hidden from the public listing. Discovery alone does not grant publishing rights.</p></div></div></div>;
}
