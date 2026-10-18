import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LiveUpdates from '@/components/LiveUpdates';
import { CompareProvider } from '@/components/CompareSelection';
import './globals.css';
import './cover.css';
import './masthead.css';
import './innovation.css';
import './markets.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'GlobalDesk | Global News Intelligence', template: '%s | GlobalDesk' },
  description: 'GlobalDesk — a broader perspective on global news. Dr. Bhuvan Jakkula, Editor and Founder.',
  robots: { index: false, follow: false }, // Demo must not be indexed as real news.
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><CompareProvider><Header/><LiveUpdates/><main>{children}</main><Footer/></CompareProvider></body></html>;
}
