const fs = require('fs');
const path = require('path');

const seedPaths = [
  path.join(__dirname, '../lib/seed_news.json'),
  path.join(__dirname, '../frontend/lib/seed_news.json')
];

const bannedKeywords = [
  'apr until',
  'credit card',
  'cash back card',
  'home equity',
  'fool.com',
  'theascent',
  'lendingtree',
  'wells-fargo-reflect',
  'citi-simplicity'
];

for (const p of seedPaths) {
  if (!fs.existsSync(p)) continue;
  const raw = fs.readFileSync(p, 'utf8');
  const data = JSON.parse(raw);
  
  const before = data.news.items.length;
  data.news.items = data.news.items.filter((item) => {
    const text = `${item.title} ${item.summary || ''} ${item.url || ''}`.toLowerCase();
    const isAd = bannedKeywords.some((bk) => text.includes(bk));
    return !isAd;
  });
  const after = data.news.items.length;
  
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Purged ${before - after} ad items from ${p}. Remaining: ${after}`);
}
