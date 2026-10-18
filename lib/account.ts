import 'server-only';
import {cookies} from 'next/headers';
export const READER_COOKIE='globaldesk_reader';
export function accountApi(path:string,init?:RequestInit){return fetch(`${process.env.INTERNAL_API_URL||'http://127.0.0.1:8000'}/api/v1/account${path}`,{...init,cache:'no-store',signal:AbortSignal.timeout(10000)});}
export async function getReader():Promise<{email:string;mobile:string;role:string}|null>{
  const token=(await cookies()).get(READER_COOKIE)?.value;if(!token)return null;
  const response=await accountApi('/me',{headers:{Authorization:`Bearer ${token}`}});
  if(response.status===401)return null;if(!response.ok)throw new Error('Account service unavailable');return response.json();
}
