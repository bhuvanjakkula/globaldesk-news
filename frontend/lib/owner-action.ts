import 'server-only';
import { cookies } from 'next/headers';
import { NextRequest,NextResponse } from 'next/server';
import { allowedOwnerOrigin,OWNER_COOKIE,ownerApi } from './owner';
export async function forwardOwnerAction(request:NextRequest,allowed:Record<string,string>) {
  const origin=request.headers.get('origin');
  if(!allowedOwnerOrigin(origin)) return NextResponse.json({error:'Untrusted origin'},{status:403});
  const token=(await cookies()).get(OWNER_COOKIE)?.value;
  if(!token)return NextResponse.json({error:'Owner sign-in required'},{status:401});
  const reader=request.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return NextResponse.json({error:'Request too large'},{status:413});}chunks.push(value);}}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return NextResponse.json({error:'Invalid request'},{status:400});}
  if(!body||typeof body.action!=='string'||!Object.hasOwn(allowed,body.action))return NextResponse.json({error:'Invalid action'},{status:400});
  try{
    const response=await ownerApi(allowed[body.action],{method:'POST',headers:{Origin:origin!,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body.payload)});
    const result=await response.json();
    if(!response.ok)return NextResponse.json({error:typeof result.detail==='string'?result.detail:'Check the fields and try again.'},{status:response.status});
    return NextResponse.json(result,{headers:{'Cache-Control':'private, no-store'}});
  }catch{return NextResponse.json({error:'Owner service unavailable. Please retry.'},{status:503});}
}
