import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
  const id=request.nextUrl.searchParams.get('id')||'';
  if(!/^[a-f0-9]{32}$/.test(id))return new NextResponse(null,{status:404});
  try{const headers:Record<string,string>={};const range=request.headers.get('range');if(range)headers.Range=range;
    const response=await fetch(`${process.env.INTERNAL_API_URL||'http://127.0.0.1:8000'}/api/v1/avatar/file/${id}`,{headers,cache:'no-store',signal:AbortSignal.timeout(30000)});
    if(!response.ok)return new NextResponse(null,{status:response.status});
    const output=new Headers({'Content-Type':'video/mp4','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
    for(const key of ['content-length','content-range','accept-ranges']){const value=response.headers.get(key);if(value)output.set(key,value);}
    return new NextResponse(response.body,{status:response.status,headers:output});
  }catch{return new NextResponse(null,{status:503});}
}
