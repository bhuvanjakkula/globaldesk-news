import Link from 'next/link';
import EntertainmentCover from '@/components/EntertainmentCover';
import { ENTERTAINMENT_TOPICS } from '@/lib/api';

export default function EntertainmentShowcase({ compact = false }: { compact?: boolean }) {
  return <section className={`ent-showcase ${compact ? 'ent-showcase-compact' : ''}`} aria-labelledby="entertainment-showcase-heading">
    <div className="section-head"><div><span className="section-kicker">THE CULTURE EDIT</span><h2 id="entertainment-showcase-heading">Entertainment, in full colour<span className="ent-dot">.</span></h2></div><Link className="subtle-link" href="/topics/entertainment">Explore entertainment →</Link></div>
    <div className="ent-showcase-layout">
      <Link href="/topics/hollywood" className="ent-hero-link">
        <EntertainmentCover slug="hollywood" className="ent-hero-cover" />
        <span className="ent-hero-caption"><span className="ent-small-tag">ON SCREEN</span><strong>Lights. Camera.<br/>Culture.</strong><span>Explore film, Hollywood &amp; everything in between <b>↗</b></span></span>
      </Link>
      <div className="ent-small-heroes">
        <Link href="/topics/music" className="ent-minor-hero"><EntertainmentCover slug="music"/><span><small>IN SOUND</small><strong>Music moves the world</strong></span></Link>
        <Link href="/topics/arts" className="ent-minor-hero"><EntertainmentCover slug="arts"/><span><small>ART &amp; CULTURE</small><strong>See things differently</strong></span></Link>
      </div>
    </div>
    <div className="genre-strip" aria-label="Entertainment categories">
      {ENTERTAINMENT_TOPICS.map(t => <Link href={`/topics/${t.slug}`} key={t.slug} className="genre-tile"><EntertainmentCover slug={t.slug}/><span>{t.name}<b>↗</b></span></Link>)}
    </div>
    <div className="art-disclosure">Cover photos and original illustrations are decorative category imagery — not photographs of the fictional example stories.</div>
  </section>;
}
