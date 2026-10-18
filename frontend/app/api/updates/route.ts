import {NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(){
  try{const response=await fetch(`${process.env.INTERNAL_API_URL||'http://127.0.0.1:8000'}/api/v1/updates`,{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!response.ok)throw new Error();return NextResponse.json(await response.json(),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({error:'Update check unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
