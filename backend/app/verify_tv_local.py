"""Read-only checks for the local News TV website and permission-aware bulletin."""
import json
from pathlib import Path
import httpx
from .owner_access import now


def main():
    checks = []
    with httpx.Client(base_url='http://127.0.0.1:3000', timeout=20, trust_env=False) as client:
        response = client.get('/tv')
        assert response.status_code == 200 and 'ARTIFICIAL PRESENTER' in response.text
        assert 'Not a live TV stream' in response.text and 'Export silent demo video' in response.text
        checks.append('TV page displays artificial-presenter and silent-export disclosures')
        for channel in ['markets', 'innovation', 'demo']:
            response = client.get('/api/broadcast', params={'channel': channel})
            assert response.status_code == 200
            data = response.json()
            assert len(data['items']) <= 12
            for item in data['items']:
                assert item['url'] and item['published_at'] and item['source']
                assert item['narration_allowed'] or item['spoken_text'] is None
            if channel == 'demo':
                assert data['items'] and all(i['is_demo'] and i['spoken_text'].startswith('Fictional demonstration.') for i in data['items'])
                item = data['items'][0]
                checked = client.get('/api/broadcast', params={'channel': channel, 'id': item['id']})
                assert checked.status_code == 200 and checked.json()['narration_allowed']
            checks.append(channel + ' bulletin preserves source identity, dates and speech gates')
        assert client.get('/api/broadcast?channel=invalid').status_code == 400
        checks.append('invalid channel rejected')
    result = {'checked_at': now().isoformat(), 'checks': checks,
              'scope': 'HTTP checks; browser voice audibility and video download require browser validation.'}
    (Path(__file__).resolve().parents[2] / 'docs/TV_HTTP_VERIFICATION.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(f'{len(checks)} News TV HTTP checks passed.')


if __name__ == '__main__':
    main()
