"""Cheap publication revision polling, shared for one second per API process."""
from hashlib import sha256
import json
import threading
import time
from fastapi import APIRouter, Depends, Response
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from .db import get_db
from .models import Article, FinanceSignal, InnovationSignal, Source, IngestionRun, AuditLog
from .permissions import display_conditions
from .settings import FEED_REFRESH_SECONDS
from .owner_access import now

router = APIRouter(prefix='/api/v1', tags=['live updates'])
_lock = threading.Lock()
_cache = None
_until = 0.0


def publication_revision(db):
    timestamp = now()
    state = []
    for model in (Article, FinanceSignal, InnovationSignal):
        row = db.execute(select(func.count(model.id), func.max(model.id), func.max(model.published_at))
            .join(model.source).join(Source.permission).where(model.status == 'published',
                model.published_at <= timestamp, *display_conditions())).one()
        state.append([str(v) for v in row])
    row = db.execute(select(func.count(Source.id), func.max(Source.id)).join(Source.permission)
                     .where(*display_conditions())).one()
    state.append([str(v) for v in row])
    state.append(str(db.scalar(select(func.max(IngestionRun.finished_at)))))
    state.append(str(db.scalar(select(func.max(AuditLog.id)).where(
        AuditLog.action.in_(['withdraw', 'block-source', 'source-approved', 'source-blocked'])))))
    return sha256(json.dumps(state).encode()).hexdigest()


@router.get('/updates')
def updates(response: Response, db: Session = Depends(get_db)):
    global _cache, _until
    with _lock:
        if _cache is None or time.monotonic() >= _until:
            _cache = {'revision': publication_revision(db), 'checked_at': now().isoformat(),
                      'browser_poll_seconds': 1, 'feed_refresh_seconds': FEED_REFRESH_SECONDS}
            _until = time.monotonic() + 1
        result = dict(_cache)
    response.headers['Cache-Control'] = 'no-store'
    return result
