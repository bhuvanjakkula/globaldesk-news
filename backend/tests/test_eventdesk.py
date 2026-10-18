from urllib.parse import parse_qs, urlsplit
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import delete, select
from app.models import Article, AuditLog, TrackedEvent
from app.owner_access import issue_link

ORIGIN = {'Origin': 'http://127.0.0.1:3000'}
BASE = '/api/v1/owner/events'


@pytest.fixture()
def editor(client, session):
    session.execute(delete(TrackedEvent)); session.commit()
    token = parse_qs(urlsplit(issue_link(session)).fragment)['token'][0]
    response = client.post('/api/v1/owner/redeem', headers=ORIGIN, json={'token': token})
    yield {**ORIGIN, 'Authorization': 'Bearer ' + response.json()['session_token']}
    session.execute(delete(TrackedEvent)); session.commit()


def selection(client):
    return [a['slug'] for a in client.get('/api/v1/news').json()['items'][:2]]


def create(client, editor):
    payload = {'title': 'Technology investigation', 'slugs': selection(client), 'note': 'Private analysis'}
    result = client.post(BASE + '/save', headers=editor, json=payload)
    assert result.status_code == 200
    return payload, result.json()


def current(client, editor):
    return client.get(BASE, headers=editor).json()['events'][0]


def decision(event, **extra):
    return {'id': event['id'], 'version': event['version'], 'status': 'reviewed',
            'evidence_digest': event['evidence_digest'], 'reason': 'Read the original evidence and checked its context.', **extra}


def test_authentication_origin_and_validation(client, editor):
    payload = {'title': 'Investigation', 'slugs': selection(client)}
    assert client.get(BASE).status_code == 401
    assert client.post(BASE + '/save', headers=ORIGIN, json=payload).status_code == 401
    assert client.post(BASE + '/save', headers={**editor, 'Origin': 'https://bad.invalid'}, json=payload).status_code == 403
    for extra in [{'title': ' '}, {'slugs': ['same', 'same']}, {'slugs': ['../bad']},
                  {'slugs': []}, {'owner_email': 'attacker@example.invalid'}]:
        assert client.post(BASE + '/save', headers=editor, json={**payload, **extra}).status_code == 422
    assert client.post(BASE + '/save', headers=editor, json={**payload, 'slugs': ['missing']}).status_code == 409


def test_stable_identity_review_and_optimistic_concurrency(client, editor, session):
    payload, created = create(client, editor)
    event = current(client, editor)
    assert event['review_needed'] and event['contains_demo']
    assert len(event['edges']) == 1
    assert len(event['timeline']) == 2
    response = client.post(BASE + '/review', headers=editor, json=decision(event))
    assert response.status_code == 200
    reviewed = current(client, editor)
    assert reviewed['status'] == 'reviewed' and not reviewed['review_needed']
    assert client.post(BASE + '/review', headers=editor, json=decision(event)).status_code == 409
    assert client.post(BASE + '/save', headers=editor, json={**payload, 'id': event['id'], 'version': 1}).status_code == 409
    edited = client.post(BASE + '/save', headers=editor, json={**payload, 'id': event['id'], 'version': 2, 'note': 'New context'})
    assert edited.status_code == 200 and edited.json()['id'] == created['id']
    assert current(client, editor)['status'] == 'draft'
    log = session.scalars(select(AuditLog).where(AuditLog.target == created['id'])).all()
    assert {'event-saved', 'event-reviewed'} <= {r.action for r in log}


def test_evidence_drift_stale_review_and_withdrawal(client, editor, session):
    payload, _ = create(client, editor)
    event = current(client, editor)
    assert client.post(BASE + '/review', headers=editor, json=decision(event)).status_code == 200
    before = current(client, editor)
    article = session.scalar(select(Article).where(Article.slug == payload['slugs'][0]))
    title, status = article.title, article.status
    try:
        article.title += ' updated'; session.commit()
        assert client.post(BASE + '/review', headers=editor, json=decision(before)).status_code == 409
        changed = current(client, editor)
        assert changed['changed_count'] == 1 and changed['review_needed']
        article.status = 'withdrawn'; session.commit()
        hidden = current(client, editor)
        assert hidden['unavailable_count'] == 1
        assert all(a['slug'] != article.slug for a in hidden['timeline'])
        assert hidden['edges'] == []
        assert client.post(BASE + '/review', headers=editor, json=decision(hidden)).status_code == 409
        assert client.post(BASE + '/review', headers=editor, json=decision(hidden, status='archived')).status_code == 200
    finally:
        article.title, article.status = title, status; session.commit()


def test_permission_expiry_hides_evidence_and_graph(client, editor, session):
    payload, _ = create(client, editor)
    article = session.scalar(select(Article).where(Article.slug == payload['slugs'][0]))
    permission = article.source.permission
    expiry = permission.expires_at
    try:
        permission.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1); session.commit()
        event = current(client, editor)
        assert event['unavailable_count'] >= 1 and event['review_needed']
        assert all(a['source']['domain'] != article.source.domain for a in event['timeline'])
        assert not event['edges']
    finally:
        permission.expires_at = expiry; session.commit()


def test_capacity_and_owner_scoping(client, editor, session):
    payload, created = create(client, editor)
    event = session.get(TrackedEvent, created['id'])
    original_owner = event.owner_email
    event.owner_email = 'another-owner@example.invalid'; session.commit()
    assert client.get(BASE, headers=editor).json()['events'] == []
    assert client.post(BASE + '/save', headers=editor, json={**payload, 'id': event.id, 'version': 1}).status_code == 409
    assert client.post(BASE + '/review', headers=editor, json={'id': event.id, 'version': 1,
        'status': 'archived', 'reason': 'Archive this investigation.', 'evidence_digest': '0' * 64}).status_code == 409
    event.owner_email = original_owner; session.commit()
    for slot in range(1, 30):
        session.add(TrackedEvent(id=f'{slot:032x}', owner_email=original_owner, slot=slot, title='Capacity fixture',
                                 slugs=payload['slugs'], fingerprints={}, status='archived', version=1))
    session.commit()
    assert client.post(BASE + '/save', headers=editor, json=payload).status_code == 409
