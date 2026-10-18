import 'server-only';
import { cookies } from 'next/headers';
export const OWNER_COOKIE = 'globaldesk_owner';
const baseUrl = process.env.INTERNAL_API_URL || 'http://127.0.0.1:8000';
export function allowedOwnerOrigin(origin: string | null): boolean {
  const configured = process.env.OWNER_SITE_ORIGIN;
  const allowed = configured ? [configured.replace(/\/$/,'')] : ['http://127.0.0.1:3000','http://localhost:3000'];
  return origin !== null && allowed.includes(origin);
}
export function ownerApi(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}/api/v1/owner${path}`, { ...init, cache: 'no-store', signal: AbortSignal.timeout(8000) });
}
export interface OwnerProfile {
  email: string; role: string; access: string; payment_required: boolean; price: number; expires_at: string;
  stats: { articles: number; sources: number };
  recent_activity: { action: string; target: string; created_at: string }[];
}
export async function getOwner(): Promise<OwnerProfile | null> {
  const token = (await cookies()).get(OWNER_COOKIE)?.value;
  if (!token) return null;
  const response = await ownerApi('/me', { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Owner service unavailable');
  return response.json();
}
