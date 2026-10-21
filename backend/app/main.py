from datetime import date, datetime, time, timezone, timedelta
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload
from .db import get_db
from .models import Article, Category, Source, SourcePermission
from .schemas import ArticleOut, ArticlePage, CategoryOut, SourceOut
from .permissions import display_conditions
from .settings import CORS_ORIGINS, ALLOWED_HOSTS, APP_ENV, API_REQUESTS_PER_MINUTE, API_GLOBAL_REQUESTS_PER_MINUTE
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .security import ReadOnlySecurityMiddleware
from .cyber_shield import CyberShieldMiddleware

CATEGORY_GROUPS = {
    'entertainment': ['entertainment', 'movies', 'films', 'hollywood', 'music', 'pop', 'rock', 'arts'],
    'music': ['music', 'pop', 'rock'],
    'movies': ['movies', 'films', 'hollywood'],
}

app = FastAPI(
    title='Global News Intelligence API',
    version='2.5.0',
    docs_url='/docs',
    redoc_url='/redoc',
    openapi_url='/openapi.json',
    description='High-Engineering Real-Time Global News Intelligence & Live Broadcast API.',
)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False, allow_methods=['GET'], allow_headers=['*'])

app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)
app.add_middleware(ReadOnlySecurityMiddleware, requests_per_minute=API_REQUESTS_PER_MINUTE, global_per_minute=API_GLOBAL_REQUESTS_PER_MINUTE)
app.add_middleware(CyberShieldMiddleware)

@app.get('/')
@app.get('/api')
@app.get('/api/v1')
def root_intelligence(db: Session = Depends(get_db)):
    total_articles = db.scalar(select(func.count(Article.id)).where(Article.status == 'published'))
    total_sources = db.scalar(select(func.count(Source.id)))
    return {
        'service': 'GlobalDesk High-Tech Intelligence API Backend',
        'status': 'ONLINE_ACTIVE',
        'version': '2.5.0',
        'architecture': 'Real-Time Multi-Source Balanced Syndication Engine',
        'metrics': {
            'total_verified_articles': total_articles,
            'total_active_sources': total_sources,
            'photography': 'Direct Wire Media Syndication Attached',
            'refresh_interval_seconds': 30,
        },
        'prominent_networks': [
            'Forbes', 'Reuters', 'Bloomberg', 'The Wall Street Journal',
            'Financial Times', 'The New York Times', 'BBC World News',
            'CNN International', 'Fox News', 'ABC News', 'Associated Press',
            'The Washington Times', 'Variety', 'Deadline Hollywood'
        ],
        'endpoints': {
            'news_stream': '/api/v1/news',
            'news_search': '/api/v1/news?q={query}',
            'by_category': '/api/v1/news?category={world|business|economy|technology|politics|entertainment|movies|music}',
            'by_source': '/api/v1/news?source={Forbes|Reuters|Bloomberg|WSJ|FT|BBC|CNN|Fox}',
            'interactive_docs': '/docs',
            'api_specification': '/openapi.json',
            'health_check': '/health',
            'categories': '/api/v1/categories',
            'sources': '/api/v1/sources',
            'intelligence_signals': '/api/v1/innovation/signals',
            'live_broadcast': '/api/v1/broadcast?channel=live',
            'daily_briefings': '/api/v1/briefings/daily',
        },
        'newsroom_desk': 'Dr. Bhuvan Jakkula Global Desk',
        'timestamp': datetime.now(timezone.utc).isoformat(),
    }

@app.get('/health')
def health(db: Session = Depends(get_db)):
    db.execute(select(1))
    return {'status': 'ok'}

@app.get('/api/v1/categories', response_model=list[CategoryOut])
def categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.id)).all()

@app.get('/api/v1/sources', response_model=list[SourceOut])
def sources(db: Session = Depends(get_db)):
    return db.scalars(
        select(Source).join(Source.permission).where(
            *display_conditions(),
        ).order_by(Source.name)
    ).all()

@app.get('/api/v1/search', response_model=ArticlePage)
@app.get('/api/v1/news', response_model=ArticlePage)
def news(
    category: str | None = Query(default=None, max_length=50),
    country: str | None = Query(default=None, max_length=80),
    source: str | None = Query(default=None, max_length=220),
    q: str | None = Query(default=None, max_length=150),
    language: str | None = Query(default=None, max_length=32),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(default=1, ge=1, le=10000),
    page_size: int = Query(default=12, ge=1, le=100),
    db: Session = Depends(get_db),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail='Start date must be on or before end date')
    filters = [
        Article.status == 'published',
        *display_conditions(),
    ]
    if category: filters.append(Category.slug.in_(CATEGORY_GROUPS.get(category, [category])))
    if country: filters.append(Article.country.ilike(country))
    if source: filters.append(or_(Source.domain.ilike(source), Source.name.ilike(source)))
    if language: filters.append(Article.language.ilike(language))
    now = datetime.now(timezone.utc)
    today_midnight = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    if date_from:
        filters.append(Article.published_at >= datetime.combine(date_from, time.min, timezone.utc))
    else:
        filters.append(Article.published_at >= today_midnight)
    if date_to:
        filters.append(Article.published_at <= datetime.combine(date_to, time.max, timezone.utc))
    else:
        filters.append(Article.published_at <= now + timedelta(minutes=20))
    if q:
        term = f'%{q}%'
        filters.append(or_(Article.title.ilike(term), Article.summary.ilike(term), Source.name.ilike(term)))
    base = select(Article).join(Article.category).join(Article.source).join(Source.permission).where(*filters)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    
    if not source:
        # Multi-source balanced diversity: interleave round-robin across different news agencies
        candidate_limit = min(max(page_size * 4, 120), 400)
        candidates = db.scalars(
            base.options(joinedload(Article.source), joinedload(Article.category))
            .order_by(Article.published_at.desc(), Article.id.desc())
            .limit(candidate_limit)
        ).all()
        
        by_source = {}
        for c in candidates:
            by_source.setdefault(c.source.name, []).append(c)
        
        interleaved = []
        source_keys = list(by_source.keys())
        while len(interleaved) < len(candidates):
            added_any = False
            for sk in source_keys:
                if by_source[sk]:
                    interleaved.append(by_source[sk].pop(0))
                    added_any = True
            if not added_any:
                break
        
        start_idx = (page - 1) * page_size
        rows = interleaved[start_idx : start_idx + page_size]
    else:
        rows = db.scalars(
            base.options(joinedload(Article.source), joinedload(Article.category))
            .order_by(Article.published_at.desc(), Article.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
        
    return ArticlePage(items=[ArticleOut.model_validate(r) for r in rows], total=total, page=page, page_size=page_size)


@app.get('/api/v1/filters')
def filters(db: Session = Depends(get_db)):
    public = select(Article).join(Article.source).join(Source.permission).where(
        Article.status == 'published', *display_conditions(),
    ).subquery()
    return {
        'countries': list(db.scalars(select(public.c.country).distinct().order_by(public.c.country))),
        'languages': list(db.scalars(select(public.c.language).distinct().order_by(public.c.language))),
    }


@app.get('/api/v1/briefings/daily')
def daily_briefing(day: date | None = None, db: Session = Depends(get_db)):
    selected = day or datetime.now(timezone.utc).date()
    sections = []
    for category in db.scalars(select(Category).order_by(Category.id)):
        data = news(category=category.slug, country=None, source=None, q=None, language=None,
                    date_from=selected, date_to=selected, page=1, page_size=3, db=db)
        sections.append({'category': CategoryOut.model_validate(category), 'total': data.total, 'items': data.items})
    return {'date': selected, 'timezone': 'UTC', 'kind': 'source-linked digest',
            'generated_at': datetime.now(timezone.utc), 'sections': sections,
            'note': 'A chronological digest of permitted listings, without AI-generated analysis. Demo entries remain fictional.'}

@app.get('/api/v1/news/{slug}', response_model=ArticleOut)
def article(slug: str, db: Session = Depends(get_db)):
    row = db.scalar(
        select(Article).join(Article.source).join(Source.permission).where(
            Article.slug == slug, Article.status == 'published',
            *display_conditions(),
        ).options(joinedload(Article.source), joinedload(Article.category))
    )
    if row is None:
        raise HTTPException(status_code=404, detail='Article not found')
    return ArticleOut.model_validate(row)


from .intelligence import router as intelligence_router
app.include_router(intelligence_router)

from .security_posture import router as security_router
app.include_router(security_router)

from .owner_access import router as owner_router
app.include_router(owner_router)

from .watchdesk import router as watch_router
app.include_router(watch_router)

from .evidence import router as evidence_router
app.include_router(evidence_router)

from .editorial_api import router as editorial_router
app.include_router(editorial_router)

from .accounts import router as accounts_router
app.include_router(accounts_router)

from .innovation import router as innovation_router
app.include_router(innovation_router)

from .markets import router as markets_router
app.include_router(markets_router)

from .eventdesk import router as eventdesk_router
app.include_router(eventdesk_router)

from .live_updates import router as live_updates_router
app.include_router(live_updates_router)

from .broadcast import router as broadcast_router
app.include_router(broadcast_router)

from .avatar_video import router as avatar_video_router
app.include_router(avatar_video_router)

from .satellite_engine import router as satellite_router
app.include_router(satellite_router)

