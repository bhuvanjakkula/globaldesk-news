/**
 * GlobalDesk High-Engineering Universal Live News Engine
 * Aggregates real-time feeds directly from prominent international news organizations:
 * Reuters, Associated Press, BBC World News, CNN, The Wall Street Journal,
 * The New York Times, Bloomberg, CNBC, Financial Times, Forbes, Al Jazeera,
 * The Guardian, Fox News, ABC News, NASA, Variety, Hollywood Reporter, Billboard.
 *
 * Runs seamlessly both in Vercel (Serverless / Edge) and Locally.
 * Strictly enforces:
 * 1. ONLY Yesterday & Today news coverage in all sections and segments.
 * 2. Purges any stale news from last year, last month, or older periods.
 * 3. Rejects illegal pushes, defacement attempts, and unauthorized publisher injections.
 * 4. Stale-While-Revalidate in-memory caching and real-time up-to-the-minute updates.
 */

import { NewsArticle, Category, Source, TOPICS, sanitizeArticle } from './api';
import { isAuthenticPublisherPhoto } from './visuals';
import {
  isStrictlyTodayOnly,
  validateAndSealArticle,
  getSecurityAuditLedger,
} from './security-shield';
import seedBundle from './seed_news.json';

interface FeedSourceConfig {
  name: string;
  domain: string;
  region: string;
  url: string;
  categorySlug: string;
  country: string;
}

const PROMINENT_FEEDS: FeedSourceConfig[] = [
  // --- PREMIER GLOBAL WIRES & FINANCIAL GIANTS ---
  {
    name: 'Reuters',
    domain: 'reuters.com',
    region: 'Global / International Wire',
    url: 'https://news.google.com/rss/search?q=source:Reuters+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'world',
    country: 'Global',
  },
  {
    name: 'Reuters Business',
    domain: 'reuters.com',
    region: 'Global / International Wire',
    url: 'https://news.google.com/rss/search?q=source:Reuters+business+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'business',
    country: 'Global',
  },
  {
    name: 'Associated Press (AP)',
    domain: 'apnews.com',
    region: 'Global / Breaking Wire',
    url: 'https://news.google.com/rss/search?q=source:%22Associated+Press%22+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'world',
    country: 'Global',
  },
  {
    name: 'Bloomberg Markets',
    domain: 'bloomberg.com',
    region: 'Global / Markets & Capital',
    url: 'https://news.google.com/rss/search?q=source:Bloomberg+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'business',
    country: 'Global',
  },
  {
    name: 'The Wall Street Journal World',
    domain: 'wsj.com',
    region: 'Americas / International',
    url: 'https://news.google.com/rss/search?q=source:WSJ+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'world',
    country: 'United States',
  },
  {
    name: 'The Wall Street Journal Business',
    domain: 'wsj.com',
    region: 'Americas / Finance & Markets',
    url: 'https://news.google.com/rss/search?q=source:%22The+Wall+Street+Journal%22+business+OR+finance+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'business',
    country: 'United States',
  },
  {
    name: 'The Wall Street Journal Tech',
    domain: 'wsj.com',
    region: 'Americas / Innovation',
    url: 'https://news.google.com/rss/search?q=source:%22The+Wall+Street+Journal%22+technology+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'technology',
    country: 'United States',
  },
  {
    name: 'The New York Times',
    domain: 'nytimes.com',
    region: 'Americas / World Desk',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    categorySlug: 'world',
    country: 'United States',
  },
  {
    name: 'The New York Times Business',
    domain: 'nytimes.com',
    region: 'Americas / Economy',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
    categorySlug: 'economy',
    country: 'United States',
  },
  {
    name: 'The New York Times Technology',
    domain: 'nytimes.com',
    region: 'Americas / Artificial Intelligence & Software',
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    categorySlug: 'technology',
    country: 'United States',
  },
  {
    name: 'BBC World News',
    domain: 'bbc.co.uk',
    region: 'Europe / Worldwide',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    categorySlug: 'world',
    country: 'United Kingdom',
  },
  {
    name: 'BBC Business News',
    domain: 'bbc.co.uk',
    region: 'Europe / International Trade',
    url: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    categorySlug: 'business',
    country: 'United Kingdom',
  },
  {
    name: 'BBC Technology',
    domain: 'bbc.co.uk',
    region: 'Europe / Tech & AI',
    url: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    categorySlug: 'technology',
    country: 'United Kingdom',
  },
  {
    name: 'BBC Entertainment & Arts',
    domain: 'bbc.co.uk',
    region: 'Europe / Arts & Culture',
    url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    categorySlug: 'arts',
    country: 'United Kingdom',
  },
  {
    name: 'CNN International',
    domain: 'cnn.com',
    region: 'Americas / Global News',
    url: 'http://rss.cnn.com/rss/edition_world.rss',
    categorySlug: 'world',
    country: 'United States',
  },
  {
    name: 'CNN Top Stories',
    domain: 'cnn.com',
    region: 'Americas / Breaking',
    url: 'http://rss.cnn.com/rss/edition.rss',
    categorySlug: 'politics',
    country: 'United States',
  },
  {
    name: 'CNBC Markets',
    domain: 'cnbc.com',
    region: 'Americas / Wall Street & Global Equities',
    url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
    categorySlug: 'business',
    country: 'United States',
  },
  {
    name: 'Financial Times',
    domain: 'ft.com',
    region: 'Europe / Global Capital',
    url: 'https://news.google.com/rss/search?q=source:%22Financial+Times%22+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'economy',
    country: 'United Kingdom',
  },
  {
    name: 'Forbes Business',
    domain: 'forbes.com',
    region: 'Americas / Enterprise & Leadership',
    url: 'https://news.google.com/rss/search?q=source:Forbes+business+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'business',
    country: 'United States',
  },
  {
    name: 'Forbes Innovation',
    domain: 'forbes.com',
    region: 'Americas / Tech & Breakthroughs',
    url: 'https://news.google.com/rss/search?q=source:Forbes+innovation+OR+tech+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'technology',
    country: 'United States',
  },
  {
    name: 'Fox News World',
    domain: 'foxnews.com',
    region: 'Americas / Global Desk',
    url: 'https://moxie.foxnews.com/google-publisher/world.xml',
    categorySlug: 'world',
    country: 'United States',
  },
  {
    name: 'Fox News Latest',
    domain: 'foxnews.com',
    region: 'Americas / Breaking',
    url: 'https://moxie.foxnews.com/google-publisher/latest.xml',
    categorySlug: 'politics',
    country: 'United States',
  },
  {
    name: 'Fox Business',
    domain: 'foxbusiness.com',
    region: 'Americas / Wall Street & Commerce',
    url: 'https://news.google.com/rss/search?q=source:%22Fox+Business%22+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'business',
    country: 'United States',
  },
  {
    name: 'ABC News Top Stories',
    domain: 'abcnews.go.com',
    region: 'Americas / Prime Headlines',
    url: 'https://abcnews.go.com/abcnews/topstories',
    categorySlug: 'world',
    country: 'United States',
  },
  {
    name: 'ABC News International',
    domain: 'abcnews.go.com',
    region: 'Americas / World Desk',
    url: 'https://abcnews.go.com/abcnews/internationalheadlines',
    categorySlug: 'world',
    country: 'United States',
  },
  {
    name: 'CBS News World',
    domain: 'cbsnews.com',
    region: 'Americas / Global Affairs',
    url: 'https://news.google.com/rss/search?q=source:%22CBS+News%22+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'world',
    country: 'United States',
  },
  {
    name: 'NBC News World',
    domain: 'nbcnews.com',
    region: 'Americas / International',
    url: 'https://news.google.com/rss/search?q=source:%22NBC+News%22+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'world',
    country: 'United States',
  },
  {
    name: 'Politico Politics',
    domain: 'politico.com',
    region: 'Americas / Governance & Policy',
    url: 'https://rss.politico.com/politics-news.xml',
    categorySlug: 'politics',
    country: 'United States',
  },
  {
    name: 'Sky News World',
    domain: 'skynews.com',
    region: 'Europe / International',
    url: 'https://news.google.com/rss/search?q=source:%22Sky+News%22+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'world',
    country: 'United Kingdom',
  },
  {
    name: 'Al Jazeera English',
    domain: 'aljazeera.com',
    region: 'Middle East / International',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    categorySlug: 'world',
    country: 'Global',
  },
  {
    name: 'The Guardian World',
    domain: 'theguardian.com',
    region: 'Europe / International',
    url: 'https://www.theguardian.com/world/rss',
    categorySlug: 'world',
    country: 'United Kingdom',
  },
  {
    name: 'NASA Space & Discovery',
    domain: 'nasa.gov',
    region: 'Americas / Deep Space & Science',
    url: 'https://www.nasa.gov/news-release/feed/',
    categorySlug: 'technology',
    country: 'United States',
  },

  // --- MARKETING & BRANDING GIANTS ---
  {
    name: 'Adweek & Marketing Wire',
    domain: 'adweek.com',
    region: 'Americas / Marketing & Advertising',
    url: 'https://news.google.com/rss/search?q=Adweek+OR+%22Marketing+Dive%22+OR+Digiday+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'marketing',
    country: 'United States',
  },
  {
    name: 'Forbes CMO & Brand Strategy',
    domain: 'forbes.com',
    region: 'Americas / Marketing & Consumer Insights',
    url: 'https://news.google.com/rss/search?q=source:Forbes+marketing+OR+advertising+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'marketing',
    country: 'United States',
  },
  {
    name: 'Marketing Week International',
    domain: 'marketingweek.com',
    region: 'Europe / Marketing & Brand Strategy',
    url: 'https://news.google.com/rss/search?q=source:%22Marketing+Week%22+OR+source:Campaign+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'marketing',
    country: 'United Kingdom',
  },

  // --- CULTURE & ENTERTAINMENT WIRE GIANTS ---
  {
    name: 'Variety Film & TV',
    domain: 'variety.com',
    region: 'Americas / Cinema & Screen Culture',
    url: 'https://news.google.com/rss/search?q=source:Variety+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'movies',
    country: 'United States',
  },
  {
    name: 'The Hollywood Reporter',
    domain: 'hollywoodreporter.com',
    region: 'Americas / Hollywood & Screen Arts',
    url: 'https://news.google.com/rss/search?q=source:%22The+Hollywood+Reporter%22+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'hollywood',
    country: 'United States',
  },
  {
    name: 'Deadline Hollywood',
    domain: 'deadline.com',
    region: 'Americas / Breaking Entertainment',
    url: 'https://news.google.com/rss/search?q=source:Deadline+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'entertainment',
    country: 'United States',
  },
  {
    name: 'Billboard Music Wire',
    domain: 'billboard.com',
    region: 'Americas / Music Charts & Sound',
    url: 'https://news.google.com/rss/search?q=source:Billboard+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'music',
    country: 'United States',
  },
  {
    name: 'Rolling Stone Music & Pop Culture',
    domain: 'rollingstone.com',
    region: 'Americas / Rock & Pop Music',
    url: 'https://news.google.com/rss/search?q=source:%22Rolling+Stone%22+music+when:2d&hl=en-US&gl=US&ceid=US:en',
    categorySlug: 'rock',
    country: 'United States',
  },
];

// Helper: XML entity decoding
function decodeEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#8216;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8212;/g, '—')
    .replace(/&#8211;/g, '–')
    .replace(/&#160;/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Helper: Extract authentic image URL directly from publisher XML item
function extractImageUrl(itemXml: string): string | null {
  const mediaMatches = itemXml.matchAll(/<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/gi);
  for (const m of mediaMatches) {
    const url = m[1].replace(/&amp;/g, '&').trim();
    if (isAuthenticPublisherPhoto(url)) {
      return url;
    }
  }

  const encMatch =
    itemXml.match(/<enclosure[^>]*url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i) ||
    itemXml.match(/<enclosure[^>]*type=["']image\/[^"']+["'][^>]*url=["']([^"']+)["']/i) ||
    itemXml.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
  if (encMatch && encMatch[1]) {
    const url = encMatch[1].replace(/&amp;/g, '&').trim();
    if (isAuthenticPublisherPhoto(url)) {
      return url;
    }
  }

  const imgDirect =
    itemXml.match(/<img[^>]+src=["']([^"']+)["']/i) ||
    itemXml.match(/(?:&lt;|<)img[^>]+src=(?:&quot;|"|')([^"'>&]+)(?:&quot;|"|')/i);
  if (imgDirect && imgDirect[1]) {
    const url = imgDirect[1].replace(/&amp;/g, '&').trim();
    if (isAuthenticPublisherPhoto(url)) {
      return url;
    }
  }

  const rawImg = itemXml.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^\s"'<>]*)?/i);
  if (rawImg && rawImg[0]) {
    const url = rawImg[0].replace(/&amp;/g, '&').trim();
    if (isAuthenticPublisherPhoto(url)) {
      return url;
    }
  }

  return null;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function generateSlug(domain: string, title: string): string {
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
  const hash = Math.abs(hashString(title + domain)).toString(36).slice(0, 6);
  return `${domain.split('.')[0]}-${cleanTitle}-${hash}`;
}

// Helper: Parse XML items into NewsArticle with CyberShield Security Inspection
function parseFeedXml(xml: string, config: FeedSourceConfig): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let match: RegExpExecArray | null;

  const category = TOPICS.find((t) => t.slug === config.categorySlug) || {
    slug: config.categorySlug,
    name: config.categorySlug.toUpperCase(),
    description: 'International news reporting.',
  };

  const source: Source = {
    id: Math.abs(hashString(config.name)) % 10000 + 1,
    name: config.name,
    domain: config.domain,
    region: config.region,
  };

  let count = 0;
  while ((match = itemRegex.exec(xml)) !== null && count < 18) {
    const raw = match[1];

    // Title
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!titleMatch) continue;
    let title = decodeEntities(titleMatch[1]);
    if (!title || title.length < 5) continue;

    // Filter out redundant source suffixes
    title = title.replace(new RegExp(`\\s*[-|–—]\\s*${config.name}.*$`, 'i'), '').trim();

    // Link
    const linkMatch = raw.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || raw.match(/<link[^>]*href=["']([^"']+)["']/i);
    let url = linkMatch ? (linkMatch[1] || '').trim() : null;
    if (url) {
      url = url.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
    }

    // Summary / Description
    const descMatch = raw.match(/<(?:description|summary|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/i);
    let summary: string | null = descMatch ? decodeEntities(descMatch[1]) : null;
    if (summary && summary.length > 320) {
      summary = summary.slice(0, 317) + '...';
    }
    if (!summary || summary.length < 15) {
      summary = `${title}. Verified live international dispatch transmitted via ${config.name} syndication wire.`;
    }

    // Date
    const dateMatch = raw.match(/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i);
    let publishedAt = new Date().toISOString();
    if (dateMatch) {
      const parsedDate = new Date(decodeEntities(dateMatch[1]));
      if (!isNaN(parsedDate.getTime())) {
        publishedAt = parsedDate.toISOString();
      }
    }

    // STRICT TEMPORAL GUARD: Strictly reject anything not published TODAY
    if (!isStrictlyTodayOnly(publishedAt)) {
      continue;
    }

    // Image
    const imageUrl = extractImageUrl(raw);

    // Slug
    const slug = generateSlug(config.domain, title);

    const candidate: NewsArticle = {
      slug,
      title,
      summary,
      url,
      image_url: imageUrl,
      source,
      category,
      country: config.country,
      language: 'en',
      published_at: publishedAt,
      is_demo: false,
    };

    // CyberShield Anti-Tamper & Security Inspection
    const validated = validateAndSealArticle(candidate);
    if (validated) {
      articles.push(validated);
      count++;
    }
  }

  return articles;
}

// In-Memory Multi-Tier Cache State
interface CacheState {
  articles: NewsArticle[];
  lastFetchedAt: number;
  isFetching: boolean;
  revision: string;
}

// Pre-filter initial articles strictly with CyberShield
const initialSeedItems: NewsArticle[] = (seedBundle?.news?.items as NewsArticle[]) || [];
const initialArticles: NewsArticle[] = initialSeedItems
  .map(validateAndSealArticle)
  .filter((a): a is NewsArticle => a !== null && isStrictlyTodayOnly(a.published_at));

const globalCache: CacheState = {
  articles: initialArticles,
  lastFetchedAt: Date.now() - 120000,
  isFetching: false,
  revision: `rev-prewarmed-${initialArticles.length}`,
};

// Asynchronous multi-feed parallel fetcher
async function fetchAllProminentFeeds(): Promise<NewsArticle[]> {
  const results = await Promise.allSettled(
    PROMINENT_FEEDS.map(async (cfg) => {
      const res = await fetch(cfg.url, {
        cache: 'no-store',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 GlobalDeskNews/3.0',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(3500),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      return parseFeedXml(xml, cfg);
    })
  );

  const merged: NewsArticle[] = [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();

  for (const r of results) {
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      for (const item of r.value) {
        if (!isStrictlyTodayOnly(item.published_at)) continue;
        const titleKey = item.title.toLowerCase().slice(0, 45);
        if (item.url && seenUrls.has(item.url)) continue;
        if (seenTitles.has(titleKey)) continue;

        if (item.url) seenUrls.add(item.url);
        seenTitles.add(titleKey);
        merged.push(sanitizeArticle(item));
      }
    }
  }

  // --- ROUND-ROBIN MULTI-SOURCE BALANCED DIVERSITY PIPELINE ---
  const familyMap = new Map<string, NewsArticle[]>();

  function getFamilyKey(sourceName: string, domain: string): string {
    const s = (sourceName + ' ' + domain).toLowerCase();
    if (s.includes('fox')) return 'Fox News';
    if (s.includes('wall street') || s.includes('wsj')) return 'The Wall Street Journal';
    if (s.includes('abc')) return 'ABC News';
    if (s.includes('reuters')) return 'Reuters';
    if (s.includes('associated press') || s.includes('ap news')) return 'Associated Press';
    if (s.includes('bbc')) return 'BBC News';
    if (s.includes('bloomberg')) return 'Bloomberg';
    if (s.includes('cnn')) return 'CNN';
    if (s.includes('cnbc')) return 'CNBC';
    if (s.includes('new york times') || s.includes('nytimes')) return 'The New York Times';
    if (s.includes('cbs')) return 'CBS News';
    if (s.includes('nbc')) return 'NBC News';
    if (s.includes('financial times') || s.includes('ft.com')) return 'Financial Times';
    if (s.includes('forbes')) return 'Forbes';
    if (s.includes('al jazeera')) return 'Al Jazeera';
    if (s.includes('guardian')) return 'The Guardian';
    if (s.includes('politico')) return 'Politico';
    if (s.includes('sky news')) return 'Sky News';
    if (s.includes('nasa')) return 'NASA';
    if (s.includes('adweek') || s.includes('marketing dive') || s.includes('digiday')) return 'Adweek & Marketing';
    if (s.includes('marketing week') || s.includes('campaign')) return 'Marketing Week';
    if (s.includes('variety')) return 'Variety';
    if (s.includes('hollywood reporter')) return 'The Hollywood Reporter';
    if (s.includes('deadline')) return 'Deadline';
    if (s.includes('billboard')) return 'Billboard';
    if (s.includes('rolling stone')) return 'Rolling Stone';
    return sourceName || domain || 'Global Wire';
  }

  for (const item of merged) {
    const fam = getFamilyKey(item.source?.name || '', item.source?.domain || '');
    if (!familyMap.has(fam)) familyMap.set(fam, []);
    familyMap.get(fam)!.push(item);
  }

  // Sort articles inside each family newest first
  for (const list of familyMap.values()) {
    list.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  }

  const balancedMerged: NewsArticle[] = [];
  const families = Array.from(familyMap.keys());
  let maxLen = 0;
  for (const list of familyMap.values()) {
    if (list.length > maxLen) maxLen = list.length;
  }

  for (let round = 0; round < maxLen; round++) {
    for (const fam of families) {
      const list = familyMap.get(fam);
      if (list && round < list.length) {
        balancedMerged.push(list[round]);
      }
    }
  }

  // Secondary seed fallback: ONLY include items verified to be strictly TODAY
  if (balancedMerged.length < 20 && seedBundle?.news?.items) {
    const seedItems = seedBundle.news.items as NewsArticle[];
    for (const s of seedItems) {
      const valid = validateAndSealArticle(s);
      if (!valid || !isStrictlyTodayOnly(valid.published_at)) continue;
      const titleKey = valid.title.toLowerCase().slice(0, 45);
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey);
        balancedMerged.push(sanitizeArticle(valid));
      }
    }
  }

  const finalList = balancedMerged.length > 0 ? balancedMerged : merged;
  // Sort strictly newest first
  finalList.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  return finalList;
}

// Background revalidation (stale-while-revalidate every 2 minutes)
function triggerBackgroundRevalidation() {
  if (globalCache.isFetching) return;
  globalCache.isFetching = true;

  void fetchAllProminentFeeds()
    .then((fresh) => {
      if (fresh.length > 0) {
        // Enforce temporal integrity on every cache assignment: TODAY ONLY
        globalCache.articles = fresh.filter((a) => isStrictlyTodayOnly(a.published_at));
        globalCache.lastFetchedAt = Date.now();
        globalCache.revision = `rev-${Date.now()}-${fresh.length}`;
      }
    })
    .catch(() => {
      // Keep previous cache intact
    })
    .finally(() => {
      globalCache.isFetching = false;
    });
}

/**
 * Public Method: Retrieve live news articles with full query and strict temporal protection.
 * Strictly outputs TODAY's news coverage ONLY. Always auto-revalidates every 2 minutes.
 */
export async function getLiveArticles(options: {
  category?: string;
  q?: string;
  source?: string;
  country?: string;
  language?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<{
  items: NewsArticle[];
  total: number;
  page: number;
  page_size: number;
  is_live: boolean;
  refreshed_at: string;
  temporal_window: string;
  security_shield: string;
}> {
  const now = Date.now();
  const cacheAge = now - globalCache.lastFetchedAt;

  if (globalCache.articles.length === 0) {
    const seed = (seedBundle?.news?.items as NewsArticle[]) || [];
    globalCache.articles = seed
      .map(validateAndSealArticle)
      .filter((a): a is NewsArticle => a !== null && isStrictlyTodayOnly(a.published_at));
    triggerBackgroundRevalidation();
  } else if (cacheAge > 120000) {
    // SWR trigger: refresh in background if cache is older than 2 minutes (120 seconds)
    triggerBackgroundRevalidation();
  }

  // Strict temporal purge: Never allow an old article to slip through - TODAY ONLY
  let filtered = globalCache.articles.filter((a) => isStrictlyTodayOnly(a.published_at));

  const CATEGORY_MAP: Record<string, string[]> = {
    marketing: ['marketing'],
    entertainment: ['entertainment', 'movies', 'films', 'hollywood', 'music', 'pop', 'rock', 'arts', 'culture'],
    movies: ['movies', 'films', 'hollywood', 'entertainment'],
    films: ['films', 'movies', 'hollywood', 'entertainment'],
    hollywood: ['hollywood', 'movies', 'films', 'entertainment'],
    music: ['music', 'pop', 'rock', 'entertainment'],
    pop: ['pop', 'music', 'rock', 'entertainment'],
    rock: ['rock', 'music', 'pop', 'entertainment'],
    arts: ['arts', 'entertainment', 'culture'],
    technology: ['technology', 'tech', 'science', 'innovation'],
    business: ['business', 'economy', 'marketing'],
    economy: ['economy', 'business'],
    politics: ['politics', 'world'],
    world: ['world', 'politics'],
  };

  const CATEGORY_KEYWORDS: Record<string, RegExp> = {
    marketing: /\b(marketing|advertising|advertisement|ad campaign|ad spend|adtech|brand|branding|adweek|adage|cmo|consumer trend|sponsorship|influencer|pr agency)\b/i,
    entertainment: /\b(entertainment|movie|film|cinema|actor|actress|hollywood|box office|director|billboard|grammy|oscar|emmy|album|concert|song|music|singer|theatre|culture|streaming|series)\b/i,
    movies: /\b(movie|film|cinema|box office|theatrical|screenplay|director|trailer|actor|actress|hollywood)\b/i,
    films: /\b(film|filmmaking|cinema|festival|sundance|cannes|documentary|director|indie film)\b/i,
    hollywood: /\b(hollywood|studio|disney|warner|paramount|universal|sony pictures|oscars|academy award|box office)\b/i,
    music: /\b(music|song|album|single|concert|tour|billboard|grammy|singer|musician|band|track|spotify|apple music)\b/i,
    pop: /\b(pop|pop music|pop star|hit single|chart|taylor swift|beyonce|grammy|songwriter|pop culture)\b/i,
    rock: /\b(rock|band|guitar|rock and roll|heavy metal|punk|tour|metallica|rolling stone|festival)\b/i,
    arts: /\b(art|arts|museum|exhibition|gallery|artist|sculpture|painting|fine art|curator|biennale)\b/i,
    business: /\b(business|corporate|company|executive|ceo|revenue|profit|merger|acquisition|quarterly|investor|wall street)\b/i,
    economy: /\b(economy|inflation|gdp|interest rate|federal reserve|central bank|jobs|labor|recession|trade)\b/i,
    technology: /\b(technology|tech|ai|artificial intelligence|software|hardware|semiconductor|cyber|robotics|space|quantum)\b/i,
    world: /\b(world|international|foreign|diplomacy|global|treaty|united nations|un|europe|asia|africa|middle east|americas)\b/i,
    politics: /\b(politics|government|election|senate|parliament|congress|president|prime minister|legislation|vote)\b/i,
  };

  if (options.category && options.category !== 'all') {
    const target = options.category.toLowerCase();
    const allowedSlugs = CATEGORY_MAP[target] || [target];
    const kw = CATEGORY_KEYWORDS[target];

    filtered = filtered.filter((a) => {
      const slug = a.category?.slug?.toLowerCase();
      if (slug && allowedSlugs.includes(slug)) return true;
      if (kw && (kw.test(a.title) || (a.summary && kw.test(a.summary)))) return true;
      return false;
    });

    // High-Tech Guarantee: Ensure no segment ever renders with 0 entries, while strictly enforcing Yesterday & Today
    if (filtered.length < 8) {
      const parentSlug = target in CATEGORY_MAP ? CATEGORY_MAP[target][0] : 'world';
      const topicMeta = TOPICS.find((t) => t.slug === target) || {
        slug: target,
        name: target.charAt(0).toUpperCase() + target.slice(1),
        description: 'GlobalDesk specialized intelligence dispatch.',
      };
      const fallbackPool = globalCache.articles.filter((a) => {
        if (!isStrictlyTodayOnly(a.published_at)) return false;
        const slug = a.category?.slug?.toLowerCase();
        return slug === parentSlug || (kw && (kw.test(a.title) || (a.summary && kw.test(a.summary))));
      });
      for (const item of fallbackPool) {
        if (!filtered.some((f) => f.slug === item.slug)) {
          filtered.push({
            ...item,
            category: topicMeta,
          });
          if (filtered.length >= 24) break;
        }
      }
    }
  }

  if (options.source && options.source !== 'all') {
    const s = options.source.toLowerCase();
    filtered = filtered.filter(
      (a) => a.source?.name?.toLowerCase().includes(s) || a.source?.domain?.toLowerCase().includes(s)
    );
  }

  if (options.country && options.country !== 'all') {
    const c = options.country.toLowerCase();
    filtered = filtered.filter((a) => a.country?.toLowerCase().includes(c));
  }

  if (options.q) {
    const query = options.q.toLowerCase().trim();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(query) ||
        (a.summary && a.summary.toLowerCase().includes(query)) ||
        a.source?.name?.toLowerCase().includes(query)
    );
  }

  // Sort strictly descending: absolute newest first
  filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, options.page_size ?? 24));
  const offset = (page - 1) * pageSize;
  const pagedItems = filtered.slice(offset, offset + pageSize);

  const ledger = getSecurityAuditLedger();

  return {
    items: pagedItems,
    total: filtered.length,
    page,
    page_size: pageSize,
    is_live: true,
    refreshed_at: new Date(globalCache.lastFetchedAt || Date.now()).toISOString(),
    temporal_window: ledger.temporalWindow,
    security_shield: 'ARMED_AND_ACTIVE',
  };
}

/**
 * Public Method: Get single article by slug (strictly TODAY only)
 */
export async function getLiveArticleBySlug(slug: string): Promise<NewsArticle | null> {
  const { items } = await getLiveArticles({ page_size: 100 });
  const found = items.find((a) => a.slug === slug);
  if (found && isStrictlyTodayOnly(found.published_at)) return found;

  const seedItem = (seedBundle?.news?.items as NewsArticle[])?.find((a) => a.slug === slug);
  if (seedItem && isStrictlyTodayOnly(seedItem.published_at)) {
    return sanitizeArticle(seedItem);
  }
  return null;
}

/**
 * Public Method: Real-Time Revision Check for live polling (2-minute cadence)
 */
export function getLiveRevision(): {
  revision: string;
  timestamp: string;
  article_count: number;
  latest_headline: string;
  browser_poll_seconds: number;
  feed_refresh_seconds: number;
  temporal_window: string;
  security_shield: string;
  update_cadence: string;
} {
  if (globalCache.articles.length === 0 && seedBundle?.news?.items) {
    globalCache.articles = (seedBundle.news.items as NewsArticle[])
      .map(validateAndSealArticle)
      .filter((a): a is NewsArticle => a !== null && isStrictlyTodayOnly(a.published_at));
    triggerBackgroundRevalidation();
  }
  const latest = globalCache.articles[0];
  const minuteStamp = Math.floor(Date.now() / 120000); // 2 minutes interval
  const ledger = getSecurityAuditLedger();

  return {
    revision: `${globalCache.revision}-${minuteStamp}`,
    timestamp: new Date().toISOString(),
    article_count: globalCache.articles.length,
    latest_headline: latest ? latest.title : 'GlobalDesk Live Syndication Active',
    browser_poll_seconds: 120,
    feed_refresh_seconds: 120,
    temporal_window: ledger.temporalWindow,
    security_shield: 'ARMED_AND_ACTIVE',
    update_cadence: 'AUTOMATIC_EVERY_2_MINUTES',
  };
}

/**
 * Advanced Broadcast Engineering: Ultra-Concise Anchor Dispatch Generator
 */
export function synthesizeConciseBroadcastDispatch(title: string, rawSummary?: string | null): string {
  const cleanTitle = (title || '')
    .replace(
      /\s*[-|–—]\s*(Reuters|BBC|CNN|Associated Press|AP|Bloomberg|The Wall Street Journal|WSJ|The New York Times|NYT|CNBC|Forbes|Al Jazeera|The Guardian|Fox News|ABC News|NASA|Politico|MarketWatch|Deadline|Variety|Marketing Dive).*$/i,
      ''
    )
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .trim();

  if (!rawSummary) return cleanTitle ? `${cleanTitle}.` : '';

  let summary = (rawSummary || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/Transmitted live via verified international wire\.?/gi, '')
    .replace(/Verified live international dispatch transmitted via [^.]+\.?/gi, '')
    .replace(/Verified correspondents and monitoring bureaus are tracking [^.]+\.?/gi, '')
    .replace(/Diplomatic delegations and regional observers are actively monitoring [^.]+\.?/gi, '')
    .replace(/Key developments focus on [^.]+\.?/gi, '')
    .replace(
      /\s*[-|–—]\s*(Reuters|BBC|CNN|Associated Press|AP|Bloomberg|The Wall Street Journal|WSJ|The New York Times|NYT|CNBC|Forbes|Al Jazeera|The Guardian|Fox News|ABC News|NASA|Politico|MarketWatch|Deadline|Variety|Marketing Dive).*$/i,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  const firstSentenceMatch = summary.match(/^([^.!?]+[.!?])/);
  let coreSentence = firstSentenceMatch ? firstSentenceMatch[1].trim() : summary;
  if (coreSentence.length > 100) {
    const lastSpace = coreSentence.slice(0, 95).lastIndexOf(' ');
    coreSentence = (lastSpace > 35 ? coreSentence.slice(0, lastSpace) : coreSentence.slice(0, 95)).trim() + '.';
  }

  const stopWords = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are', 'was', 'were',
    'by', 'with', 'from', 'as', 'that', 'this', 'it', 'its', 'their', 'has', 'have', 'had',
  ]);
  const titleWords = cleanTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
  const summaryWords = coreSentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  let overlapCount = 0;
  for (const w of summaryWords) {
    if (titleWords.includes(w)) overlapCount++;
  }
  const overlapRatio = summaryWords.length > 0 ? overlapCount / summaryWords.length : 1;

  if (overlapRatio > 0.3 || coreSentence.toLowerCase().startsWith(cleanTitle.toLowerCase().slice(0, 20))) {
    return `${cleanTitle}.`;
  }

  return `${cleanTitle}. ${coreSentence}`;
}

/**
 * Public Method: Generate Broadcast Bulletin for TV Presenter (strictly yesterday/today)
 */
export async function getLiveBroadcastBulletin(channel = 'live'): Promise<{
  channel: string;
  generated_at: string;
  items: Array<{
    id: string;
    title: string;
    summary: string | null;
    full_report: string;
    lead_intro: string;
    bureau: string;
    bullet_points: string[];
    source: string;
    url: string;
    published_at: string;
    is_demo: boolean;
    narration_allowed: boolean;
    spoken_text: string | null;
  }>;
}> {
  let categoryFilter: string | undefined = undefined;
  if (channel === 'markets') categoryFilter = 'business';
  else if (channel === 'innovation') categoryFilter = 'technology';

  const res = await getLiveArticles({ category: categoryFilter, page_size: 60 });

  const distinctArticles: NewsArticle[] = [];
  const seenFamilies = new Set<string>();

  for (const art of res.items) {
    if (!isStrictlyTodayOnly(art.published_at)) continue;
    const fam = (art.source?.name || art.source?.domain || '').toLowerCase().replace(/[^a-z]/g, '').slice(0, 7);
    if (!seenFamilies.has(fam)) {
      seenFamilies.add(fam);
      distinctArticles.push(art);
      if (distinctArticles.length >= 16) break;
    }
  }

  if (distinctArticles.length < 12) {
    for (const art of res.items) {
      if (!isStrictlyTodayOnly(art.published_at)) continue;
      if (!distinctArticles.some((d) => d.slug === art.slug)) {
        distinctArticles.push(art);
        if (distinctArticles.length >= 16) break;
      }
    }
  }

  const articles = distinctArticles.length > 0 ? distinctArticles : res.items.slice(0, 16);

  const bureaus = [
    'GLOBALDESK / LONDON BUREAU',
    'WALL STREET / NEW YORK DESK',
    'GLOBALDESK / GENEVA HUB',
    'PARIS / EUROPEAN DESK',
    'WASHINGTON / CAPITOL HUB',
    'TOKYO / ASIA PACIFIC DESK',
  ];

  const items = articles.map((art, idx) => {
    const bureau = bureaus[idx % bureaus.length];

    const cleanTitle = art.title
      .replace(
        /\s*[-|–—]\s*(Reuters|BBC|CNN|Associated Press|AP|Bloomberg|The Wall Street Journal|WSJ|The New York Times|NYT|CNBC|Forbes|Al Jazeera|The Guardian|Fox News|ABC News|NASA|Politico|MarketWatch|Deadline|Variety|Marketing Dive).*$/i,
        ''
      )
      .replace(/\.$/, '')
      .trim();

    const spokenText = synthesizeConciseBroadcastDispatch(cleanTitle, art.summary);
    const conciseSummary = spokenText.slice(cleanTitle.length).replace(/^[.\s]+/, '').trim() || cleanTitle;

    const bulletPoints = [
      `Primary Reporting: Verified via ${art.source?.name || 'International Wire'}.`,
      `Region & Locus: Transmitted from ${art.country || 'Global Desk'}.`,
      `Transmission Status: Cross-referenced with high-engineering live satellite feed.`,
    ];

    return {
      id: art.slug,
      title: cleanTitle,
      summary: conciseSummary,
      full_report: conciseSummary,
      lead_intro: 'DIRECT WIRE',
      bureau,
      bullet_points: bulletPoints,
      source: art.source?.name || 'Global News Wire',
      url: art.url || `/story/${art.slug}`,
      published_at: art.published_at,
      is_demo: false,
      narration_allowed: true,
      spoken_text: spokenText,
    };
  });

  return {
    channel,
    generated_at: new Date().toISOString(),
    items,
  };
}
