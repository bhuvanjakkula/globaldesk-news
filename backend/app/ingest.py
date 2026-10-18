"""Run one opt-in metadata discovery job: python -m app.ingest"""
import logging
import time
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import select
from .db import SessionLocal
from .models import IngestionRun
from .gdelt import TOPIC_QUERIES, fetch_metadata, stage_articles
from .settings import GDELT_ENABLED, GDELT_MIN_INTERVAL_SECONDS

logging.basicConfig(level=logging.INFO)
LOG = logging.getLogger('ingest')

def run_ingestion():
    identifier = uuid4().hex
    with SessionLocal() as db:
        db.add(IngestionRun(id=identifier, status='running', results={}))
        db.commit()
    if not GDELT_ENABLED:
        LOG.info('GDELT_ENABLED=false — discovery skipped. Enable explicitly after reviewing access rules.')
        output = {'disabled': True}
        finish_run(identifier, 'disabled', output)
        return output
    output = {}
    for idx, category in enumerate(TOPIC_QUERIES):
        if idx:
            time.sleep(GDELT_MIN_INTERVAL_SECONDS)
        try:
            items = fetch_metadata(category)
            with SessionLocal() as db:
                output[category] = stage_articles(db, category, items)
            LOG.info('%s: %s', category, output[category])
        except Exception:
            LOG.exception('Failed to process %s; continuing with other categories', category)
            output[category] = {'error': True}
    finish_run(identifier, 'partial_failure' if any(v.get('error') for v in output.values()) else 'completed', output)
    return output


def finish_run(identifier, status, output):
    with SessionLocal() as db:
        run = db.get(IngestionRun, identifier)
        run.status = status
        run.finished_at = datetime.now(timezone.utc)
        run.results = output
        # Bound operational history; never prune editorial audit records.
        old = db.scalars(select(IngestionRun.id).order_by(IngestionRun.started_at.desc(), IngestionRun.id).offset(200)).all()
        for key in old:
            db.delete(db.get(IngestionRun, key))
        db.commit()

if __name__ == '__main__':
    print(run_ingestion())
