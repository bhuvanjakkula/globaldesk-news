import httpx
from app.gdelt import DOC_ENDPOINT, fetch_metadata, parse_seen


def test_gdelt_metadata_only_endpoint_and_query():
    def responder(req: httpx.Request) -> httpx.Response:
        assert str(req.url).startswith(DOC_ENDPOINT)
        assert req.url.params['mode'] == 'artlist'
        assert req.url.params['format'] == 'json'
        assert req.url.params['maxrecords'] == '3'
        return httpx.Response(200, json={'articles': [
            {'url': 'https://example.net/x', 'title': 'A demo headline', 'seendate': '20261016T080000Z'}
        ]})
    with httpx.Client(transport=httpx.MockTransport(responder)) as client:
        result = fetch_metadata('technology', client, max_records=3)
    assert len(result) == 1
    assert result[0]['title'] == 'A demo headline'
    assert parse_seen(result[0]['seendate']).year == 2026
