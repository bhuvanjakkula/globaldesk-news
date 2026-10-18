from urllib.parse import parse_qs, urlsplit
from sqlalchemy import select
from app.models import Article, AuditLog
from app.owner_access import issue_link


def test_editorial_auth_origin_decision_and_audit(client, session):
    origin = {'Origin': 'http://127.0.0.1:3000'}
    token = parse_qs(urlsplit(issue_link(session)).fragment)['token'][0]
    redeemed = client.post('/api/v1/owner/redeem', headers=origin, json={'token': token})
    headers = {**origin, 'Authorization': 'Bearer ' + redeemed.json()['session_token']}
    assert client.get('/api/v1/owner/editorial').status_code == 401
    report = client.get('/api/v1/owner/editorial', headers=headers)
    assert report.status_code == 200 and report.json()['sources']
    assert client.get('/api/v1/owner/editorial?page=0', headers=headers).status_code == 422
    article = session.scalar(select(Article).where(Article.status == 'published'))
    old = article.status
    payload = {'action': 'withdraw', 'target': article.slug, 'reason': 'Withdraw for editorial verification.'}
    try:
        assert client.post('/api/v1/owner/editorial/moderate', headers=origin, json=payload).status_code == 401
        assert client.post('/api/v1/owner/editorial/moderate', headers={**headers, 'Origin': 'https://bad.invalid'}, json=payload).status_code == 403
        assert client.post('/api/v1/owner/editorial/moderate', headers=headers, json={**payload, 'actor': 'spoofed'}).status_code == 422
        assert client.post('/api/v1/owner/editorial/moderate', headers=headers, json={**payload, 'reason': '            '}).status_code == 422
        assert client.post('/api/v1/owner/editorial/moderate', headers=headers, json=payload).status_code == 200
        assert client.get('/api/v1/news/' + article.slug).status_code == 404
        audit = session.scalar(select(AuditLog).where(AuditLog.target == article.slug, AuditLog.action == 'withdraw').order_by(AuditLog.id.desc()))
        assert audit.actor != 'spoofed' and audit.reason == payload['reason']
    finally:
        article.status = old; session.commit()
