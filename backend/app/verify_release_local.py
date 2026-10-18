"""Read-only smoke checks against the running local release."""
import json
from datetime import datetime, timezone
from pathlib import Path
import httpx


def main():
    checks = []
    with httpx.Client(timeout=20, follow_redirects=True) as client:
        for path, expected in [('/', 'GLOBALDESK'), ('/markets', 'Global exchange directory'),
                               ('/innovation', 'Innovation'), ('/news', 'GLOBALDESK'),
                               ('/account/access', 'Sign in'), ('/sources', 'sources'),
                               ('/intelligence', 'Intelligence'), ('/security', 'Security')]:
            response = client.get('http://127.0.0.1:3000' + path)
            assert response.status_code == 200, (path, response.status_code)
            assert expected.casefold() in response.text.casefold(), path
            if path == '/markets':
                assert 'Market news temporarily unavailable' not in response.text
                assert 'Connected feeds refresh every' in response.text
                assert all(code in response.text for code in ['NYSE', 'NASDAQ', 'NSE', 'BSE', 'B3'])
            checks.append({'path': path, 'status': response.status_code})
        live = client.get('http://127.0.0.1:3000/api/updates')
        assert live.status_code == 200 and 'no-store' in live.headers['cache-control']
        assert live.json()['browser_poll_seconds'] == 1
        assert live.json()['feed_refresh_seconds'] >= 60
        checks.append({'path': '/api/updates', 'status': live.status_code})
        for path in ['/health', '/api/v1/markets/news?days=90', '/api/v1/innovation/signals?days=90']:
            response = client.get('http://127.0.0.1:8000' + path)
            assert response.status_code == 200, (path, response.status_code)
            data = response.json()
            checks.append({'path': path, 'status': response.status_code,
                           'total': data.get('total'), 'refresh_status': data.get('refresh_status')})
    report = {'checked_at': datetime.now(timezone.utc).isoformat(), 'checks': checks,
              'scope': 'HTTP response/content checks; no visual or accessibility sign-off.'}
    target = Path(__file__).resolve().parents[2] / 'docs/LOCAL_RELEASE_HTTP_VERIFICATION.json'
    target.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
