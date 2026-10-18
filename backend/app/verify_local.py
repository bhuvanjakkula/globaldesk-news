"""Local HTTP smoke checks, including an ephemeral owner session (no credentials printed)."""
import json
import secrets
from datetime import timedelta
from pathlib import Path
import httpx
from .db import SessionLocal
from .models import OwnerCredential
from .owner_access import digest, now
from .settings import OWNER_EMAIL


def main():
    api = 'http://127.0.0.1:8010'
    site = 'http://127.0.0.1:3010'
    token = secrets.token_urlsafe(32)
    key = digest(token)
    checks = []
    with SessionLocal() as db:
        db.add(OwnerCredential(token_hash=key, kind='session', email=OWNER_EMAIL, expires_at=now()+timedelta(minutes=2)))
        db.commit()
    try:
        with httpx.Client(timeout=20, trust_env=False) as http:
            response = http.get(api+'/health'); response.raise_for_status()
            checks.append({'route': '/health', 'status': response.status_code})
            articles = http.get(api+'/api/v1/news').json()['items'][:2]
            query = ','.join(a['slug'] for a in articles)
            for route in ['/', '/search', '/briefings', '/sources', '/intelligence', '/security', '/compare?slugs='+query, '/research', '/editorial']:
                response = http.get(site+route)
                response.raise_for_status()
                assert 'Content-Security-Policy' in response.headers
                assert '<html' in response.text
                checks.append({'route': route, 'status': response.status_code})
            private = http.get(api+'/api/v1/owner/editorial', headers={'Authorization': 'Bearer '+token})
            private.raise_for_status()
            assert private.json()['sources'] and private.json()['ingestion_runs']
            for route, text in [('/research', 'Keep the evidence connected.'), ('/editorial', 'Record an editorial decision')]:
                response = http.get(site+route, headers={'Cookie': 'globaldesk_owner='+token})
                response.raise_for_status()
                assert text in response.text
                checks.append({'route': route, 'authenticated': True, 'status': response.status_code})
    finally:
        with SessionLocal() as db:
            row = db.get(OwnerCredential, key)
            if row:
                db.delete(row); db.commit()
    result = {'checks': checks, 'total': len(checks), 'temporary_session_removed': True}
    Path('../docs/FINAL_HTTP_VERIFICATION.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print(f'{len(checks)} local HTTP checks passed; temporary session removed.')


if __name__ == '__main__':
    main()
