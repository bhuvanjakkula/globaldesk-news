"""Source-linked headline bulletin with Live Multi-Source Newsroom integration."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from .db import get_db
from .models import Article, FinanceSignal, InnovationSignal, Source
from .permissions import display_conditions
from .owner_access import now, as_utc
from .broadcast_intelligence import compose_broadcast_script

router = APIRouter(prefix='/api/v1/broadcast', tags=['news TV'])

@router.get('')
def bulletin(
    channel: str = Query('live', pattern=r'^(markets|innovation|demo|live|world)$'),
    db: Session = Depends(get_db)
):
    if channel in ('live', 'world'):
        query = select(Article).join(Article.source).join(Source.permission).where(
            Article.status == 'published',
            Article.published_at <= now(),
            *display_conditions()
        )
        model = Article
    elif channel == 'markets':
        query = select(FinanceSignal).join(FinanceSignal.source).join(Source.permission).where(
            FinanceSignal.status == 'published',
            FinanceSignal.published_at <= now(),
            *display_conditions()
        )
        model = FinanceSignal
    elif channel == 'innovation':
        query = select(InnovationSignal).join(InnovationSignal.source).join(Source.permission).where(
            InnovationSignal.status == 'published',
            InnovationSignal.published_at <= now(),
            *display_conditions()
        )
        model = InnovationSignal
    else:  # demo
        query = select(Article).join(Article.source).join(Source.permission).where(
            Article.status == 'published',
            Article.is_demo.is_(True),
            Article.published_at <= now(),
            *display_conditions()
        )
        model = Article

    rows = db.scalars(
        query.options(joinedload(model.source).joinedload(Source.permission))
        .order_by(model.published_at.desc(), model.id)
        .limit(30)
    ).all()

    items = []
    for idx, row in enumerate(rows):
        is_demo = getattr(row, 'is_demo', False)
        perm = getattr(row.source, 'permission', None)
        allowed = is_demo or (perm.narration_allowed if perm else False)
        identifier = getattr(row, 'slug', str(row.id))

        title = row.title.replace('\ufffd', "'")
        summary = getattr(row, 'summary', None)
        if summary:
            summary = summary.replace('\ufffd', "'")
        elif hasattr(row, 'topics') and row.topics:
            summary = f"Key developments focus on {', '.join(row.topics)}."

        category_slug = getattr(row, 'category', None)
        category_slug = getattr(category_slug, 'slug', channel) if category_slug else channel
        country = getattr(row, 'country', getattr(row, 'region', 'Global'))
        topics = getattr(row, 'topics', None)

        # Generate sophisticated prime-time television broadcast presentation
        composed = compose_broadcast_script(
            title=title,
            summary=summary,
            source_name=row.source.name,
            category_slug=category_slug,
            country=country,
            topics=topics,
            index=idx,
        )

        spoken = None
        if allowed:
            if is_demo:
                spoken = f"Fictional demonstration. {composed['spoken_script']}"
            else:
                spoken = composed['spoken_script']

        items.append({
            'id': identifier,
            'title': title,
            'summary': summary,
            'full_report': composed['full_report'],
            'lead_intro': composed['lead_intro'],
            'bureau': composed['bureau'],
            'bullet_points': composed['bullet_points'],
            'source': row.source.name,
            'url': ('/story/' + row.slug) if is_demo or not getattr(row, 'url', None) else row.url,
            'published_at': as_utc(row.published_at),
            'is_demo': is_demo,
            'narration_allowed': allowed,
            'spoken_text': spoken,
        })

    return {
        'channel': channel,
        'generated_at': now(),
        'items': items,
        'disclosure': 'GlobalDesk 24/7 Live Broadcast. Source publication times vary.'
    }

@router.get('/check')
def check(
    channel: str = Query('live', pattern=r'^(markets|innovation|demo|live|world)$'),
    identifier: str = Query(..., min_length=1, max_length=180),
    db: Session = Depends(get_db)
):
    for item in bulletin(channel, db)['items']:
        if item['id'] == identifier:
            return item
    raise HTTPException(404, 'Headline is no longer available in this bulletin')
