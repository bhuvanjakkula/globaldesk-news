import Link from 'next/link';
import OwnerSignIn from './OwnerSignIn';
import { getOwner } from '@/lib/owner';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Owner access', robots: { index: false, follow: false } };
export default async function OwnerPage() {
  let owner;
  try { owner = await getOwner(); }
  catch { return <div className="container page-pad"><div className="empty-state"><h1>Owner service unavailable</h1><p>Your owner session could not be verified. Please retry.</p><Link href="/owner">Retry owner access →</Link></div></div>; }
  return <div className="intelligence-workspace"><div className="container page-pad">
    <div className="intel-heading"><div><span className="eyebrow">GLOBALDESK / OWNER SPACE</span><h1>{owner?'Welcome, Bhuvan.':'Your owner workspace.'}</h1></div></div>
    {owner ? <><section className="security-proof"><div><h2>{owner.email}</h2></div></section>
    <div className="security-controls"><article><h3>Research Library</h3><p>Save comparisons and private notes, and track changed source metadata.</p><Link className="subtle-link" href="/research">Open Research Library →</Link></article><article><h3>Watch Desk</h3><p>Save private topic monitors, inspect matching reasons and review changes.</p><Link className="subtle-link" href="/watchdesk">Open Watch Desk →</Link></article><article><h3>Intelligence Lab</h3><p>Explore related coverage and publisher provenance.</p><Link className="subtle-link" href="/intelligence">Open intelligence →</Link></article><article><h3>News archive</h3><p>{owner.stats.articles} stored listings. Fictional fixtures remain clearly labeled.</p><Link className="subtle-link" href="/search">Open archive →</Link></article><article><h3>Security & integrity</h3><p>Inspect protections and the cryptographic self-test.</p><Link className="subtle-link" href="/security">Open Security →</Link></article></div>
    <section className="security-proof"><div><h2>Editorial Desk</h2><p>Review stored listings and source permissions, withdraw stories, block sources and inspect audited decisions.</p><Link className="subtle-link" href="/editorial">Open Editorial Desk →</Link></div></section>
    <div className="section-head"><div><span className="section-kicker">PRIVATE ACTIVITY</span><h2>Recent operator activity</h2></div></div><ul className="security-remaining">{owner.recent_activity.map((item,index) => <li key={index}><strong>{item.action}</strong> · {item.target} · {new Date(item.created_at).toISOString().slice(0,16).replace('T',' ')} UTC</li>)}</ul>
    <form action="/owner/logout" method="post" className="owner-signin"><button type="submit">Sign out</button></form></> : <OwnerSignIn/>}
  </div></div>;
}
