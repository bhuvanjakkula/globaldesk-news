from app.main import CATEGORY_GROUPS
from datetime import datetime, timezone
from sqlalchemy import select
from app.editorial import moderate
from app.models import Article, AuditLog, Source


def test_combined_archive_filters_and_dates(client):
    item = client.get('/api/v1/news?category=technology&q=AI').json()['items'][0]
    day = item['published_at'][:10]
    params = dict(q='AI', category='technology', source=item['source']['domain'],
                  country=item['country'], language=item['language'], date_from=day, date_to=day)
    result = client.get('/api/v1/search', params=params)
    assert result.status_code == 200
    assert item['slug'] in [r['slug'] for r in result.json()['items']]
    params['date_to'] = '2000-01-01'
    assert client.get('/api/v1/search', params=params).status_code == 422
    assert client.get('/api/v1/news?date_from=bad').status_code == 422
    assert client.get('/api/v1/news?date_to=9999-12-31').status_code == 200


def test_briefing_has_only_requested_day_and_categories(client):
    day = client.get('/api/v1/news').json()['items'][0]['published_at'][:10]
    response = client.get('/api/v1/briefings/daily', params={'day': day})
    assert response.status_code == 200
    payload = response.json()
    assert {s['category']['slug'] for s in payload['sections']} == {c['slug'] for c in client.get('/api/v1/categories').json()}
    assert payload['kind'] == 'source-linked digest'
    assert any(s['items'] for s in payload['sections'])
    for section in payload['sections']:
        assert len(section['items']) <= 3
        assert all(i['published_at'][:10] == day and i['category']['slug'] in CATEGORY_GROUPS.get(section['category']['slug'], [section['category']['slug']]) for i in section['items'])
    assert client.get('/api/v1/briefings/daily?day=invalid').status_code == 422
    assert all(s['total'] == 0 for s in client.get('/api/v1/briefings/daily?day=2000-01-01').json()['sections'])


def test_withdrawal_hidden_from_every_public_view(client, session):
    article = session.scalar(select(Article).where(Article.status == 'published'))
    slug, status = article.slug, article.status
    try:
        moderate(session, 'withdraw', slug, 'test-editor', 'Correction pending verification')
        assert client.get(f'/api/v1/news/{slug}').status_code == 404
        assert slug not in [a['slug'] for a in client.get('/api/v1/search?page_size=48').json()['items']]
        sections = client.get('/api/v1/briefings/daily').json()['sections']
        assert all(slug not in [a['slug'] for a in s['items']] for s in sections)
        log = session.scalar(select(AuditLog).where(AuditLog.target == slug))
        assert log.actor == 'test-editor'
    finally:
        article.status = status
        session.commit()


def test_source_block_removes_filters_news_and_briefings(client, session):
    item = client.get('/api/v1/news').json()['items'][0]
    source = session.scalar(select(Source).where(Source.domain == item['source']['domain']))
    permission = source.permission
    previous = (permission.status, permission.public_metadata_allowed, permission.ai_processing_allowed)
    try:
        moderate(session, 'block-source', source.domain, 'test-editor', 'Publisher requested withdrawal')
        assert client.get('/api/v1/sources').json() == []
        assert client.get('/api/v1/filters').json() == {'countries': [], 'languages': []}
        assert client.get('/api/v1/news').json()['total'] == 0
        assert client.get(f"/api/v1/news/{item['slug']}").status_code == 404
        assert all(s['total'] == 0 for s in client.get('/api/v1/briefings/daily').json()['sections'])
    finally:
        permission.status, permission.public_metadata_allowed, permission.ai_processing_allowed = previous
        session.commit()
