import Link from 'next/link';
import AccountForm from '@/components/AccountForm';
export const metadata={title:'Account access',robots:{index:false,follow:false}};
export default function AccountAccess(){return <div className="gd-cover gd-access-page"><div className="container"><Link className="gd-back-news" href="/">← Back to the news</Link><div className="gd-access-panel"><AccountForm/></div></div></div>;}
