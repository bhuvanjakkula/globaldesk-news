from app import tasks
from app.settings import FEED_REFRESH_SECONDS


def test_official_feed_jobs_are_scheduled_and_call_permission_aware_importers(monkeypatch):
    from app import innovation_ingest, market_ingest

    calls = []
    monkeypatch.setattr(innovation_ingest, 'refresh', lambda: calls.append('innovation') or {'ok': True})
    monkeypatch.setattr(market_ingest, 'refresh', lambda: calls.append('markets') or {'ok': True})
    schedule = tasks.celery_app.conf.beat_schedule
    for key, name in [('innovation', 'refresh_innovation'), ('markets', 'refresh_markets')]:
        entry = schedule[f'{key}-refresh']
        assert entry['task'] == f'app.tasks.{name}'
        assert entry['schedule'] == FEED_REFRESH_SECONDS
        assert entry['options']['expires'] == FEED_REFRESH_SECONDS
        assert getattr(tasks, name).run() == {'ok': True}
    assert calls == ['innovation', 'markets']
