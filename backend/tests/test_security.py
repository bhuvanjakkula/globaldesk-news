from fastapi import FastAPI
from starlette.testclient import TestClient
from app.security import ReadOnlySecurityMiddleware, TokenBuckets


def test_public_api_headers_host_and_write_rejection(client):
    response=client.get('/health')
    assert response.status_code==200
    assert response.headers['x-content-type-options']=='nosniff'
    assert response.headers['x-frame-options']=='DENY'
    assert "frame-ancestors 'none'" in response.headers['content-security-policy']
    assert response.headers['cache-control']=='no-store'
    assert len(response.headers['x-request-id'])==32
    assert client.get('/health',headers={'Host':'attacker.invalid'}).status_code==400
    assert client.post('/api/v1/news',json={'status':'published'}).status_code==405
    assert client.get('/api/v1/news?page=10001').status_code==422
    assert client.get('/api/v1/news?q='+'a'*2100).status_code==414
    assert client.request('GET','/health',content=b'unexpected').status_code==413

def test_rate_limit_ignores_forwarding_and_client_ids():
    app=FastAPI();app.add_middleware(ReadOnlySecurityMiddleware,requests_per_minute=2,global_per_minute=20)
    @app.get('/health')
    def health(): return {'ok':True}
    with TestClient(app) as test:
        first=test.get('/health',headers={'X-Request-ID':'attacker-controlled'})
        second=test.get('/health',headers={'X-Forwarded-For':'1.2.3.4'})
        third=test.get('/health',headers={'X-Forwarded-For':'5.6.7.8'})
        assert first.status_code==second.status_code==200
        assert first.headers['x-request-id']!='attacker-controlled'
        assert third.status_code==429
        assert int(third.headers['retry-after'])>=1
        assert third.headers['x-frame-options']=='DENY'

def test_budget_refill_memory_bound_and_expensive_requests():
    now=[0.0]; budget=TokenBuckets(10,period=60,max_clients=2,clock=lambda:now[0])
    assert budget.allow('a',10)[0]
    assert not budget.allow('a',10)[0]
    now[0]=60
    assert budget.allow('a',10)[0]
    budget.allow('b');budget.allow('c')
    assert len(budget.clients)==2
    app=FastAPI();app.add_middleware(ReadOnlySecurityMiddleware,requests_per_minute=10,global_per_minute=100)
    @app.get('/api/v1/intelligence/test')
    def endpoint(): return {'ok':True}
    with TestClient(app) as test:
        assert test.get('/api/v1/intelligence/test').status_code==200
        assert test.get('/api/v1/intelligence/test').status_code==429

def test_pqc_posture_self_test_is_real_and_honest(client):
    data=client.get('/api/v1/security/posture').json()
    assert data['pqc']['self_test']['status']=='passed'
    assert data['pqc']['self_test']['tamper_rejected']
    assert data['pqc']['production_signing_identity']
    assert 'private.pem' not in str(data)

def test_unhandled_failures_are_sanitized_and_keep_headers():
    app=FastAPI();app.add_middleware(ReadOnlySecurityMiddleware)
    @app.get('/fail')
    def fail(): raise RuntimeError('sensitive database detail must never be returned')
    with TestClient(app) as test:
        response=test.get('/fail')
        assert response.status_code==500
        assert response.json()['detail']=='Internal service error'
        assert 'sensitive database' not in response.text
        assert response.headers['x-frame-options']=='DENY'
        assert response.json()['request_id']==response.headers['x-request-id']
