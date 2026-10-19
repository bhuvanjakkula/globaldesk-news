const fs = require('fs');

async function buildEnrichedSeed() {
  const feeds = [
    { cat: 'marketing', name: 'Adweek & Marketing Wire', domain: 'adweek.com', region: 'Americas / Marketing', url: 'https://news.google.com/rss/search?q=source:Adweek+OR+source:Digiday+OR+source:%22Marketing+Dive%22&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'marketing', name: 'Forbes CMO Network', domain: 'forbes.com', region: 'Americas / Consumer Strategy', url: 'https://news.google.com/rss/search?q=source:Forbes+marketing+OR+advertising+OR+branding&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'entertainment', name: 'Deadline Hollywood', domain: 'deadline.com', region: 'Americas / Entertainment Wire', url: 'https://news.google.com/rss/search?q=source:Deadline&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'hollywood', name: 'The Hollywood Reporter', domain: 'hollywoodreporter.com', region: 'Americas / Screen Arts', url: 'https://news.google.com/rss/search?q=source:%22The+Hollywood+Reporter%22&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'movies', name: 'Variety Film & Cinema', domain: 'variety.com', region: 'Americas / Cinema', url: 'https://variety.com/feed/', img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'films', name: 'IndieWire Cinema & Festivals', domain: 'indiewire.com', region: 'Americas / Independent Film', url: 'https://news.google.com/rss/search?q=source:IndieWire+film+OR+cinema&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'music', name: 'Billboard Music Wire', domain: 'billboard.com', region: 'Americas / Music Charts', url: 'https://www.billboard.com/feed/', img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'pop', name: 'Billboard Pop Wire', domain: 'billboard.com', region: 'Americas / Pop Culture', url: 'https://news.google.com/rss/search?q=source:Billboard+pop+OR+hits&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'rock', name: 'Rolling Stone Rock Wire', domain: 'rollingstone.com', region: 'Americas / Rock & Metal', url: 'https://news.google.com/rss/search?q=source:%22Rolling+Stone%22+rock+OR+guitar&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'arts', name: 'Artforum & Global Arts', domain: 'artnews.com', region: 'Global / Visual Arts', url: 'https://news.google.com/rss/search?q=source:%22ARTnews%22+OR+source:%22The+Art+Newspaper%22&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1499364615650-ec38552f4f34?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'politics', name: 'Politico Governance & Diplomacy', domain: 'politico.com', region: 'Americas / Politics', url: 'https://news.google.com/rss/search?q=source:Politico&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'economy', name: 'Financial Times Economy', domain: 'ft.com', region: 'Europe / Global Economy', url: 'https://news.google.com/rss/search?q=source:%22Financial+Times%22+economy+OR+inflation&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'business', name: 'The Wall Street Journal Business', domain: 'wsj.com', region: 'Americas / Wall Street', url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml', img: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'technology', name: 'NASA Space & DeepTech', domain: 'nasa.gov', region: 'Americas / Aerospace', url: 'https://www.nasa.gov/news-release/feed/', img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80' },
    { cat: 'world', name: 'Reuters World News', domain: 'reuters.com', region: 'Global / International Wire', url: 'https://news.google.com/rss/search?q=source:Reuters&hl=en-US&gl=US&ceid=US:en', img: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80' }
  ];

  function decodeEntities(str) {
    if (!str) return '';
    return str
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const existingRaw = JSON.parse(fs.readFileSync('lib/seed_news.json', 'utf8'));
  const existingItems = existingRaw.news?.items || [];
  const seenUrls = new Set(existingItems.map((i) => i.url));
  const seenTitles = new Set(existingItems.map((i) => i.title.toLowerCase().slice(0, 40)));

  const newArticles = [];

  for (const cfg of feeds) {
    try {
      const res = await fetch(cfg.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(6000),
      });
      const xml = await res.text();
      const itemRegex = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
      let m;
      let count = 0;
      while ((m = itemRegex.exec(xml)) !== null && count < 18) {
        const raw = m[1];
        const titleM = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (!titleM) continue;
        let title = decodeEntities(titleM[1]);
        if (!title || title.length < 10) continue;
        title = title.replace(/\s*[-|–—]\s*(Adweek|Forbes|Deadline|Hollywood Reporter|Variety|Billboard|Rolling Stone|BBC|Financial Times|WSJ|Reuters).*$/i, '').trim();

        const linkM = raw.match(/<link[^>]*>([\s\S]*?)<\/link>/i) || raw.match(/<link[^>]*href=["']([^"']+)["']/i);
        let url = linkM ? linkM[1].trim() : null;

        const titleKey = title.toLowerCase().slice(0, 40);
        if (url && seenUrls.has(url)) continue;
        if (seenTitles.has(titleKey)) continue;

        if (url) seenUrls.add(url);
        seenTitles.add(titleKey);

        const descM = raw.match(/<(?:description|summary|content)[^>]*>([\s\S]*?)<\/(?:description|summary|content)>/i);
        let summary = descM ? decodeEntities(descM[1]) : '';
        if (summary.length > 280) summary = summary.slice(0, 277) + '...';
        if (!summary || summary.length < 15) summary = `${title}. Verified dispatch reported by ${cfg.name}.`;

        const dateM = raw.match(/<(?:pubDate|published|updated)[^>]*>([\s\S]*?)<\/(?:pubDate|published|updated)>/i);
        let published_at = new Date().toISOString();
        if (dateM) {
          const parsed = new Date(dateM[1]);
          if (!isNaN(parsed.getTime())) published_at = parsed.toISOString();
        }

        const slug = 'live-' + title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 45) + '-' + Math.random().toString(36).slice(2, 8);

        newArticles.push({
          slug,
          title,
          summary,
          url,
          image_url: cfg.img,
          source: {
            id: Math.floor(Math.random() * 8000) + 100,
            name: cfg.name,
            domain: cfg.domain,
            region: cfg.region,
          },
          category: {
            slug: cfg.cat,
            name: cfg.cat.charAt(0).toUpperCase() + cfg.cat.slice(1),
            description: `Verified ${cfg.cat} dispatches from premier international syndication wires.`,
          },
          country: 'Global',
          language: 'English',
          published_at,
          is_demo: false,
        });
        count++;
      }
      console.log('Fetched', count, 'articles for', cfg.cat, 'from', cfg.name);
    } catch (e) {
      console.log('Failed feed', cfg.cat, e.message);
    }
  }

  const combined = [...newArticles, ...existingItems];
  existingRaw.news.items = combined;

  fs.writeFileSync('lib/seed_news.json', JSON.stringify(existingRaw, null, 2), 'utf8');
  fs.writeFileSync('frontend/lib/seed_news.json', JSON.stringify(existingRaw, null, 2), 'utf8');

  console.log('Done! Total items in seed_news.json:', combined.length);
  const finalCounts = {};
  for (const i of combined) {
    const c = i.category?.slug || 'unknown';
    finalCounts[c] = (finalCounts[c] || 0) + 1;
  }
  console.log('Final Category Counts:', finalCounts);
}

buildEnrichedSeed();
