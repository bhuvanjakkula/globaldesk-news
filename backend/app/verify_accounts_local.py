"""Exercise website account cookies; clean up the disposable fixture account."""
import json
from pathlib import Path
import secrets
from uuid import uuid4
import httpx
from sqlalchemy import delete, select
from .db import SessionLocal
from .models import ReaderAccount, ReaderSession


def main():
    email = f'local-qa-{uuid4().hex}@example.invalid'
    password = secrets.token_urlsafe(24)
    origin = 'http://127.0.0.1:3000'
    checks = []
    try:
        with httpx.Client(base_url=origin, timeout=20, trust_env=False, headers={'Origin':origin}) as client:
            response = client.post('/account/actions', json={'action':'signup','payload':{'email':email,'password':password,'mobile':'+12025550123'}})
            assert response.status_code == 200, response.status_code
            cookie = response.headers['set-cookie'].lower()
            assert 'httponly' in cookie and 'samesite=strict' in cookie
            assert 'session_token' not in response.text
            checks.append('signup creates HttpOnly SameSite cookie without exposing token')
            response = client.get('/account')
            assert response.status_code == 200 and email in response.text
            checks.append('customer profile loads through website session')
            response = client.post('/account/actions', json={'action':'logout'})
            assert response.status_code == 200
            assert email not in client.get('/account').text
            checks.append('logout revokes access')
            response = client.post('/account/actions', json={'action':'signin','payload':{'email':email,'password':password}})
            assert response.status_code == 200 and email in client.get('/account').text
            checks.append('existing customer signs back in')
            response = client.post('/account/actions', headers={'Origin':'https://bad.invalid'}, json={'action':'logout'})
            assert response.status_code == 403
            checks.append('untrusted origin rejected')
    finally:
        with SessionLocal() as db:
            account = db.scalar(select(ReaderAccount).where(ReaderAccount.email == email))
            if account:
                db.execute(delete(ReaderSession).where(ReaderSession.account_id == account.id))
                db.delete(account); db.commit()
    Path('../docs/ACCOUNT_HTTP_VERIFICATION.json').write_text(json.dumps({'checks':checks,'fixture_removed':True},indent=2)+'\n',encoding='utf-8')
    print(f'{len(checks)} account HTTP checks passed; disposable account removed.')


if __name__ == '__main__':
    main()
