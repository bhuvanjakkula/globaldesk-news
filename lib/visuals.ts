/**
 * GlobalDesk Editorial Visual System
 * High-definition illustrative editorial photography and verified source images.
 * Real publisher images take absolute precedence.
 */

export const ENTERTAINMENT_SLUGS = [
  'entertainment', 'movies', 'films', 'hollywood', 'music', 'pop', 'rock', 'arts'
] as const;

export type EntertainmentSlug = (typeof ENTERTAINMENT_SLUGS)[number];

export const isEntertainment = (slug: string): slug is EntertainmentSlug =>
  (ENTERTAINMENT_SLUGS as readonly string[]).includes(slug);

export const CATEGORY_PHOTOS: Record<string, string> = {
  world: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
  business: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  economy: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
  politics: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
  technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  science: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
  marketing: 'https://images.unsplash.com/photo-1557838923-2985c318be48?auto=format&fit=crop&w=1200&q=80',
  entertainment: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
  movies: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80',
  films: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1200&q=80',
  hollywood: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1200&q=80',
  music: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
  pop: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
  rock: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
  arts: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80',
};

const KEYWORD_PHOTOS: Array<{ pattern: RegExp; url: string; label: string }> = [
  {
    pattern: /science|laboratory|telescope|astronomy|physics|biology|chemistry|quantum|fusion|neuroscience|dna|genome|stuttering/i,
    url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    label: 'Science & Discovery',
  },
  {
    pattern: /space|artemis|rocket|nebula|glenn|nasa|satellite|orbit|cosmic|mars|moon|astronomer|cosmos/i,
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
    label: 'Deep Space & Aeronautics',
  },
  {
    pattern: /supply chain|software|package|dependency|code|developer/i,
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    label: 'Cyber Engineering',
  },
  {
    pattern: /ai|artificial intelligence|neural|model|compute|llm|deep learning/i,
    url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80',
    label: 'AI & DeepTech',
  },
  {
    pattern: /inflation|cpi|interest rate|central bank|federal reserve|treasury/i,
    url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
    label: 'Macroeconomics',
  },
  {
    pattern: /balance sheet|equity|assets|corporate|investor|wall street|stocks|nasdaq/i,
    url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
    label: 'Corporate Finance',
  },
  {
    pattern: /diplomacy|treaty|border|summit|united nations|consulate|bilateral|geopolitics/i,
    url: 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1200&q=80',
    label: 'Global Affairs',
  },
  {
    pattern: /conversion|reach|advertising|brand|campaign/i,
    url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
    label: 'Digital Strategy',
  },
  {
    pattern: /festival|premiere|screening|hollywood|red carpet/i,
    url: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1200&q=80',
    label: 'Cinema & Screen',
  },
  {
    pattern: /guitar|rock|stage|band|live show|concert/i,
    url: 'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?auto=format&fit=crop&w=1200&q=80',
    label: 'Live Music Wire',
  },
  {
    pattern: /protest|riot|unrest|strike|police|crisis|clash/i,
    url: 'https://images.unsplash.com/photo-1577962917302-cd874c4e31d2?auto=format&fit=crop&w=1200&q=80',
    label: 'Civil Affairs & Society',
  },
  {
    pattern: /android|laptop|gadget|phone|pixel|device|hardware|review|googlebook/i,
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80',
    label: 'Consumer Tech & Hardware',
  },
  {
    pattern: /solar|nuclear|energy|power|climate|carbon|electricity/i,
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
    label: 'Clean Energy & Power',
  },
  {
    pattern: /drug|synthetic|health|hospital|medical|vaccine|clinical|disease/i,
    url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80',
    label: 'Global Health & Medicine',
  },
  {
    pattern: /gallery|canvas|texture|contemporary|exhibition|museum/i,
    url: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=1200&q=80',
    label: 'Visual Arts Wire',
  },
];

export interface ArticleVisual {
  imageUrl: string;
  topicLabel: string;
  sourceBadge: string;
  readingTime: string;
  aspectClass: string;
  isExactPublisherImage: boolean;
}

export function getArticleVisual(article: {
  title?: string;
  summary?: string | null;
  slug?: string;
  category?: { slug: string; name: string };
  source?: { name: string; domain?: string };
  image_url?: string | null;
}): ArticleVisual {
  const catSlug = (article.category?.slug || 'world').toLowerCase();
  const title = article.title || '';
  const text = `${title} ${article.summary || ''} ${article.slug || ''}`;

  // PRIORITY 1: REAL PUBLISHER IMAGE (Exact image extracted from WSJ, NYT, CNN, Fox News, ABC News, WashTimes, BBC, NASA)
  const realImage = (article.image_url || '').trim();
  const isBannedImage = realImage.includes('1541872703-74c5e44368f9');
  if ((realImage.startsWith('http://') || realImage.startsWith('https://')) && !isBannedImage) {
    let topicLabel = article.category?.name || 'Live Syndicate Wire';
    for (const item of KEYWORD_PHOTOS) {
      if (item.pattern.test(text)) {
        topicLabel = item.label;
        break;
      }
    }
    return {
      imageUrl: realImage,
      topicLabel,
      sourceBadge: article.source?.name || 'Verified Source',
      readingTime: '3 min read',
      aspectClass: 'aspect-wide',
      isExactPublisherImage: true,
    };
  }

  // PRIORITY 2: Intelligent thematic matching (strictly no inappropriate political figure portraits)
  for (const item of KEYWORD_PHOTOS) {
    if (item.pattern.test(text)) {
      return {
        imageUrl: item.url,
        topicLabel: item.label,
        sourceBadge: article.source?.name || 'GlobalDesk Wire',
        readingTime: '3 min read',
        aspectClass: 'aspect-wide',
        isExactPublisherImage: false,
      };
    }
  }

  // PRIORITY 3: Fallback category photo
  const defaultPhoto = CATEGORY_PHOTOS[catSlug] || CATEGORY_PHOTOS.world;
  return {
    imageUrl: defaultPhoto,
    topicLabel: article.category?.name || 'World News',
    sourceBadge: article.source?.name || 'GlobalDesk News Wire',
    readingTime: '4 min read',
    aspectClass: 'aspect-wide',
    isExactPublisherImage: false,
  };
}

export function coverStyle(slug: string): { backgroundImage: string } {
  const safeSlug = isEntertainment(slug) ? slug : 'entertainment';
  const local = `url('/images/${safeSlug}.svg')`;
  const photo = CATEGORY_PHOTOS[safeSlug] ? `url('${CATEGORY_PHOTOS[safeSlug]}'), ` : '';
  return { backgroundImage: `linear-gradient(0deg, rgba(19, 14, 32, .75), rgba(19, 14, 32, .15) 70%), ${photo}${local}` };
}
