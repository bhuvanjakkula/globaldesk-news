import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
  const channel=request.nextUrl.searchParams.get('channel')||'live';
  const id=request.nextUrl.searchParams.get('id');
  if(!['markets','innovation','demo','live','world'].includes(channel)||id&&id.length>180)
    return NextResponse.json({error:'Invalid channel'},{status:400});
  const params=new URLSearchParams({channel});
  if(id) params.set('identifier',id);
  try{
    const r=await fetch(`${process.env.INTERNAL_API_URL||'http://127.0.0.1:8000'}/api/v1/broadcast${id?'/check':''}?${params}`,{cache:'no-store',signal:AbortSignal.timeout(6000)});
    if(!r.ok) return NextResponse.json({error:'Bulletin unavailable'},{status:r.status});
    return NextResponse.json(await r.json(),{headers:{'Cache-Control':'no-store'}});
  }catch{
    return NextResponse.json({error:'Bulletin unavailable'},{status:503});
  }
}
