"""Local Event Desk HTTP round trip; remove only generated QA data/session."""
from datetime import timedelta
import json
from pathlib import Path
import secrets
import httpx
from sqlalchemy import delete
from .db import SessionLocal
from .models import AuditLog, OwnerCredential, TrackedEvent
from .owner_access import digest, now
from .settings import OWNER_EMAIL


def main():
    origin = 'http://127.0.0.1:3000'
    api = 'http://127.0.0.1:8000/api/v1'
    token = secrets.token_urlsafe(32)
    key = digest(token)
    identifier = None
    checks = []
    with SessionLocal() as db:
        db.add(OwnerCredential(token_hash=key, kind='session', email=OWNER_EMAIL,
                               expires_at=now() + timedelta(minutes=3)))
        db.commit()
    try:
        with httpx.Client(timeout=20, trust_env=False, headers={'Origin': origin}) as client:
            assert client.get(api + '/owner/events').status_code == 401
            assert client.post(origin + '/events/actions', json={'action': 'save', 'payload': {}}).status_code == 401
            checks.append('unauthenticated API and website actions rejected')
            slugs = [a['slug'] for a in client.get(api + '/news').json()['items'][:2]]
            client.cookies.set('globaldesk_owner', token, domain='127.0.0.1', path='/')
            response = client.post(origin + '/events/actions', json={'action': 'save', 'payload': {
                'title': 'Disposable local QA investigation', 'slugs': slugs, 'note': 'Local verification fixture.'}})
            assert response.status_code == 200, response.text
            identifier = response.json()['id']
            checks.append('website action creates private event')
            page = client.get(origin + '/events')
            assert page.status_code == 200 and 'Disposable local QA investigation' in page.text
            assert 'Pairwise headline evidence connections' in page.text
            assert 'Content-Security-Policy' in page.headers
            checks.append('authenticated page renders dossier, timeline and connections')
            auth = {'Authorization': 'Bearer ' + token}
            event = next(e for e in client.get(api + '/owner/events', headers=auth).json()['events'] if e['id'] == identifier)
            payload = {'id': identifier, 'version': event['version'], 'evidence_digest': event['evidence_digest'],
                       'status': 'reviewed', 'reason': 'Disposable QA: inspected the evidence workflow.'}
            response = client.post(origin + '/events/actions', json={'action': 'review', 'payload': payload})
            assert response.status_code == 200, response.text
            checks.append('website action records human review')
            assert client.post(origin + '/events/actions', json={'action': 'review', 'payload': payload}).status_code == 409
            checks.append('stale review rejected across website proxy')
            assert client.post(origin + '/events/actions', headers={'Origin': 'https://bad.invalid'},
                               json={'action': 'review', 'payload': payload}).status_code == 403
            checks.append('untrusted browser origin rejected')
            assert 'Track this coverage over time' in client.get(origin + '/intelligence').text
            checks.append('Intelligence Lab exposes tracking workflow')
    finally:
        with SessionLocal() as db:
            if identifier:
                db.execute(delete(TrackedEvent).where(TrackedEvent.id == identifier, TrackedEvent.owner_email == OWNER_EMAIL))
                db.execute(delete(AuditLog).where(AuditLog.target == identifier, AuditLog.actor == OWNER_EMAIL))
            db.execute(delete(OwnerCredential).where(OwnerCredential.token_hash == key))
            db.commit()
    report = {'checked_at': now().isoformat(), 'checks': checks, 'qa_dossier_and_session_removed': True,
              'scope': 'HTTP integration checks; visual acceptance not established.'}
    (Path(__file__).resolve().parents[2] / 'docs/EVENT_DESK_HTTP_VERIFICATION.json').write_text(
        json.dumps(report, indent=2), encoding='utf-8')
    print(f'{len(checks)} Event Desk HTTP checks passed; QA dossier and session removed.')


if __name__ == '__main__':
    main()
