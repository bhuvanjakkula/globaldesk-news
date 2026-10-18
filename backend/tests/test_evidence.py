from urllib.parse import parse_qs, urlsplit
import pytest
from sqlalchemy import delete, select
from app.models import Article, AuditLog, ResearchCollection
from app.owner_access import issue_link

ORIGIN = {'Origin': 'http://127.0.0.1:3000'}


@pytest.fixture()
def researcher(client, session):
    session.execute(delete(ResearchCollection)); session.commit()
    token = parse_qs(urlsplit(issue_link(session)).fragment)['token'][0]
    response = client.post('/api/v1/owner/redeem', headers=ORIGIN, json={'token': token})
    yield {**ORIGIN, 'Authorization': 'Bearer ' + response.json()['session_token']}
    session.execute(delete(ResearchCollection)); session.commit()


def selection(client):
    return [a['slug'] for a in client.get('/api/v1/news').json()['items'][:2]]


def test_compare_validates_selection_and_preserves_order(client):
    slugs = selection(client)
    response = client.get('/api/v1/compare', params={'slugs': ','.join(slugs)})
    assert response.status_code == 200
    result = response.json()
    assert [a['slug'] for a in result['articles']] == slugs
    assert len(result['pairs']) == 1
    assert result['dimensions']['demo_articles'] == 2
    assert 'truth' in result['method']
    for value in [slugs[0], ','.join([slugs[0]] * 2), '../bad,other']:
        assert client.get('/api/v1/compare', params={'slugs': value}).status_code in (422, 403)
    assert client.get('/api/v1/compare?slugs=unknown,missing').status_code == 404


def test_research_auth_origin_and_validation(client, researcher):
    payload = {'name': 'Study', 'slugs': selection(client)}
    assert client.get('/api/v1/owner/research').status_code == 401
    assert client.post('/api/v1/owner/research/save', headers=ORIGIN, json=payload).status_code == 401
    assert client.post('/api/v1/owner/research/save', headers={**researcher, 'Origin': 'https://bad.invalid'}, json=payload).status_code == 403
    for extra in [{'name': ' '}, {'owner_email': 'someone@invalid'}, {'slugs': ['same', 'same']}]:
        assert client.post('/api/v1/owner/research/save', headers=researcher, json={**payload, **extra}).status_code == 422


def test_research_versioning_fingerprints_and_visibility(client, session, researcher):
    slugs = selection(client)
    payload = {'name': 'Study', 'note': 'Check original sources.', 'slugs': slugs}
    created = client.post('/api/v1/owner/research/save', headers=researcher, json=payload)
    assert created.status_code == 200
    identity = {'id': created.json()['id'], 'version': 1}
    article = session.scalar(select(Article).where(Article.slug == slugs[0]))
    old_title, old_status = article.title, article.status
    try:
        article.title += ' revised'; session.commit()
        report = client.get('/api/v1/owner/research', headers=researcher).json()['collections'][0]
        assert report['changed_count'] == 1
        assert client.post('/api/v1/owner/research/save', headers=researcher, json={**payload, **identity}).json()['version'] == 2
        assert client.post('/api/v1/owner/research/save', headers=researcher, json={**payload, **identity}).status_code == 409
        assert client.post('/api/v1/owner/research/remove', headers=researcher, json=identity).status_code == 409
        article.status = 'withdrawn'; session.commit()
        assert client.get('/api/v1/compare', params={'slugs': ','.join(slugs)}).status_code == 404
        report = client.get('/api/v1/owner/research', headers=researcher).json()['collections'][0]
        assert report['unavailable_count'] == 1
        assert all(i['article']['slug'] != slugs[0] for i in report['items'])
        assert client.post('/api/v1/owner/research/save', headers=researcher, json=payload).status_code == 409
        assert client.post('/api/v1/owner/research/remove', headers=researcher, json={**identity, 'version': 2}).status_code == 200
        assert session.scalar(select(AuditLog).where(AuditLog.target == identity['id'], AuditLog.action == 'research-removed'))
    finally:
        article.title, article.status = old_title, old_status; session.commit()


def test_research_capacity_and_slot_reuse(client, researcher):
    payload = {'name': 'Study', 'slugs': selection(client)}
    records = [client.post('/api/v1/owner/research/save', headers=researcher, json=payload) for _ in range(20)]
    assert all(r.status_code == 200 for r in records)
    assert client.post('/api/v1/owner/research/save', headers=researcher, json=payload).status_code == 409
    first = records[0].json()
    assert client.post('/api/v1/owner/research/remove', headers=researcher, json={'id': first['id'], 'version': 1}).status_code == 200
    assert client.post('/api/v1/owner/research/save', headers=researcher, json=payload).status_code == 200
