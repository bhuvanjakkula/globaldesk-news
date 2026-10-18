from datetime import datetime, timedelta, timezone
from uuid import uuid4
import pytest
from sqlalchemy import delete
from app.models import FinanceSignal, Source, SourcePermission


@pytest.fixture()
def broadcast_source(session):
    source = Source(name='Broadcast rights fixture', domain=uuid4().hex+'.invalid', source_type='official_finance', region='Global')
    session.add(source); session.flush()
    permission = SourcePermission(source_id=source.id, status='approved', public_metadata_allowed=True,
        ai_processing_allowed=False, narration_allowed=False, rights_basis='Testing fixture only')
    session.add(permission)
    record = FinanceSignal(id=uuid4().hex, title='Fixture official headline for narration tests',
        url='https://'+source.domain+'/news', source_id=source.id, region='Global', topics=['rates'],
        published_at=datetime.now(timezone.utc)-timedelta(minutes=1), status='published')
    session.add(record); session.commit()
    yield source, permission, record
    session.execute(delete(FinanceSignal).where(FinanceSignal.source_id==source.id))
    session.delete(permission); session.delete(source); session.commit()


def test_narration_requires_separate_source_grant(client, session, broadcast_source):
    source, permission, record = broadcast_source
    query = {'channel': 'markets', 'identifier': record.id}
    item = client.get('/api/v1/broadcast/check', params=query).json()
    assert item['title']==record.title and not item['narration_allowed'] and item['spoken_text'] is None
    permission.narration_allowed=True; session.commit()
    item = client.get('/api/v1/broadcast/check', params=query).json()
    assert item['narration_allowed'] and record.title in item['spoken_text']
    assert not permission.ai_processing_allowed  # narration never grants other AI rights
    permission.narration_allowed=False; session.commit()
    assert client.get('/api/v1/broadcast/check', params=query).json()['spoken_text'] is None


def test_broadcast_rechecks_publication_and_expiry(client, session, broadcast_source):
    source, permission, record = broadcast_source
    query = {'channel':'markets','identifier':record.id}
    permission.narration_allowed=True; permission.expires_at=datetime.now(timezone.utc)-timedelta(seconds=1); session.commit()
    assert client.get('/api/v1/broadcast/check', params=query).status_code==404
    permission.expires_at=None; record.status='withdrawn'; session.commit()
    assert client.get('/api/v1/broadcast/check', params=query).status_code==404
    record.status='published'; permission.public_metadata_allowed=False; session.commit()
    assert client.get('/api/v1/broadcast?channel=markets').json()['items']==[]


def test_fictional_demo_narration_and_channel_validation(client):
    response=client.get('/api/v1/broadcast?channel=demo')
    assert response.status_code==200
    items=response.json()['items']
    assert items
    assert all(i['is_demo'] and i['narration_allowed'] and i['spoken_text'].startswith('Fictional demonstration.') for i in items)
    assert client.get('/api/v1/broadcast?channel=unknown').status_code==422
    assert client.get('/api/v1/broadcast/check?channel=demo&identifier=missing').status_code==404


def test_complete_bulletin_includes_older_headlines(client, session, broadcast_source):
    source, permission, record = broadcast_source
    identifiers = {record.id}
    for i in range(15):
        identifier = uuid4().hex
        identifiers.add(identifier)
        session.add(FinanceSignal(id=identifier, title=f'Complete bulletin headline {i}',
            url=f'https://{source.domain}/{i}', source_id=source.id, region='Global', topics=['rates'],
            published_at=record.published_at-timedelta(minutes=i+1), status='published'))
    session.commit()
    items = client.get('/api/v1/broadcast?channel=markets').json()['items']
    assert identifiers.issubset({item['id'] for item in items})
    oldest = items[-1]['id']
    assert client.get('/api/v1/broadcast/check', params={'channel':'markets','identifier':oldest}).status_code == 200
