import {NextRequest,NextResponse} from 'next/server';
import {cookies} from 'next/headers';
import {allowedOwnerOrigin} from '@/lib/owner';
import {accountApi,READER_COOKIE} from '@/lib/account';
export async function POST(request:NextRequest){
  const origin=request.headers.get('origin');if(!allowedOwnerOrigin(origin))return NextResponse.json({error:'Untrusted origin'},{status:403});
  const reader=request.body?.getReader();let size=0;const chunks:Uint8Array[]=[];
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return NextResponse.json({error:'Request too large'},{status:413});}chunks.push(value);}}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  let body;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return NextResponse.json({error:'Invalid request'},{status:400});}
  if(!body||!['signup','signin','logout'].includes(body.action))return NextResponse.json({error:'Invalid action'},{status:400});
  try{
    const token=(await cookies()).get(READER_COOKIE)?.value;
    const response=await accountApi(`/${body.action}`,{method:'POST',headers:{Origin:origin!,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body.action==='logout'?{}:body.payload)});
    const data=await response.json();if(!response.ok)return NextResponse.json({error:typeof data.detail==='string'?data.detail:'Check your email, password and mobile number.'},{status:response.status});
    const result=NextResponse.json({success:true},{headers:{'Cache-Control':'private, no-store'}});
    if(body.action==='logout')result.cookies.delete(READER_COOKIE);
    else result.cookies.set(READER_COOKIE,data.session_token,{httpOnly:true,sameSite:'strict',secure:origin!.startsWith('https://'),path:'/',maxAge:data.expires_in});
    return result;
  }catch{return NextResponse.json({error:'Account service unavailable. Please retry.'},{status:503});}
}
