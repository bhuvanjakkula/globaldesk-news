"""Bounded, deterministic headline grouping. Similarity is not fact verification."""
from collections import Counter
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from math import log, sqrt
import re
import unicodedata
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from .db import get_db
from .models import Article, Source, SourcePermission
from .schemas import ArticleOut
from .permissions import display_conditions

router = APIRouter(prefix='/api/v1/intelligence', tags=['intelligence'])
STOP = set('a an the of to in on for and or with as at by from is are was were be has have its this that how why what new news says said'.split())
VERSION = 'headline-tfidf-complete-link-v1'

def tokens(title):
    words = re.findall(r'[^\W_]+', unicodedata.normalize('NFKC', title).casefold(), re.UNICODE)
    return Counter(w for w in words if len(w) > 1 and w not in STOP)

def utc(value):
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)

def group_articles(articles, threshold=0.42):
    """Complete-link, category/language/time constrained groups; no chaining."""
    rows = sorted(articles, key=lambda a: (-utc(a.published_at).timestamp(), a.slug))
    counts = [tokens(a.title) for a in rows]
    df = Counter(word for count in counts for word in count)
    vectors = [{w: (1 + log(n)) * (1 + log((len(rows) + 1) / (df[w] + 1))) for w, n in count.items()} for count in counts]
    norms = [sqrt(sum(v*v for v in vector.values())) for vector in vectors]
    def similarity(i, j):
        if (rows[i].category_id != rows[j].category_id or rows[i].language.casefold() != rows[j].language.casefold()
                or abs((utc(rows[i].published_at)-utc(rows[j].published_at)).total_seconds()) > 72*3600):
            return 0.0
        if len(counts[i].keys() & counts[j].keys()) < 3: return 0.0
        return sum(v * vectors[j].get(w, 0) for w, v in vectors[i].items()) / (norms[i]*norms[j]) if norms[i]*norms[j] else 0.0
    groups = []
    for i in range(len(rows)):
        candidates = [(min(similarity(i,j) for j in group), index) for index,group in enumerate(groups)]
        score, index = max(candidates, default=(0, -1))
        if score >= threshold: groups[index].append(i)
        else: groups.append([i])
    result = []
    for group in groups:
        members = [rows[i] for i in group]
        shared = Counter(w for i in group for w in counts[i])
        pairs = [similarity(i,j) for pos,i in enumerate(group) for j in group[pos+1:]]
        domains = sorted({a.source.domain for a in members})
        result.append({
            'id': sha256('|'.join(sorted(a.slug for a in members)).encode()).hexdigest()[:20],
            'title': members[0].title, 'category': members[0].category.slug,
            'article_count': len(members), 'source_count': len(domains), 'sources': domains,
            'countries': sorted({a.country for a in members}),
            'first_seen': min(utc(a.published_at) for a in members),
            'last_seen': max(utc(a.published_at) for a in members),
            'minimum_similarity': round(min(pairs), 3) if pairs else None,
            'shared_terms': sorted((w for w,n in shared.items() if n == len(group)))[:12] if len(group)>1 else [],
            'all_demo': all(a.is_demo for a in members), 'contains_demo': any(a.is_demo for a in members),
            'articles': [ArticleOut.model_validate(a) for a in members],
        })
    return sorted(result, key=lambda g: (-g['source_count'], -g['article_count'], -g['last_seen'].timestamp(), g['id']))

@router.get('/events')
def events(hours: int = Query(168, ge=1, le=720), category: str | None = Query(None, max_length=50),
           min_sources: int = Query(1, ge=1, le=20), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    query = select(Article).join(Article.source).join(Source.permission).where(
        Article.status == 'published', *display_conditions(),
        Article.published_at >= now-timedelta(hours=hours), Article.published_at <= now)
    if category: query = query.where(Article.category.has(slug=category))
    rows = db.scalars(query.options(joinedload(Article.source), joinedload(Article.category))
                      .order_by(Article.published_at.desc(), Article.id.desc()).limit(301)).all()
    truncated = len(rows)>300
    rows = rows[:300]
    groups = group_articles(rows)
    visible = [g for g in groups if g['source_count'] >= min_sources]
    return {'generated_at': now, 'algorithm': VERSION, 'window_hours': hours, 'sample_limit': 300,
            'truncated': truncated, 'analyzed_articles': len(rows), 'event_count': len(visible),
            'source_count': len({a.source.domain for a in rows}),
            'demo_articles': sum(a.is_demo for a in rows), 'events': visible,
            'method': {'threshold': 0.42, 'maximum_group_span_hours': 72, 'minimum_shared_terms': 3,
                       'note': 'Headline similarity suggests related coverage. Source counts do not establish independence, accuracy or corroboration. Groups are recomputed within the selected sample; IDs change when membership changes.'}}
