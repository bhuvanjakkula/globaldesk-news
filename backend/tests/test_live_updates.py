from sqlalchemy import select
from app import live_updates
from app.models import Article


def test_lightweight_poll_cache_and_visibility_revision(client, session, monkeypatch):
    monkeypatch.setattr(live_updates, '_cache', None)
    monkeypatch.setattr(live_updates, '_until', 0)
    first = client.get('/api/v1/updates')
    assert first.status_code == 200 and first.headers['cache-control'] == 'no-store'
    data = first.json()
    assert len(data['revision']) == 64 and data['browser_poll_seconds'] == 1
    assert data['feed_refresh_seconds'] >= 60
    assert set(data) == {'revision', 'checked_at', 'browser_poll_seconds', 'feed_refresh_seconds'}
    assert client.get('/api/v1/updates').json() == data
    article = session.scalar(select(Article).where(Article.status == 'published').limit(1))
    status = article.status
    try:
        article.status = 'withdrawn'; session.commit()
        monkeypatch.setattr(live_updates, '_until', 0)
        assert client.get('/api/v1/updates').json()['revision'] != data['revision']
    finally:
        article.status = status; session.commit()
        live_updates._cache = None
        live_updates._until = 0


def test_revision_changes_when_source_permission_changes(session):
    first = live_updates.publication_revision(session)
    article = session.scalar(select(Article).where(Article.status == 'published').limit(1))
    permission = article.source.permission
    allowed = permission.public_metadata_allowed
    try:
        permission.public_metadata_allowed = False; session.commit()
        assert live_updates.publication_revision(session) != first
    finally:
        permission.public_metadata_allowed = allowed; session.commit()
