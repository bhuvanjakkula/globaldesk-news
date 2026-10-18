import Link from 'next/link';

export default function Footer() {
  const support = (
    <a href="mailto:globalnewsbhuvanjakkula@gmail.com" title="Email Enquiry and Customer Support">
      Email Enquiry &amp; Support: globalnewsbhuvanjakkula@gmail.com
    </a>
  );
  return (
    <footer className="footer">
      <div className="container footer-content">
        <div>
          <div className="footer-brand">◎ GLOBALDESK</div>
          <p>Global discovery. Original sources. Clear editorial boundaries.</p>
          <p className="fineprint">
            Prototype: all seeded stories are fictional educational demos. External headlines require individual permission checks.
          </p>
        </div>
        <div className="footer-links">
          {support}
          <Link href="/about">About &amp; methodology</Link>
          <Link href="/sources">Available sources</Link>
          <Link href="/image-credits">Image credits &amp; disclosures</Link>
          <a href="https://www.gdeltproject.org/" target="_blank" rel="noopener noreferrer">GDELT Project ↗</a>
        </div>
      </div>
    </footer>
  );
}
