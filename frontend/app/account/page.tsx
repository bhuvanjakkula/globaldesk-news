import Link from 'next/link';
import {getReader} from '@/lib/account';
import SignOut from './SignOut';
export const dynamic='force-dynamic';
export const metadata={title:'Your account',robots:{index:false,follow:false}};
export default async function Account(){
  let reader;try{reader=await getReader();}catch{return <div className="container page-pad"><h1>Account service unavailable</h1><Link href="/account">Retry →</Link></div>;}
  if(!reader)return <div className="container page-pad"><h1>Your GlobalDesk account</h1><Link className="button-link" href="/account/access#signin">Sign in →</Link></div>;
  return <div className="container page-pad"><span className="eyebrow">GLOBALDESK / YOUR ACCOUNT</span><h1 className="gd-account-title">The world is yours to explore.</h1><p>Signed in as <strong>{reader.email}</strong></p><p>Mobile: {reader.mobile}</p><div className="gd-account-links"><Link href="/news">Open the newsroom ↗</Link><Link href="/intelligence">Explore Intelligence Lab ↗</Link><Link href="/briefings">Read the daily briefing ↗</Link></div><p>Customer support & enquiries: <a href="mailto:globalnewsbhuvanjakkula@gmail.com">globalnewsbhuvanjakkula@gmail.com</a></p><SignOut/></div>;
}
