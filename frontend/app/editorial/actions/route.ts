import type { NextRequest } from 'next/server';
import { forwardOwnerAction } from '@/lib/owner-action';
export function POST(request:NextRequest){return forwardOwnerAction(request,{moderate:'/editorial/moderate'});}
