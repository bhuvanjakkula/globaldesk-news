"""Periodic discovery and official metadata refreshes."""
from celery import Celery
from .settings import REDIS_URL, FEED_REFRESH_SECONDS

celery_app = Celery('globalnews', broker=REDIS_URL, backend=REDIS_URL)
celery_app.conf.update(
    timezone='UTC',
    beat_schedule={'gdelt-every-30-minutes': {
        'task': 'app.tasks.discover_gdelt', 'schedule': 1800.0,
    }, 'innovation-refresh': {
        'task': 'app.tasks.refresh_innovation', 'schedule': float(FEED_REFRESH_SECONDS),
        'options': {'expires': FEED_REFRESH_SECONDS},
    }, 'markets-refresh': {
        'task': 'app.tasks.refresh_markets', 'schedule': float(FEED_REFRESH_SECONDS),
        'options': {'expires': FEED_REFRESH_SECONDS},
    }},
    task_serializer='json', accept_content=['json'], result_serializer='json',
)

@celery_app.task(name='app.tasks.discover_gdelt')
def discover_gdelt():
    from .ingest import run_ingestion
    return run_ingestion()


@celery_app.task(name='app.tasks.refresh_innovation')
def refresh_innovation():
    from .innovation_ingest import refresh
    return refresh()


@celery_app.task(name='app.tasks.refresh_markets')
def refresh_markets():
    from .market_ingest import refresh
    return refresh()
