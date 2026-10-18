"""Public read API guardrails. Limits are per process, never proxy-header identity."""
import math
import logging
import time
from collections import OrderedDict
from threading import Lock
from uuid import uuid4
from starlette.responses import JSONResponse

SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    'Cache-Control': 'no-store',
}

class TokenBuckets:
    def __init__(self, capacity=240, period=60, max_clients=4096, clock=time.monotonic):
        self.capacity, self.period, self.max_clients, self.clock = capacity, period, max_clients, clock
        self.clients = OrderedDict()
        self.lock = Lock()

    def allow(self, key, cost=1):
        with self.lock:
            now = self.clock()
            tokens, last = self.clients.pop(key, (float(self.capacity), now))
            tokens = min(self.capacity, tokens + max(0, now-last)*self.capacity/self.period)
            allowed = tokens >= cost
            self.clients[key] = (tokens-cost if allowed else tokens, now)
            if len(self.clients)>self.max_clients: self.clients.popitem(last=False)
            return allowed, max(1, math.ceil(max(0,cost-tokens)*self.period/self.capacity))

class ReadOnlySecurityMiddleware:
    def __init__(self, app, requests_per_minute=240, global_per_minute=2400, max_query_bytes=2048):
        self.app = app
        self.clients = TokenBuckets(requests_per_minute)
        self.global_limit = TokenBuckets(global_per_minute, max_clients=1)
        self.max_query_bytes = max_query_bytes

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http': return await self.app(scope, receive, send)
        # Server-generated identifier; untrusted incoming X-Request-ID is ignored.
        request_id = uuid4().hex
        response_started = False
        async def guarded_send(message):
            nonlocal response_started
            if message['type']=='http.response.start':
                response_started = True
                headers = [(k,v) for k,v in message.get('headers',[]) if k.lower() not in {h.lower().encode() for h in SECURITY_HEADERS}]
                policy = dict(SECURITY_HEADERS)
                if scope.get('path') in {'/docs','/redoc','/docs/oauth2-redirect'}:
                    policy['Content-Security-Policy'] = "default-src 'none'; script-src https://cdn.jsdelivr.net 'unsafe-inline'; style-src https://cdn.jsdelivr.net 'unsafe-inline'; img-src https://fastapi.tiangolo.com data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"
                headers += [(k.lower().encode(),v.encode()) for k,v in policy.items()]
                headers.append((b'x-request-id',request_id.encode()))
                if scope.get('scheme')=='https': headers.append((b'strict-transport-security',b'max-age=31536000'))
                message = {**message,'headers':headers}
            await send(message)
        def reject(status, detail, headers=None):
            return JSONResponse({'detail':detail,'request_id':request_id},status_code=status,headers=headers)
        cost = 10 if (scope.get('path','').startswith('/api/v1/intelligence') or scope.get('path') in {'/api/v1/owner/watch/report','/api/v1/owner/watch/review','/api/v1/owner/research/save','/api/v1/owner/research/remove'}) else 1
        peer = (scope.get('client') or ('unknown',0))[0]
        global_ok, global_retry = self.global_limit.allow('all',cost)
        client_ok, client_retry = self.clients.allow(peer,cost)
        if not global_ok or not client_ok:
            return await reject(429,'Request limit reached',{'Retry-After':str(max(global_retry,client_retry))})(scope,receive,guarded_send)
        owner_write = scope['method']=='POST' and scope.get('path') in {'/api/v1/owner/redeem','/api/v1/owner/logout','/api/v1/owner/watch/save','/api/v1/owner/watch/remove','/api/v1/owner/watch/review','/api/v1/owner/research/save','/api/v1/owner/research/remove'}
        owner_write = owner_write or (scope['method']=='POST' and scope.get('path')=='/api/v1/owner/editorial/moderate')
        owner_write = owner_write or (scope['method']=='POST' and scope.get('path') in {'/api/v1/owner/events/save','/api/v1/owner/events/review'})
        owner_write = owner_write or (scope['method']=='POST' and scope.get('path') in {'/api/v1/account/signup','/api/v1/account/signin','/api/v1/account/logout'})
        owner_write = owner_write or (scope['method']=='POST' and scope.get('path')=='/api/v1/security/self-test')
        if scope['method'] not in {'GET','HEAD','OPTIONS'} and not owner_write:
            return await reject(405,'This is a read-only API',{'Allow':'GET, HEAD, OPTIONS'})(scope,receive,guarded_send)
        if len(scope.get('query_string',b''))>self.max_query_bytes or len(scope.get('path',''))>512:
            return await reject(414,'Request target is too long')(scope,receive,guarded_send)
        headers = dict(scope.get('headers',[]))
        # A read-only API accepts no request bodies, including chunked bodies.
        if not owner_write and (headers.get(b'content-length',b'0') != b'0' or b'transfer-encoding' in headers):
            return await reject(413,'Request bodies are not accepted')(scope,receive,guarded_send)
        if owner_write:
            # Bound the actual stream, including chunked bodies; do not trust Content-Length.
            payload = bytearray()
            while True:
                message = await receive()
                if message['type']=='http.disconnect': return
                payload.extend(message.get('body',b''))
                if len(payload)>4096:
                    return await reject(413,'Owner request exceeds 4 KiB')(scope,receive,guarded_send)
                if not message.get('more_body',False): break
            delivered=False
            async def bounded_receive():
                nonlocal delivered
                if not delivered:
                    delivered=True
                    return {'type':'http.request','body':bytes(payload),'more_body':False}
                return await receive()
            inner_receive=bounded_receive
        else: inner_receive=receive
        try:
            return await self.app(scope,inner_receive,guarded_send)
        except Exception as exc:
            logging.getLogger('globaldesk.security').error('Unhandled API failure type=%s request_id=%s', type(exc).__name__, request_id)
            if response_started: raise
            return await reject(500,'Internal service error')(scope,receive,guarded_send)
