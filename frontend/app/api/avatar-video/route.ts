import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
  const channel=request.nextUrl.searchParams.get('channel')||'markets';const id=request.nextUrl.searchParams.get('id')||'';
  if(!['markets','innovation','demo'].includes(channel)||!id||id.length>180)return NextResponse.json({error:'Invalid bulletin'},{status:400});
  try{const response=await fetch(`${process.env.INTERNAL_API_URL||'http://127.0.0.1:8000'}/api/v1/avatar?`+new URLSearchParams({channel,identifier:id}),{cache:'no-store',signal:AbortSignal.timeout(6000)});if(!response.ok)throw new Error();return NextResponse.json(await response.json(),{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({status:'unavailable',video_url:null},{status:503});}
}
