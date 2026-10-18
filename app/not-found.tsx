import Link from 'next/link';
export default function NotFound() { return <div className="container page-pad"><div className="empty-state"><h1>Page not found</h1><p>That page may have moved or is not publicly available.</p><Link className="button-link" href="/">Go to homepage →</Link></div></div>; }
