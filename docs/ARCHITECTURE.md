# Architecture and operating guide

## Data model

- `sources`: canonical domain, display name, region, source type.
- `source_permissions`: one-to-one relationship to a source; explicit `status`, public metadata rights, AI rights (never auto-enabled), basis and review timestamp.
- `categories`: six editorial topics in the MVP.
- `articles`: metadata or original fictional fixtures; article URL unique if present, slug unique, status, country, language and event date.

The sample schema uses one primary category per article. Expand to many-to-many topic labels only when needed. Consider a separate `events` table for multi-publisher clustering in v2.

## End-to-end request

1. Next.js renders server-side HTML and calls the FastAPI endpoint using Docker internal DNS (`api:8000`) or localhost.
2. FastAPI fetches **only published records whose source permission is approved/demo and explicitly allows public metadata display**.
3. PostgreSQL indexes article status, category and date. UI displays source attribution and a publisher link for external records.
4. Redis receives tasks from Celery Beat every 30 minutes; workers call the GDELT discovery adapter only when `GDELT_ENABLED=true`.
5. The ingestion adapter normalizes URLs, drops tracking query parameters, deduplicates by normalized URL, and inserts unknown domains as `pending_review`.
6. The approval CLI operates entirely outside the public API and requires explicit rights attestation.

## Design tradeoffs

- Server components and plain CSS minimize frontend dependencies; rendering is dynamic (`cache: no-store`) so new metadata appears without a redeploy.
- SQLAlchemy and Alembic provide a migration path to production PostgreSQL; SQLite works locally for API testing.
- No rich publisher imagery, embedded social feeds, unauthorized AI summaries or public ingestion endpoints.
- Demo stays `noindex`; do not remove this until real editorial and compliance checks are complete.

## Production hardening checklist

- Replace all default database passwords and rotate secrets.
- Put public services behind TLS and a WAF/reverse proxy; configure allowed hosts, CSP, request timeouts and strict CORS.
- Restrict database and Redis to private networks (Compose exposes only loopback Postgres for local convenience).
- Add authenticated admin/RBAC, editorial audit logs, source takedown and user report workflow.
- Back up and restore-test PostgreSQL; add log retention and monitoring for data pipeline failures.
- Establish endpoint rate limits, per-publisher controls and freshness SLAs.
- Sanitize URLs, names and timestamps; test external metadata for malicious content.
- Add migration reviews, dependency scanning, container scanning and CI.
- Conduct legal analysis of copyright, press regulation, privacy, cookie consent and commercial licences relevant to operating jurisdiction.
- Add external feeds only after a rights-based source-by-source review.
