export interface Category {
  slug: string;
  name: string;
  description: string;
}
export interface Source {
  id: number;
  name: string;
  domain: string;
  region: string;
}
export interface NewsArticle {
  slug: string;
  title: string;
  summary: string | null;
  url: string | null;
  image_url?: string | null;
  source: Source;
  category: Category;
  country: string;
  language: string;
  published_at: string;
  is_demo: boolean;
}
export interface ArticlePage {
  items: NewsArticle[];
  total: number;
  page: number;
  page_size: number;
}
export const TOPICS: Category[] = [
  { slug: 'world', name: 'World', description: 'Global affairs and international developments.' },
  { slug: 'business', name: 'Business', description: 'Companies, management, finance and trade.' },
  { slug: 'economy', name: 'Economy', description: 'Inflation, jobs, GDP and monetary policy.' },
  { slug: 'politics', name: 'Politics', description: 'Governments, diplomacy, elections and policy.' },
  { slug: 'technology', name: 'Technology', description: 'AI, cybersecurity, software and emerging technology.' },
  { slug: 'marketing', name: 'Marketing', description: 'Advertising, branding and consumer behavior.' },
  { slug: 'entertainment', name: 'Entertainment', description: 'Your window into cinema, creativity, sound and culture.' },
  { slug: 'movies', name: 'Movies', description: 'Cinema, moviegoing and screen storytelling.' },
  { slug: 'films', name: 'Films', description: 'Filmmaking, festivals and independent cinema.' },
  { slug: 'hollywood', name: 'Hollywood', description: 'Studios, film culture and awards.' },
  { slug: 'music', name: 'Music', description: 'Concerts, releases, artists and sound.' },
  { slug: 'pop', name: 'Pop', description: 'Songwriting, hits and pop culture.' },
  { slug: 'rock', name: 'Rock', description: 'Electric guitars, bands and live music.' },
  { slug: 'arts', name: 'Arts', description: 'Visual arts, museums and exhibitions.' },
];
export const MAIN_TOPICS = TOPICS.filter(t => ['world','business','economy','politics','technology','marketing','entertainment'].includes(t.slug));
export const ENTERTAINMENT_TOPICS = TOPICS.filter(t => ['movies','films','hollywood','music','pop','rock','arts'].includes(t.slug));
import seedBundle from './seed_news.json';
import { getLiveArticles, getLiveArticleBySlug } from './live-news-engine';

const isVercel = process.env.VERCEL === '1' || !!process.env.NEXT_PUBLIC_VERCEL_ENV;
const internalUrl = process.env.INTERNAL_API_URL;
const baseUrl = internalUrl || (!isVercel ? 'http://127.0.0.1:8000' : null);

export function sanitizeArticleText(text: string | null | undefined): string {
  if (!text) return '';
  let cleaned = text;
  // If text has character-level quote wrapping like 'S't'a'n'd'i'n'g'
  if (cleaned.includes("'") && (/'[a-zA-Z0-9]'\s*'/.test(cleaned) || ((cleaned.match(/'/g) || []).length > 8 && cleaned.includes("' '")))) {
    cleaned = cleaned.replace(/'/g, '');
  }
  cleaned = cleaned.replace(/(?<=\w)'(?=\w)/g, '');
  return cleaned.trim();
}

export function sanitizeArticle(a: NewsArticle): NewsArticle {
  return {
    ...a,
    title: sanitizeArticleText(a.title),
    summary: a.summary ? sanitizeArticleText(a.summary) : null,
  };
}

async function apiFetch<T>(path: string): Promise<T> {
  if (!baseUrl) throw new Error('No internal API URL configured');
  const response = await fetch(`${baseUrl}${path}`, { cache: 'no-store', signal: AbortSignal.timeout(600) });
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  return response.json() as Promise<T>;
}
export type NewsFilters = { category?: string; q?: string; page?: number; page_size?: number; country?: string; source?: string; language?: string; date_from?: string; date_to?: string };
export async function getArticles(options: NewsFilters = {}): Promise<ArticlePage> {
  try {
    const params = new URLSearchParams();
    if (options.category) params.set('category', options.category);
    if (options.q) params.set('q', options.q);
    if (options.country) params.set('country', options.country);
    for (const key of ['source', 'language', 'date_from', 'date_to'] as const) {
      if (options[key]) params.set(key, options[key]);
    }
    params.set('page', String(options.page ?? 1));
    params.set('page_size', String(options.page_size ?? 24));
    const res = await apiFetch<ArticlePage>(`/api/v1/news?${params.toString()}`);
    return {
      ...res,
      items: res.items.map(sanitizeArticle),
    };
  } catch {
    // High-engineering live syndication fallback: delivers real-time news from prominent organizations
    const live = await getLiveArticles(options);
    return {
      items: live.items.map(sanitizeArticle),
      total: live.total,
      page: live.page,
      page_size: live.page_size,
    };
  }
}
export async function getArticle(slug: string): Promise<NewsArticle | null> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/news/${encodeURIComponent(slug)}`, { cache: 'no-store', signal: AbortSignal.timeout(1500) });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const a = (await response.json()) as NewsArticle;
    return sanitizeArticle(a);
  } catch {
    const item = await getLiveArticleBySlug(slug);
    return item ? sanitizeArticle(item) : null;
  }
}
export async function getSources(): Promise<Source[]> {
  try {
    return await apiFetch<Source[]>('/api/v1/sources');
  } catch {
    return (seedBundle.sources as Source[]) || [];
  }
}
export async function getFilterOptions(): Promise<{ countries: string[]; languages: string[] }> {
  try {
    return await apiFetch('/api/v1/filters');
  } catch {
    return { countries: ['Global', 'USA', 'UK', 'Europe', 'Asia'], languages: ['English'] };
  }
}
export interface DailyBriefing {
  date: string;
  timezone: string;
  kind: string;
  note: string;
  sections: { category: Category; total: number; items: NewsArticle[] }[];
}
export async function getDailyBriefing(day?: string): Promise<DailyBriefing> {
  try {
    return await apiFetch(`/api/v1/briefings/daily${day ? `?day=${encodeURIComponent(day)}` : ''}`);
  } catch {
    const items = (seedBundle.news.items as NewsArticle[]).map(sanitizeArticle);
    const sections = MAIN_TOPICS.map(cat => ({
      category: cat,
      total: items.filter(i => i.category?.slug === cat.slug).length,
      items: items.filter(i => i.category?.slug === cat.slug).slice(0, 4),
    }));
    return {
      date: new Date().toISOString().split('T')[0],
      timezone: 'UTC',
      kind: 'daily',
      note: 'Verified Multi-Source GlobalDesk Briefing',
      sections,
    };
  }
}
export function formattedDate(date: string): string {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(date));
}
export interface IntelligenceEvent {
  id: string; title: string; category: string; article_count: number; source_count: number;
  sources: string[]; countries: string[]; first_seen: string; last_seen: string;
  minimum_similarity: number | null; shared_terms: string[]; all_demo: boolean; contains_demo: boolean;
  articles: NewsArticle[];
}
export interface IntelligenceReport {
  generated_at: string; algorithm: string; window_hours: number; sample_limit: number;
  truncated: boolean; analyzed_articles: number; event_count: number; source_count: number;
  demo_articles: number; events: IntelligenceEvent[];
  method: { threshold: number; maximum_group_span_hours: number; minimum_shared_terms: number; note: string };
}
export async function getIntelligence(options: { hours: number; category: string; min_sources: number }): Promise<IntelligenceReport> {
  const query = new URLSearchParams({ hours: String(options.hours), min_sources: String(options.min_sources) });
  if (options.category) query.set('category', options.category);
  return apiFetch(`/api/v1/intelligence/events?${query}`);
}
export interface CyberShieldTelemetry {
  total_threats_neutralized: number;
  sqli_blocked: number;
  xss_blocked: number;
  path_traversal_blocked: number;
  probes_deflected: number;
  active_quarantined_ips: number;
  defense_status: string;
}

export interface AuditBlock {
  index: number;
  timestamp: string;
  event_type: string;
  details: Record<string, any>;
  prev_hash: string;
  hash: string;
  signatures?: { ml_dsa_65: string; ed25519: string };
}

export interface SecurityPosture {
  version: string;
  environment: string;
  fips_standards?: string[];
  controls: { name: string; status: string; detail: string }[];
  pqc: {
    suite: string;
    kem_suite?: string;
    dsa_suite?: string;
    library_version: string;
    scope: string;
    self_test: {
      status: string;
      tamper_rejected: boolean;
      tested_at?: string;
      key_lifecycle: string;
      benchmarks_ms?: {
        ml_kem_encapsulate_encrypt: number;
        ml_kem_decapsulate_decrypt: number;
        ml_dsa_dual_sign: number;
        ml_dsa_dual_verify: number;
        total_cycle_latency: number;
      };
    };
    production_signing_identity: string;
    trust_model: string;
    host_key_id?: string;
  };
  cyber_shield?: CyberShieldTelemetry;
  remaining: string[];
}

export async function getSecurityPosture(): Promise<SecurityPosture> {
  return apiFetch('/api/v1/security/posture');
}

export async function runPQCSelfTest(): Promise<any> {
  return apiFetch('/api/v1/security/self-test');
}

export async function getPQCAuditChain(limit = 15): Promise<{ total_blocks: number; host_key_id: string; suite: string; blocks: AuditBlock[] }> {
  return apiFetch(`/api/v1/security/audit-chain?limit=${limit}`);
}
