from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, parse_qs
import pytest
from sqlalchemy import delete, select
from app.owner_access import issue_link
from app.models import OwnerCredential

ORIGIN={'Origin':'http://127.0.0.1:3000'}

def token(link):return parse_qs(urlsplit(link).fragment)['token'][0]

@pytest.fixture(autouse=True)
def clear_owner_credentials(session):
    session.execute(delete(OwnerCredential));session.commit()
    yield
    session.execute(delete(OwnerCredential));session.commit()

def claim(client,session):
    link=issue_link(session)
    response=client.post('/api/v1/owner/redeem',json={'token':token(link)},headers=ORIGIN)
    assert response.status_code==200
    return response.json()['session_token']

def test_email_alone_cannot_unlock_owner(client):
    assert client.get('/api/v1/owner/me').status_code==401
    assert client.get('/api/v1/owner/me?email=bhuvanjakkula@gmail.com').status_code==401
    assert client.post('/api/v1/owner/redeem',json={'email':'bhuvanjakkula@gmail.com'},headers=ORIGIN).status_code==422
    assert client.post('/api/v1/owner/issue',json={'email':'bhuvanjakkula@gmail.com'}).status_code==405

def test_owner_free_entitlement_and_hashed_storage(client,session):
    raw=claim(client,session)
    response=client.get('/api/v1/owner/me',headers={'Authorization':f'Bearer {raw}'})
    data=response.json()
    assert data['email']=='bhuvanjakkula@gmail.com'
    assert data['role']=='owner' and data['payment_required'] is False and data['price']==0
    assert data['stats']['articles']>=24
    assert data['expires_at'].endswith('+00:00')
    assert all(a['created_at'].endswith('+00:00') for a in data['recent_activity'])
    assert raw not in str(data)
    assert all(row.token_hash!=raw and len(row.token_hash)==64 for row in session.scalars(select(OwnerCredential)))

def test_link_expiry_rotation_and_single_use(client,session):
    old=issue_link(session);new=issue_link(session)
    assert client.post('/api/v1/owner/redeem',json={'token':token(old)},headers=ORIGIN).status_code==401
    assert client.post('/api/v1/owner/redeem',json={'token':token(new)},headers=ORIGIN).status_code==200
    assert client.post('/api/v1/owner/redeem',json={'token':token(new)},headers=ORIGIN).status_code==401
    link=issue_link(session)
    row=session.scalar(select(OwnerCredential).where(OwnerCredential.kind=='link'))
    row.expires_at=datetime.now(timezone.utc)-timedelta(minutes=1);session.commit()
    assert client.post('/api/v1/owner/redeem',json={'token':token(link)},headers=ORIGIN).status_code==401

def test_origin_checks_and_logout_revoke_session(client,session):
    link=issue_link(session)
    for headers in [{},{'Origin':'https://attacker.invalid'}]:
        assert client.post('/api/v1/owner/redeem',json={'token':token(link)},headers=headers).status_code==403
    raw=client.post('/api/v1/owner/redeem',json={'token':token(link)},headers=ORIGIN).json()['session_token']
    auth={'Authorization':f'Bearer {raw}'}
    assert client.post('/api/v1/owner/logout',headers={**auth,'Origin':'https://attacker.invalid'}).status_code==403
    assert client.get('/api/v1/owner/me',headers=auth).status_code==200
    assert client.post('/api/v1/owner/logout',headers={**auth,**ORIGIN}).status_code==200
    assert client.get('/api/v1/owner/me',headers=auth).status_code==401

def test_expired_session_and_oversize_request(client,session):
    raw=claim(client,session)
    row=session.scalar(select(OwnerCredential).where(OwnerCredential.kind=='session'))
    row.expires_at=datetime.now(timezone.utc)-timedelta(seconds=1);session.commit()
    assert client.get('/api/v1/owner/me',headers={'Authorization':f'Bearer {raw}'}).status_code==401
    assert client.post('/api/v1/owner/redeem',content=b'x'*5000,headers=ORIGIN).status_code==413

def test_parallel_redemption_has_one_winner(client,session):
    value=token(issue_link(session))
    def redeem(_):return client.post('/api/v1/owner/redeem',json={'token':value},headers=ORIGIN).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:statuses=list(pool.map(redeem,range(2)))
    assert sorted(statuses)==[200,401]
