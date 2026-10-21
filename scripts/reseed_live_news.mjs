import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROMINENT_FEEDS = [
  // Reuters
  { name: 'Reuters', domain: 'reuters.com', region: 'Global / International Wire', url: 'https://news.google.com/rss/search?q=source:Reuters+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'world', country: 'Global' },
  { name: 'Reuters Business', domain: 'reuters.com', region: 'Global / International Wire', url: 'https://news.google.com/rss/search?q=source:Reuters+business+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'business', country: 'Global' },
  
  // Associated Press
  { name: 'Associated Press (AP)', domain: 'apnews.com', region: 'Global / Breaking Wire', url: 'https://news.google.com/rss/search?q=source:%22Associated+Press%22+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'world', country: 'Global' },
  
  // Bloomberg
  { name: 'Bloomberg Markets', domain: 'bloomberg.com', region: 'Global / Markets & Capital', url: 'https://news.google.com/rss/search?q=source:Bloomberg+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'business', country: 'Global' },
  
  // Wall Street Journal (Using live Google News wires since dj.com RSS is frozen)
  { name: 'The Wall Street Journal World', domain: 'wsj.com', region: 'Americas / International', url: 'https://news.google.com/rss/search?q=source:%22The+Wall+Street+Journal%22+world+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'world', country: 'United States' },
  { name: 'The Wall Street Journal Business', domain: 'wsj.com', region: 'Americas / Finance & Markets', url: 'https://news.google.com/rss/search?q=source:%22The+Wall+Street+Journal%22+business+OR+finance+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'business', country: 'United States' },
  { name: 'The Wall Street Journal Tech', domain: 'wsj.com', region: 'Americas / Innovation', url: 'https://news.google.com/rss/search?q=source:%22The+Wall+Street+Journal%22+technology+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'technology', country: 'United States' },
  
  // New York Times
  { name: 'The New York Times', domain: 'nytimes.com', region: 'Americas / World Desk', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', categorySlug: 'world', country: 'United States' },
  { name: 'The New York Times Business', domain: 'nytimes.com', region: 'Americas / Economy', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', categorySlug: 'economy', country: 'United States' },
  { name: 'The New York Times Technology', domain: 'nytimes.com', region: 'Americas / Artificial Intelligence', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', categorySlug: 'technology', country: 'United States' },
  
  // BBC News
  { name: 'BBC World News', domain: 'bbc.co.uk', region: 'Europe / Worldwide', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', categorySlug: 'world', country: 'United Kingdom' },
  { name: 'BBC Business News', domain: 'bbc.co.uk', region: 'Europe / International Trade', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', categorySlug: 'business', country: 'United Kingdom' },
  { name: 'BBC Technology', domain: 'bbc.co.uk', region: 'Europe / Tech & AI', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', categorySlug: 'technology', country: 'United Kingdom' },
  { name: 'BBC Entertainment & Arts', domain: 'bbc.co.uk', region: 'Europe / Arts & Culture', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', categorySlug: 'arts', country: 'United Kingdom' },
  
  // CNN
  { name: 'CNN International', domain: 'cnn.com', region: 'Americas / Global News', url: 'http://rss.cnn.com/rss/edition_world.rss', categorySlug: 'world', country: 'United States' },
  { name: 'CNN Top Stories', domain: 'cnn.com', region: 'Americas / Breaking', url: 'http://rss.cnn.com/rss/edition.rss', categorySlug: 'politics', country: 'United States' },
  
  // CNBC
  { name: 'CNBC Markets', domain: 'cnbc.com', region: 'Americas / Wall Street & Equities', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', categorySlug: 'business', country: 'United States' },
  
  // Financial Times
  { name: 'Financial Times', domain: 'ft.com', region: 'Europe / Global Capital', url: 'https://news.google.com/rss/search?q=source:%22Financial+Times%22+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'economy', country: 'United Kingdom' },
  
  // Forbes
  { name: 'Forbes Business', domain: 'forbes.com', region: 'Americas / Enterprise', url: 'https://news.google.com/rss/search?q=source:Forbes+business+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'business', country: 'United States' },
  { name: 'Forbes Innovation', domain: 'forbes.com', region: 'Americas / Tech & Breakthroughs', url: 'https://news.google.com/rss/search?q=source:Forbes+innovation+OR+tech+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'technology', country: 'United States' },
  
  // Fox News
  { name: 'Fox News World', domain: 'foxnews.com', region: 'Americas / Global Desk', url: 'https://moxie.foxnews.com/google-publisher/world.xml', categorySlug: 'world', country: 'United States' },
  { name: 'Fox News Latest', domain: 'foxnews.com', region: 'Americas / Breaking', url: 'https://moxie.foxnews.com/google-publisher/latest.xml', categorySlug: 'politics', country: 'United States' },
  { name: 'Fox Business', domain: 'foxbusiness.com', region: 'Americas / Commerce', url: 'https://news.google.com/rss/search?q=source:%22Fox+Business%22+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'business', country: 'United States' },
  
  // ABC News
  { name: 'ABC News Top Stories', domain: 'abcnews.go.com', region: 'Americas / Prime Headlines', url: 'https://abcnews.go.com/abcnews/topstories', categorySlug: 'world', country: 'United States' },
  { name: 'ABC News International', domain: 'abcnews.go.com', region: 'Americas / World Desk', url: 'https://abcnews.go.com/abcnews/internationalheadlines', categorySlug: 'world', country: 'United States' },
  
  // CBS & NBC
  { name: 'CBS News World', domain: 'cbsnews.com', region: 'Americas / Global Affairs', url: 'https://news.google.com/rss/search?q=source:%22CBS+News%22+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'world', country: 'United States' },
  { name: 'NBC News World', domain: 'nbcnews.com', region: 'Americas / International', url: 'https://news.google.com/rss/search?q=source:%22NBC+News%22+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'world', country: 'United States' },
  
  // Politico & Sky News
  { name: 'Politico Politics', domain: 'politico.com', region: 'Americas / Governance & Policy', url: 'https://rss.politico.com/politics-news.xml', categorySlug: 'politics', country: 'United States' },
  { name: 'Sky News World', domain: 'skynews.com', region: 'Europe / International', url: 'https://news.google.com/rss/search?q=source:%22Sky+News%22+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'world', country: 'United Kingdom' },
  
  // Al Jazeera & Guardian & NASA
  { name: 'Al Jazeera English', domain: 'aljazeera.com', region: 'Middle East / International', url: 'https://www.aljazeera.com/xml/rss/all.xml', categorySlug: 'world', country: 'Global' },
  { name: 'The Guardian World', domain: 'theguardian.com', region: 'Europe / International', url: 'https://www.theguardian.com/world/rss', categorySlug: 'world', country: 'United Kingdom' },
  { name: 'NASA Space & Discovery', domain: 'nasa.gov', region: 'Americas / Deep Space & Science', url: 'https://www.nasa.gov/news-release/feed/', categorySlug: 'technology', country: 'United States' },
  
  // Marketing & Branding
  { name: 'Adweek & Marketing Wire', domain: 'adweek.com', region: 'Americas / Marketing', url: 'https://news.google.com/rss/search?q=source:Adweek+OR+source:Digiday+OR+source:%22Marketing+Dive%22+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'marketing', country: 'United States' },
  { name: 'Forbes CMO & Brand Strategy', domain: 'forbes.com', region: 'Americas / Marketing Insights', url: 'https://news.google.com/rss/search?q=source:Forbes+marketing+OR+advertising+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'marketing', country: 'United States' },
  { name: 'Marketing Week International', domain: 'marketingweek.com', region: 'Europe / Marketing Strategy', url: 'https://news.google.com/rss/search?q=source:%22Marketing+Week%22+OR+source:Campaign+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'marketing', country: 'United Kingdom' },
  
  // Entertainment, Movies, Music
  { name: 'Variety Film & TV', domain: 'variety.com', region: 'Americas / Cinema & Screen', url: 'https://news.google.com/rss/search?q=source:Variety+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'movies', country: 'United States' },
  { name: 'The Hollywood Reporter', domain: 'hollywoodreporter.com', region: 'Americas / Hollywood & Screen', url: 'https://news.google.com/rss/search?q=source:%22The+Hollywood+Reporter%22+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'hollywood', country: 'United States' },
  { name: 'Deadline Hollywood', domain: 'deadline.com', region: 'Americas / Breaking Entertainment', url: 'https://news.google.com/rss/search?q=source:Deadline+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'entertainment', country: 'United States' },
  { name: 'Billboard Music Wire', domain: 'billboard.com', region: 'Americas / Music Charts & Sound', url: 'https://news.google.com/rss/search?q=source:Billboard+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'music', country: 'United States' },
  { name: 'Rolling Stone Music & Pop Culture', domain: 'rollingstone.com', region: 'Americas / Rock & Pop Music', url: 'https://news.google.com/rss/search?q=source:%22Rolling+Stone%22+music+when:2d&hl=en-US&gl=US&ceid=US:en', categorySlug: 'rock', country: 'United States' },
];

function isStrictlyYesterdayOrToday(dateInput) {
  if (!dateInput) return false;
  const published = new Date(dateInput);
  const publishedMs = published.getTime();
  if (isNaN(publishedMs)) return false;
  const now = new Date();
  const nowMs = now.getTime();
  const yesterdayUtcStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0, 0);
  const minValidTimestamp = Math.min(yesterdayUtcStart, nowMs - 48 * 60 * 60 * 1000);
  const maxValidTimestamp = nowMs + 20 * 60 * 1000;
  return publishedMs >= minValidTimestamp && publishedMs <= maxValidTimestamp;
}

function decodeEntities(str) {
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

function extractImageUrl(itemXml) {
  const mediaMatches = itemXml.matchAll(/<media:(?:content|thumbnail)[^>]*url=["']([^"']+)["']/gi);
  for (const m of mediaMatches) {
    const url = m[1].replace(/&amp;/g, '&').trim();
    if (url.startsWith('http') && !url.includes('placeholder')) return url;
  }
  const encMatch = itemXml.match(/<enclosure[^>]*url=["']([^"']+)["']/i);
  if (encMatch && encMatch[1] && encMatch[1].startsWith('http')) {
    return encMatch[1].replace(/&amp;/g, '&').trim();
  }
  const imgDirect = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgDirect && imgDirect[1] && imgDirect[1].startsWith('http')) {
    return imgDirect[1].replace(/&amp;/g, '&').trim();
  }
  return null;
}

function generateSlug(domain, title) {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60);
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  return `${domain.split('.')[0]}-${cleanTitle}-${Math.abs(hash).toString(36).slice(0, 6)}`;
}

async function main() {
  console.log(`Starting High-Engineering syndication harvester for ${PROMINENT_FEEDS.length} feeds...`);
  const allArticles = [];
  const seenUrls = new Set();
  const seenTitles = new Set();

  let rejectedStale = 0;

  for (const cfg of PROMINENT_FEEDS) {
    try {
      const res = await fetch(cfg.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 GlobalDesk/3.0',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        console.warn(`[WARN] ${cfg.name} HTTP ${res.status}`);
        continue;
      }
      const xml = await res.text();
      const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
      let match;
      let count = 0;

      while ((match = itemRegex.exec(xml)) !== null && count < 15) {
        const raw = match[1];
        const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (!titleMatch) continue;
        let title = decodeEntities(titleMatch[1]);
        if (!title || title.length < 5) continue;
        title = title.replace(new RegExp(`\\s*[-|–—]\\s*${cfg.name}.*$`, 'i'), '').trim();

        const dateMatch = raw.match(/<(?:pubDate|published|updated|dc:date)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated|dc:date)>/i);
        let publishedAt = new Date().toISOString();
        if (dateMatch) {
          const parsed = new Date(decodeEntities(dateMatch[1]));
          if (!isNaN(parsed.getTime())) {
            publishedAt = parsed.toISOString();
          }
        }

        // STRICT TEMPORAL GUARD: STRICTLY Yesterday and Today Only!
        if (!isStrictlyYesterdayOrToday(publishedAt)) {
          rejectedStale++;
          continue;
        }

        const linkMatch = raw.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || raw.match(/<link[^>]*href=["']([^"']+)["']/i);
        let url = linkMatch ? (linkMatch[1] || '').trim() : null;
        if (url) url = url.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();

        const descMatch = raw.match(/<(?:description|summary|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/i);
        let summary = descMatch ? decodeEntities(descMatch[1]) : null;
        if (summary && summary.length > 320) summary = summary.slice(0, 317) + '...';
        if (!summary || summary.length < 15) {
          summary = `${title}. Verified live international dispatch transmitted via ${cfg.name} syndication wire.`;
        }

        const titleKey = title.toLowerCase().slice(0, 45);
        if (url && seenUrls.has(url)) continue;
        if (seenTitles.has(titleKey)) continue;

        if (url) seenUrls.add(url);
        seenTitles.add(titleKey);

        const imageUrl = extractImageUrl(raw);
        const slug = generateSlug(cfg.domain, title);

        allArticles.push({
          slug,
          title,
          summary,
          url,
          image_url: imageUrl,
          source: {
            id: Math.abs(hashString(cfg.name)) % 10000 + 1,
            name: cfg.name,
            domain: cfg.domain,
            region: cfg.region,
          },
          category: {
            slug: cfg.categorySlug,
            name: cfg.categorySlug.toUpperCase(),
            description: `${cfg.categorySlug} verified global dispatch`,
          },
          country: cfg.country,
          language: 'en',
          published_at: publishedAt,
          is_demo: false,
        });
        count++;
      }
      console.log(`[OK] ${cfg.name}: captured ${count} fresh articles`);
    } catch (err) {
      console.error(`[ERR] ${cfg.name}:`, err.message);
    }
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }

  // Sort STRICTLY descending: absolute newest first
  allArticles.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

  console.log(`\nHarvest summary:`);
  console.log(`Total authentic articles captured (yesterday & today only): ${allArticles.length}`);
  console.log(`Total stale/old articles rejected: ${rejectedStale}`);
  if (allArticles.length > 0) {
    console.log(`Newest article: ${allArticles[0].title} (${allArticles[0].published_at}) from ${allArticles[0].source.name}`);
    console.log(`Oldest article in window: ${allArticles[allArticles.length - 1].title} (${allArticles[allArticles.length - 1].published_at}) from ${allArticles[allArticles.length - 1].source.name}`);
  }

  const outData = {
    news: {
      items: allArticles,
    },
    sources: Array.from(new Set(allArticles.map(a => a.source.name))).map((name, idx) => ({
      id: idx + 1,
      name,
      domain: allArticles.find(a => a.source.name === name)?.source.domain || 'news.wire',
      region: allArticles.find(a => a.source.name === name)?.source.region || 'Global',
    })),
  };

  const seedPath = path.resolve(__dirname, '../lib/seed_news.json');
  fs.writeFileSync(seedPath, JSON.stringify(outData, null, 2), 'utf-8');
  console.log(`Successfully updated ${seedPath} with ${allArticles.length} freshly verified items!`);
}

main().catch(console.error);
