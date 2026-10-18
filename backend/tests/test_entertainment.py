from sqlalchemy import select
from app.models import Source

def test_entertainment_groups_preserve_archive_filters(client):
    categories = client.get('/api/v1/categories').json()
    assert len(categories) == 14
    all_culture = client.get('/api/v1/news?category=entertainment&page_size=48').json()
    assert all_culture['total'] == 12
    music = client.get('/api/v1/news?category=music&country=Asia&language=English').json()
    assert music['total'] == 1
    assert music['items'][0]['category']['slug'] == 'pop'
    day = music['items'][0]['published_at'][:10]
    dated = client.get(f'/api/v1/search?category=music&date_from={day}&date_to={day}').json()
    assert any(a['slug'] == music['items'][0]['slug'] for a in dated['items'])
    assert len(client.get('/api/v1/briefings/daily').json()['sections']) == 14

def test_blocked_culture_hidden_in_parent_group(client, session):
    source = session.scalar(select(Source).where(Source.domain == 'example.org'))
    previous = source.permission.status
    try:
        source.permission.status = 'blocked'
        session.commit()
        assert client.get('/api/v1/news?category=entertainment').json()['total'] == 0
        assert client.get('/api/v1/news?category=music').json()['total'] == 0
    finally:
        source.permission.status = previous
        session.commit()
