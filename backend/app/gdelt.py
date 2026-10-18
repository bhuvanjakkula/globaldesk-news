"""Metadata-only GDELT DOC 2.0 ArtList adapter. Does NOT fetch publisher articles.

Newly discovered domains always remain pending; only a source with explicitly
reviewed metadata-display rights can become public. No images or full texts.
"""
import hashlib
import ipaddress
import logging
from datetime import datetime, timezone
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import Article, Category, Source, SourcePermission
from .settings import GDELT_MAX_RECORDS, GDELT_TIMESPAN
from .permissions import can_display

LOG = logging.getLogger(__name__)
DOC_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc'
TOPIC_QUERIES = {
    'world': '(diplomacy OR international OR humanitarian)',
    'business': '(business OR merger OR company)',
    'economy': '(inflation OR economic growth OR central bank)',
    'politics': '(parliament OR election OR government)',
    'technology': '(technology OR cybersecurity OR artificial intelligence)',
    'marketing': '(advertising OR branding OR marketing)',
    'entertainment': '(entertainment OR television OR performing arts)',
    'movies': '(film OR movie OR cinema)',
    'films': '(documentary OR film festival OR cinematography)',
    'hollywood': '(Hollywood OR film studio OR movie premiere)',
    'music': '(music OR concert OR musician)',
    'pop': '(pop music OR pop singer OR pop album)',
    'rock': '(rock music OR rock band OR guitarist)',
    'arts': '(art exhibition OR museum OR contemporary art)',
}
TRACKING_PARAMS = {'fbclid', 'gclid', 'mc_cid', 'mc_eid'}

def normalized_url(value: str) -> tuple[str, str] | None:
    """Only external http(s) URLs; never visit them from our server."""
    try:
        u = urlsplit(value)
        hostname = (u.hostname or '').lower().rstrip('.')
        if u.scheme not in ('https', 'http') or not hostname or u.username or u.password or len(value) > 2048:
            return None
        if hostname in ('localhost',) or hostname.endswith(('.localhost', '.local', '.internal')):
            return None
        try:
            ipaddress.ip_address(hostname)
            return None
        except ValueError:
            pass
        if '.' not in hostname:
            return None
        domain = hostname.removeprefix('www.')
        path = u.path or '/'
        query = urlencode(sorted((k, v) for k, v in parse_qsl(u.query, keep_blank_values=True) if not k.lower().startswith('utm_') and k.lower() not in TRACKING_PARAMS))
        normalized = urlunsplit((u.scheme, u.netloc.lower(), path, query, ''))
        return normalized, domain
    except ValueError:
        return None

def parse_seen(value: str | None) -> datetime:
    if value:
        for fmt in ('%Y%m%dT%H%M%SZ', '%Y%m%d%H%M%S'):
            try:
                return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                pass
    return datetime.now(timezone.utc)

def fetch_metadata(category: str, client: httpx.Client | None = None, *, max_records: int | None = None) -> list[dict]:
    if category not in TOPIC_QUERIES:
        raise ValueError(f'Unknown category: {category}')
    params = {'query': TOPIC_QUERIES[category], 'mode': 'artlist', 'format': 'json', 'timespan': GDELT_TIMESPAN, 'maxrecords': min(max_records or GDELT_MAX_RECORDS, 250), 'sort': 'datedesc'}
    if client is not None:
        response = client.get(DOC_ENDPOINT, params=params)
        response.raise_for_status()
        return response.json().get('articles', [])
    with httpx.Client(timeout=20.0, follow_redirects=False, headers={'User-Agent': 'GlobalNewsMVP/0.1 (metadata-only research adapter)'}) as http:
        response = http.get(DOC_ENDPOINT, params=params)
        response.raise_for_status()
        return response.json().get('articles', [])

def stage_articles(db: Session, category_slug: str, records: list[dict]) -> dict[str, int]:
    """Upsert metadata. Fail closed on unreviewed sources; no publisher images/text."""
    category = db.scalar(select(Category).where(Category.slug == category_slug))
    if category is None:
        raise ValueError('Run seed first to create categories')
    counts = {'new': 0, 'duplicate': 0, 'published': 0, 'pending': 0, 'skipped': 0}
    for row in records:
        parsed = normalized_url(str(row.get('url', '')))
        title = str(row.get('title', '')).strip()
        if parsed is None or not (5 <= len(title) <= 500):
            counts['skipped'] += 1
            continue
        url, domain = parsed
        if db.scalar(select(Article.id).where(Article.url == url)):
            counts['duplicate'] += 1
            continue
        source = db.scalar(select(Source).where(Source.domain == domain))
        if source is None:
            source = Source(name=domain, domain=domain, region='Unknown', source_type='publisher')
            db.add(source)
            db.flush()
            db.add(SourcePermission(
                source_id=source.id, access_method='gdelt_discovery', status='pending_review',
                public_metadata_allowed=False, ai_processing_allowed=False,
                rights_basis='Unverified', notes='Auto-discovered via GDELT. Must be reviewed before publication.',
            ))
            db.flush()
        permission = source.permission
        # Guard applies to both rows fetched now and records previously staged.
        public = can_display(permission) and permission.status == 'approved'
        slug = 'gdelt-' + hashlib.sha256(url.encode()).hexdigest()[:24]
        db.add(Article(
            slug=slug, title=title, summary=None, url=url, source_id=source.id,
            category_id=category.id, country=str(row.get('sourcecountry') or 'Global')[:80],
            language=str(row.get('language') or 'Unknown')[:32],
            published_at=parse_seen(row.get('seendate')), status='published' if public else 'pending_review',
            is_demo=False, origin='gdelt',
        ))
        counts['new'] += 1
        counts['published' if public else 'pending'] += 1
    db.commit()
    return counts
