"""Versioned private event tracking with live permission and evidence rechecks."""
from datetime import datetime, timezone
from hashlib import sha256
from itertools import combinations
import json
from uuid import uuid4
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from .db import get_db
from .evidence import public_rows, SLUG
from .intelligence import tokens
from .models import AuditLog, TrackedEvent
from .owner_access import authenticated_owner, as_utc, check_origin
from .schemas import ArticleOut
from .watchdesk import content_hash

router = APIRouter(prefix='/api/v1/owner/events', tags=['private event intelligence'])


def evidence_digest(slugs, rows):
    available = {a.slug: content_hash(a) for a in rows}
    return sha256(json.dumps({s: available.get(s) for s in slugs}, sort_keys=True).encode()).hexdigest()


def evidence_graph(rows):
    edges = []
    for a, b in combinations(rows, 2):
        left, right = set(tokens(a.title)), set(tokens(b.title))
        shared, union = left & right, left | right
        edges.append({'left': a.slug, 'right': b.slug, 'shared_terms': sorted(shared)[:12],
                      'overlap_percent': round(100 * len(shared) / len(union)) if union else 0,
                      'same_domain': a.source.domain == b.source.domain,
                      'hours_apart': round(abs((as_utc(a.published_at) - as_utc(b.published_at)).total_seconds()) / 3600, 1)})
    return edges


class EventInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str | None = Field(None, pattern=r'^[a-f0-9]{32}$')
    version: int | None = Field(None, ge=1, le=1000000000)
    title: str = Field(min_length=1, max_length=160)
    note: str = Field(default='', max_length=1000)
    slugs: list[str] = Field(min_length=1, max_length=12)

    @field_validator('title')
    @classmethod
    def meaningful_title(cls, value):
        if not value.strip():
            raise ValueError('Title cannot be blank')
        return value.strip()

    @field_validator('slugs')
    @classmethod
    def identifiers(cls, value):
        if len(set(value)) != len(value) or any(not SLUG.fullmatch(s) for s in value):
            raise ValueError('Use distinct valid story identifiers')
        return value


class Decision(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str = Field(pattern=r'^[a-f0-9]{32}$')
    version: int = Field(ge=1, le=1000000000)
    status: str = Field(pattern=r'^(reviewed|draft|archived)$')
    evidence_digest: str = Field(pattern=r'^[a-f0-9]{64}$')
    reason: str = Field(min_length=12, max_length=500)

    @field_validator('reason')
    @classmethod
    def meaningful_reason(cls, value):
        if len(value.strip()) < 12:
            raise ValueError('Explain the review decision')
        return value.strip()


def commit(db):
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, 'Concurrent event change. Reload and retry.')


@router.post('/save')
def save(payload: EventInput, origin: str | None = Header(None), owner=Depends(authenticated_owner), db: Session = Depends(get_db)):
    check_origin(origin)
    rows = public_rows(db, payload.slugs)
    if len(rows) != len(payload.slugs):
        raise HTTPException(409, 'Some evidence is unavailable. Refresh your selection.')
    values = {'title': payload.title, 'note': payload.note, 'slugs': payload.slugs,
              'fingerprints': {a.slug: content_hash(a) for a in rows},
              'status': 'draft', 'updated_at': datetime.now(timezone.utc)}
    if payload.id:
        if payload.version is None:
            raise HTTPException(422, 'Version is required for edits')
        changed = db.execute(update(TrackedEvent).where(TrackedEvent.id == payload.id,
            TrackedEvent.owner_email == owner.email, TrackedEvent.version == payload.version)
            .values(**values, version=payload.version + 1))
        if changed.rowcount != 1:
            db.rollback()
            raise HTTPException(409, 'Event changed or is unavailable. Reload before editing.')
        identifier, version = payload.id, payload.version + 1
    else:
        used = set(db.scalars(select(TrackedEvent.slot).where(TrackedEvent.owner_email == owner.email)))
        slot = next((s for s in range(30) if s not in used), None)
        if slot is None:
            raise HTTPException(409, 'Event Desk is limited to 30 dossiers, including archived events')
        identifier, version = uuid4().hex, 1
        db.add(TrackedEvent(id=identifier, owner_email=owner.email, slot=slot, version=version, **values))
    db.add(AuditLog(actor=owner.email, action='event-saved', target=identifier,
                    reason='Saved private evidence identifiers and fingerprints; review reset to draft.'))
    commit(db)
    return {'id': identifier, 'version': version, 'saved': True}


@router.get('')
def report(owner=Depends(authenticated_owner), db: Session = Depends(get_db)):
    records = db.scalars(select(TrackedEvent).where(TrackedEvent.owner_email == owner.email)
                        .order_by(TrackedEvent.updated_at.desc(), TrackedEvent.id).limit(30)).all()
    identifiers = list(dict.fromkeys(s for record in records for s in record.slugs))
    visible = {a.slug: a for a in public_rows(db, identifiers)} if identifiers else {}
    events = []
    for record in records:
        rows = [visible[s] for s in record.slugs if s in visible]
        changed = sum(record.fingerprints.get(a.slug) != content_hash(a) for a in rows)
        unavailable = len(record.slugs) - len(rows)
        events.append({'id': record.id, 'version': record.version, 'title': record.title,
            'note': record.note, 'slugs': record.slugs, 'status': record.status,
            'review_needed': record.status == 'draft' or changed > 0 or unavailable > 0,
            'changed_count': changed, 'unavailable_count': unavailable,
            'evidence_digest': evidence_digest(record.slugs, rows),
            'updated_at': as_utc(record.updated_at), 'contains_demo': any(a.is_demo for a in rows),
            'source_count': len({a.source.domain for a in rows}),
            'timeline': [ArticleOut.model_validate(a) for a in sorted(rows, key=lambda a: (as_utc(a.published_at), a.slug))],
            'edges': evidence_graph(rows)})
    history = db.scalars(select(AuditLog).where(AuditLog.actor == owner.email,
        AuditLog.action.in_(['event-saved', 'event-reviewed', 'event-draft', 'event-archived']))
        .order_by(AuditLog.id.desc()).limit(50)).all()
    return {'limit': 30, 'events': events, 'history': [
        {'action': r.action, 'id': r.target, 'reason': r.reason, 'at': as_utc(r.created_at)} for r in history],
        'method': 'Edges show lexical headline overlap and time distance, not semantic agreement or verified truth. Editorial review records a human decision; it does not certify reporting.'}


@router.post('/review')
def review(payload: Decision, origin: str | None = Header(None), owner=Depends(authenticated_owner), db: Session = Depends(get_db)):
    check_origin(origin)
    record = db.scalar(select(TrackedEvent).where(TrackedEvent.id == payload.id, TrackedEvent.owner_email == owner.email))
    if record is None or record.version != payload.version:
        raise HTTPException(409, 'Event changed or is unavailable. Reload before reviewing.')
    rows = public_rows(db, record.slugs)
    if evidence_digest(record.slugs, rows) != payload.evidence_digest:
        raise HTTPException(409, 'Evidence changed since this page loaded. Inspect it again.')
    if payload.status == 'reviewed' and len(rows) != len(record.slugs):
        raise HTTPException(409, 'Unavailable evidence cannot be marked reviewed. Edit the event first.')
    changes = {'status': payload.status, 'updated_at': datetime.now(timezone.utc), 'version': payload.version + 1}
    if payload.status == 'reviewed':
        changes['fingerprints'] = {a.slug: content_hash(a) for a in rows}
    result = db.execute(update(TrackedEvent).where(TrackedEvent.id == payload.id,
        TrackedEvent.owner_email == owner.email, TrackedEvent.version == payload.version).values(**changes))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, 'Event changed concurrently. Reload before reviewing.')
    db.add(AuditLog(actor=owner.email, action='event-' + payload.status, target=payload.id, reason=payload.reason))
    commit(db)
    return {'saved': True, 'version': payload.version + 1}
