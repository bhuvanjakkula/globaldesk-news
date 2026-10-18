from datetime import timedelta
from uuid import uuid4
import pytest
from sqlalchemy import delete, select
from app.accounts import attempts, hash_password, verify_password
from app.models import ReaderAccount, ReaderSession
from app.owner_access import digest, now
from app.settings import OWNER_EMAIL

ORIGIN = {'Origin': 'http://127.0.0.1:3000'}


@pytest.fixture(autouse=True)
def reset_accounts(session):
    attempts.clients.clear()
    yield
    session.execute(delete(ReaderSession)); session.execute(delete(ReaderAccount)); session.commit()


def registration(**kwargs):
    return {'email': f'{uuid4().hex}@example.invalid', 'password': 'A test passphrase 2026!', 'mobile': '+91 98765 43210', **kwargs}


def test_hashes_are_salted_and_passwords_verified():
    first = hash_password('my-test-passphrase')
    assert first != hash_password('my-test-passphrase')
    assert verify_password('my-test-passphrase', first)
    assert not verify_password('incorrect-passphrase', first)


def test_signup_signin_logout_and_no_owner_access(client, session):
    payload = registration()
    created = client.post('/api/v1/account/signup', headers=ORIGIN, json=payload)
    assert created.status_code == 200
    token = created.json()['session_token']
    auth = {**ORIGIN, 'Authorization': 'Bearer ' + token}
    account = session.scalar(select(ReaderAccount).where(ReaderAccount.email == payload['email']))
    assert account.password_hash != payload['password'] and account.mobile == '+919876543210'
    assert session.get(ReaderSession, digest(token)) and not session.get(ReaderSession, token)
    me = client.get('/api/v1/account/me', headers=auth)
    assert me.json()['email'] == payload['email'] and me.json()['role'] == 'reader'
    assert client.get('/api/v1/owner/me', headers=auth).status_code == 401
    assert client.get('/api/v1/owner/editorial', headers=auth).status_code == 401
    assert client.post('/api/v1/account/logout', headers=auth, json={}).status_code == 200
    assert client.get('/api/v1/account/me', headers=auth).status_code == 401
    credentials = {'email': payload['email'].upper(), 'password': payload['password']}
    signed = client.post('/api/v1/account/signin', headers=ORIGIN, json=credentials)
    assert signed.status_code == 200 and signed.json()['session_token'] != token


def test_validation_origin_and_reserved_owner(client):
    payload = registration()
    assert client.post('/api/v1/account/signup', json=payload).status_code == 403
    assert client.post('/api/v1/account/signup', headers={'Origin':'https://bad.invalid'}, json=payload).status_code == 403
    for changes in [{'email': 'bad'}, {'mobile': '12345'}, {'password': 'short'}, {'role': 'owner'}]:
        assert client.post('/api/v1/account/signup', headers=ORIGIN, json={**payload, **changes}).status_code == 422
    assert client.post('/api/v1/account/signup', headers=ORIGIN, json={**payload, 'email': OWNER_EMAIL}).status_code == 409
    assert client.get('/api/v1/account/me').status_code == 401


def test_duplicate_wrong_password_expired_session_and_rate_limit(client, session):
    payload = registration()
    created = client.post('/api/v1/account/signup', headers=ORIGIN, json=payload)
    assert client.post('/api/v1/account/signup', headers=ORIGIN, json=payload).status_code == 409
    credentials = {'email': payload['email'], 'password': 'Wrong passphrase 2026'}
    wrong = client.post('/api/v1/account/signin', headers=ORIGIN, json=credentials)
    missing = client.post('/api/v1/account/signin', headers=ORIGIN, json={**credentials, 'email': 'missing@example.invalid'})
    assert wrong.status_code == missing.status_code == 401 and wrong.json()['detail'] == missing.json()['detail']
    row = session.get(ReaderSession, digest(created.json()['session_token']))
    row.expires_at = now() - timedelta(seconds=1); session.commit()
    assert client.get('/api/v1/account/me', headers={'Authorization':'Bearer '+created.json()['session_token']}).status_code == 401
    statuses = [client.post('/api/v1/account/signin', headers=ORIGIN, json=credentials).status_code for _ in range(12)]
    assert 429 in statuses
