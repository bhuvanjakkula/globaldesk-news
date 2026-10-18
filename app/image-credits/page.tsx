import type { Metadata } from 'next';
import Link from 'next/link';
import EntertainmentCover from '@/components/EntertainmentCover';
import { ENTERTAINMENT_TOPICS } from '@/lib/api';
export const metadata: Metadata = { title: 'Image credits & editorial illustration policy' };
const photos = [
  ['Concert lights and crowds', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3'],
  ['Confetti and concert crowd', 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30'],
  ['Stage performers in red light', 'https://images.unsplash.com/photo-1503095396549-807759245b35'],
  ['Electric guitar performance', 'https://unsplash.com/photos/selective-focus-photography-of-man-playing-electric-guitar-on-stage-gioH4gHo0-g'],
];
export default function ImageCredits() {
  return <div className="container page-pad">
    <div className="breadcrumb"><Link href="/">Home</Link> / Images</div>
    <div className="topic-title"><span className="eyebrow">VISUAL TRANSPARENCY</span><h1>Image credits<span className="title-period">.</span></h1><p>These illustrations and decorative photographs are category visuals, not evidence that a reported event occurred.</p></div>
    <div className="section-head"><div><span className="section-kicker">ORIGINAL ARTWORK</span><h2>Culture collection</h2></div></div>
    <div className="image-credits-grid">{ENTERTAINMENT_TOPICS.map(t => <div key={t.slug}><EntertainmentCover slug={t.slug}/><strong>{t.name}</strong><p>Original vector illustration with optional stock photo overlay.</p></div>)}</div>
    <section className="about-body"><h2>Decorative stock photography</h2><p>Selected categories can also display representative stock photography from <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer">Unsplash under its license</a>. Photos are purely illustrative and do not depict our demo headlines. Specific usage may still need review of individual likeness, property, trademark or artwork rights.</p>
    <ul>{photos.map(([label,href]) => <li key={href}><a href={href} target="_blank" rel="noopener noreferrer">{label} ↗</a></li>)}</ul>
    <h2>No publisher news photographs</h2><p>GDELT discovery never downloads photos from publishers. Third-party news photographs, film posters, album artwork and celebrity portraits must not be copied into this website without an appropriate license or other verified legal basis.</p></section>
  </div>;
}
