from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from app.models import Article, IngestionRun
from app.permissions import can_display


def test_expired_rights_hidden_from_public_views(client, session):
    article = session.scalar(select(Article).where(Article.status == 'published'))
    permission = article.source.permission
    expiry = permission.expires_at
    try:
        permission.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        session.commit()
        assert not can_display(permission)
        assert client.get('/api/v1/news/' + article.slug).status_code == 404
        assert client.get('/api/v1/news').json()['total'] == 0
        assert client.get('/api/v1/sources').json() == []
        assert client.get('/api/v1/filters').json() == {'countries': [], 'languages': []}
        assert client.get('/api/v1/intelligence/events').json()['events'] == []
        other = session.scalar(select(Article.slug).where(Article.slug != article.slug))
        assert client.get('/api/v1/compare', params={'slugs': article.slug + ',' + other}).status_code == 404
        permission.expires_at = datetime.now(timezone.utc) + timedelta(days=1)
        session.commit()
        assert can_display(permission)
        assert client.get('/api/v1/news/' + article.slug).status_code == 200
    finally:
        permission.expires_at = expiry; session.commit()


def test_disabled_ingestion_records_history_without_network(monkeypatch, session):
    from app import ingest
    monkeypatch.setattr(ingest, 'GDELT_ENABLED', False)
    monkeypatch.setattr(ingest, 'fetch_metadata', lambda *_: (_ for _ in ()).throw(AssertionError('No network allowed')))
    assert ingest.run_ingestion() == {'disabled': True}
    run = session.scalar(select(IngestionRun).order_by(IngestionRun.started_at.desc()))
    assert run.status == 'disabled' and run.finished_at is not None


def test_ingestion_partial_failure_is_persisted(monkeypatch, session):
    from app import ingest
    monkeypatch.setattr(ingest, 'GDELT_ENABLED', True)
    monkeypatch.setattr(ingest, 'TOPIC_QUERIES', {'world': 'a', 'technology': 'b'})
    monkeypatch.setattr(ingest.time, 'sleep', lambda *_: None)
    def fetch(category):
        if category == 'world':
            raise RuntimeError('Fixture upstream failure')
        return []
    monkeypatch.setattr(ingest, 'fetch_metadata', fetch)
    result = ingest.run_ingestion()
    assert result['world'] == {'error': True} and result['technology']['new'] == 0
    run = session.scalar(select(IngestionRun).order_by(IngestionRun.started_at.desc()))
    assert run.status == 'partial_failure' and run.results == result
