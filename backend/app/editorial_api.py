"""Authenticated owner moderation; approvals remain an explicit operator workflow."""
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from .db import get_db
from .editorial import moderate
from .models import Article, AuditLog, Source, IngestionRun
from .owner_access import authenticated_owner, as_utc, check_origin

router = APIRouter(prefix='/api/v1/owner/editorial', tags=['private editorial'])


@router.get('')
def report(page: int = Query(1, ge=1, le=10000), owner=Depends(authenticated_owner), db: Session = Depends(get_db)):
    rows = db.scalars(select(Article).options(joinedload(Article.source))
                      .order_by(Article.id.desc()).offset((page - 1) * 50).limit(51)).all()
    sources = db.scalars(select(Source).options(joinedload(Source.permission)).order_by(Source.domain).limit(500)).all()
    audit = db.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(50)).all()
    runs = db.scalars(select(IngestionRun).order_by(IngestionRun.started_at.desc()).limit(20)).all()
    return {
        'page': page, 'has_more': len(rows) > 50,
        'articles': [{'slug': a.slug, 'title': a.title, 'status': a.status,
                      'source': a.source.domain, 'is_demo': a.is_demo} for a in rows[:50]],
        'sources': [{'domain': s.domain, 'name': s.name,
                     'status': s.permission.status if s.permission else 'unconfigured',
                     'expires_at': as_utc(s.permission.expires_at) if s.permission and s.permission.expires_at else None} for s in sources],
        'ingestion_runs': [{'id': r.id, 'status': r.status, 'started_at': as_utc(r.started_at),
                            'finished_at': as_utc(r.finished_at) if r.finished_at else None, 'results': r.results} for r in runs],
        'audit': [{'action': a.action, 'target': a.target, 'actor': a.actor,
                   'reason': a.reason, 'created_at': as_utc(a.created_at)} for a in audit],
    }


class Decision(BaseModel):
    model_config = ConfigDict(extra='forbid')
    action: str = Field(pattern=r'^(withdraw|block-source)$')
    target: str = Field(min_length=1, max_length=220)
    reason: str = Field(min_length=12, max_length=1000)


@router.post('/moderate')
def decide(payload: Decision, origin: str | None = Header(None), owner=Depends(authenticated_owner), db: Session = Depends(get_db)):
    check_origin(origin)
    try:
        moderate(db, payload.action, payload.target, owner.email, payload.reason)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(422, str(exc))
    return {'saved': True}
