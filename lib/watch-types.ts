import type { NewsArticle } from './api';
export interface WatchConfig {
  id: string; name: string; keywords: string[]; exclude: string[]; match_mode: 'any' | 'all'; category: string | null; hours: number;
}
export interface WatchMonitor extends WatchConfig {
  current_count: number; previous_count: number; delta: number; change_percent: number | null; trend: string;
  unreviewed_count: number; publisher_domains: number; demo_count: number; has_more: boolean; display_limit: number;
  items: { article: NewsArticle; evidence: { phrase: string; fields: string[] }[]; new_or_changed: boolean }[];
}
export interface WatchReport {
  generated_at: string; sample_limit: number; sampled_articles: number; truncated: boolean; monitor_limit: number;
  monitors: WatchMonitor[]; method: string;
}
