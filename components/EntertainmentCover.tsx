import { coverStyle } from '@/lib/visuals';

/** Designed stock/illustration hero; never depict as evidence for a news event. */
export default function EntertainmentCover({ slug, className = '', label }: {
  slug: string; className?: string; label?: string;
}) {
  return <div
    className={`ent-cover ${className}`}
    style={coverStyle(slug)}
    role="img"
    aria-label={`Illustrative ${slug} category artwork, unrelated to a specific news event`}
  >{label && <span className="cover-label">{label}</span>}<span className="cover-disclaimer">Illustrative image</span></div>;
}
