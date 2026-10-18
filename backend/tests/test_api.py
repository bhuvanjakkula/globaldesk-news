from sqlalchemy import select
from app.models import Article, Source, SourcePermission
from app.gdelt import normalized_url, stage_articles


def test_home_news_has_mock_articles(client):
    response = client.get('/api/v1/news')
    assert response.status_code == 200
    payload = response.json()
    assert payload['total'] >= 12
    assert all(item['is_demo'] for item in payload['items'])


def test_topics_filter_and_search(client):
    response = client.get('/api/v1/news?category=technology&q=AI')
    assert response.status_code == 200
    assert response.json()['total'] >= 1
    assert all(article['category']['slug'] == 'technology' for article in response.json()['items'])


def test_unknown_story_404(client):
    assert client.get('/api/v1/news/not-found').status_code == 404
    assert client.get('/api/v1/news?page_size=999').status_code == 422


def test_url_normalization_rejects_local_and_strips_tracking():
    assert normalized_url('http://127.0.0.1/internal') is None
    assert normalized_url('https://example.com/test?utm_medium=email&x=1')[0] == 'https://example.com/test?x=1'


def test_gdelt_stages_unapproved_source_without_publishing(client, session):
    staged = stage_articles(session, 'business', [{
        'url': 'https://samplepublisher.invalid/path?utm_campaign=test',
        'title': 'Testing a new fictional GDELT headline',
        'language': 'English', 'sourcecountry': 'US', 'seendate': '20261016070000',
    }])
    assert staged['pending'] == 1
    saved = session.scalar(select(Article).where(Article.url == 'https://samplepublisher.invalid/path'))
    assert saved.status == 'pending_review'
    assert saved.summary is None
    assert session.scalar(select(SourcePermission).join(Source).where(Source.domain == 'samplepublisher.invalid')).public_metadata_allowed is False
    assert client.get('/api/v1/news?q=Testing%20a%20new%20fictional').json()['total'] == 0
    assert stage_articles(session, 'business', [{'url': 'https://samplepublisher.invalid/path', 'title': 'Testing a new fictional GDELT headline'}])['duplicate'] == 1


def test_source_registry_only_shows_approved(client):
    names = [s['name'] for s in client.get('/api/v1/sources').json()]
    assert 'Global Desk Demo' in names
    assert 'Reuters' not in names
