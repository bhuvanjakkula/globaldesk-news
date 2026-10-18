# GlobalDesk — Global News Intelligence MVP

**Current local release: v0.16.** News TV now has a dedicated network masthead,
panoramic studio, programme rundown, headline ticker and responsive broadcast layout.
[News TV](docs/NEWS_TV.md) adds an animated artificial
presenter, captions, permission-aware on-device narration and silent demo video export.
[Live updates](docs/LIVE_UPDATES.md) checks collected
news changes every second and refreshes public pages automatically. Connected
official/research importers default to 60 seconds after each completed fetch.
[Event Desk](docs/EVENT_DESK.md) adds persistent
investigations, evidence connections, change detection and versioned editorial review.
[Wall Street & Global Exchanges](docs/MARKETS.md)
adds official finance news, exchange discovery, clocks, favourites and research links.
[Innovation Radar](docs/INNOVATION_RADAR.md) adds
real research and official title/link metadata, eight technology lenses and provenance.
Visitors reach news directly; the founder credit appears beside the masthead.
Customer email/password/mobile
accounts are available; see [customer accounts](docs/CUSTOMER_ACCOUNTS.md).
Comparison/Research Library, authenticated Editorial Desk,
publisher permission expiry, discovery-run history and SQLite backup/recovery are implemented.
See the current verification report for test and HTTP results. Read
[current completion status](COMPLETION_STATUS.md), [operations](docs/OPERATIONS.md) and
[research workflows](docs/RESEARCH_LIBRARY.md). Live publishing and production deployment
still require the inputs and work listed in the completion status.

A runnable starter monorepo for a public, **metadata-first** global news-discovery website. Includes a Next.js 16 / React 19 frontend, Python FastAPI backend, PostgreSQL migrations, source-permissions registry, a Celery/Redis scheduled discovery worker and a **disabled-by-default** GDELT DOC 2.0 adapter.

> **IMPORTANT — DEMONSTRATION, NOT LIVE NEWS:** Initial headlines, article descriptions and dates are fictitious educational fixtures. They are marked **DEMO / FICTIONAL** in the UI. This starter does **not** establish publisher licences, fetch paywalled article bodies, republish images or generate AI summaries of unlicensed content. Pages are `noindex` while the demo is active.

## 1. Requirements

**Recommended:** Docker Desktop (including Docker Compose v2), with at least 3 GB available RAM, and an internet connection to download dependency images. Open ports **3000** and **8000** (local machine); optional local PostgreSQL port **5433**. **Alternative without Docker:** Python 3.12+, Node 22+, PostgreSQL 16+, Redis 7+ for background jobs.

## 2. Start with Docker (recommended)

```bash
unzip global-news-mvp.zip
cd global-news-mvp
cp .env.example .env
# Windows PowerShell: Copy-Item .env.example .env
# For anything exposed outside localhost, set a strong POSTGRES_PASSWORD first.
docker compose up --build -d
```

On the *first* startup, Compose downloads images, builds the frontend and backend, applies Alembic migrations, and seeds the demo records. A temporary API startup delay is normal.

- Website: **http://localhost:3000**
- Interactive API documentation: **http://localhost:8000/docs**
- API health: **http://localhost:8000/health**
- Example topic: **http://localhost:3000/topics/technology**
- Search: **http://localhost:3000/search?q=AI**
- Sources: **http://localhost:3000/sources**

Check containers and API:

```bash
docker compose ps
docker compose logs -f api
docker compose exec api python -m app.seed  # safe to run repeatedly
curl http://localhost:8000/api/v1/news?category=economy
```

Stop safely: `docker compose down` (database is preserved in named volume). **Deletes all database contents:** `docker compose down -v`.

## 3. Local development without Docker

For the complete Windows local desk after installing dependencies, run
`./Run-GlobalDesk.ps1`. It backs up the database, migrates, builds and runs the
website and API, and refreshes Innovation Radar and market metadata 60 seconds
after each completed fetch by default. Keep the launcher open; Ctrl+C stops its child services. Logs are in
`logs/` and excluded from source releases. Use `-SkipBuild` to reuse its most
recent build or `-SkipRefresh` to run without background feed fetches. Occupied
ports are rejected rather than stopping another application. No email is sent.
Docker's Celery scheduler also includes both official metadata refresh jobs;
GDELT discovery remains opt-in. Run only one scheduler per database to avoid
duplicate upstream requests.

Windows shortcut after installing the dependencies below: run `./Start-GlobalDesk.ps1 -Service Api`
in one PowerShell terminal and `./Start-GlobalDesk.ps1 -Service Website` in another.
The API shortcut applies migrations and seeds records before starting. For Docker,
use `./Start-GlobalDesk.ps1 -Service Docker` after installing Docker Desktop.

Install packages using the project files and your local Python/Node package managers. Using SQLite for development means you can run the API and website without a PostgreSQL installation (Celery/Redis only needed for scheduled jobs).

Terminal A:

```bash
cd backend
python -m venv .venv
# macOS/Linux: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
# DATABASE_URL defaults to sqlite:///./local.db if not set.
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

Terminal B:

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000. The frontend uses `INTERNAL_API_URL` if set, otherwise `http://localhost:8000`. The Docker frontend talks to the API internally at `http://api:8000`.

To test the backend:

```bash
cd backend
pytest -q
```

To typecheck/build the frontend after installing dependencies:

```bash
cd frontend
npm run typecheck
npm run build
```

## 4. How news collection works

The `backend/app/gdelt.py` adapter requests only **GDELT DOC 2.0 ArticleList metadata**, including titles, article URLs, timestamps, source countries and languages. It **does not access or crawl the publishers' pages or download article bodies or photographs.** Six approved query templates correspond to World, Business, Economy, Politics, Technology and Marketing.

**All live discovery is disabled by default.** To test the adapter against GDELT, set `GDELT_ENABLED=true` in `.env` and manually run:

```bash
docker compose run --rm -e GDELT_ENABLED=true api python -m app.ingest
```

Since the API container's normal service startup runs migrations and seeds the database, it should already be initialized by `docker compose up`. Alternatively, locally from `backend/` after migration and seeding:

```bash
GDELT_ENABLED=true python -m app.ingest
```

On Windows PowerShell set `$env:GDELT_ENABLED="true"` for the current terminal before the command. **Collected items from unknown/unapproved sources are saved with `pending_review` and never appear in public API responses.** The registry defaults to *pending* for well-known news organizations. The demo publisher alone is preapproved for its original fixtures.

### How to approve a source correctly

1. Verify the publisher's metadata display rights and the exact scope of your planned use. Do **not** assume GDELT makes underlying publisher articles free to reprint.
2. Record the licence or other verified legal basis and documentation outside the application.
3. Run the following CLI using the exact registered domain, only if you actually have the required rights:

```bash
docker compose exec api python -m app.approve_source \
  --domain samplepublisher.com \
  --actor 'publisher-reviewer' \
  --basis 'Licence agreement 123, executed 2026-01-01' \
  --confirm-rights
```

This marks the source approved for **metadata display only**, and publishes any staged GDELT metadata records from that domain. It **does not grant AI-training, summarization, image or full-text republication rights**. The CLI cannot legally grant rights by itself and is intended for administrators, not public users.

To run the scheduled worker every 30 minutes: keep the `worker`, `beat` and `redis` services running and set `GDELT_ENABLED=true` in `.env`, then `docker compose up -d --force-recreate worker beat` to pick up the change. The worker also uses source-permission checks. Operators should verify current GDELT endpoint behavior, acceptable request rates and terms before enabling it.

## 5. API endpoints

| Request | Purpose |
|---|---|
| `GET /health` | API and database health |
| `GET /api/v1/categories` | List supported subjects |
| `GET /api/v1/sources` | Publicly approved sources only |
| `GET /api/v1/news` | Paginated latest public articles |
| `GET /api/v1/news?category=technology` | Topic filter |
| `GET /api/v1/news?q=AI&country=Asia&page=1` | Search, region and pagination |
| `GET /api/v1/news/{slug}` | Published item details |
| `GET /docs` | Interactive OpenAPI specification |

`page_size` defaults to 12 and cannot exceed 48. Only published articles with approved permissions reach the public API. Query text is bound via SQLAlchemy, rather than interpolated into raw SQL.

## 6. Project tree

```text
global-news-mvp/
├── .env.example              Environment and safe GDELT default
├── compose.yaml              Frontend, API, worker, beat, Postgres, Redis
├── config/sources.json       Human-readable rights/source registry
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py            Public API routes
│   │   ├── db.py, models.py    SQLAlchemy ORM
│   │   ├── schemas.py         Response models
│   │   ├── seed.py            Demo fixtures + registry
│   │   ├── gdelt.py           Metadata-only GDELT client
│   │   ├── ingest.py          One-shot discovery runner
│   │   ├── tasks.py           Celery job scheduler
│   │   └── approve_source.py  Explicit permission-review CLI
│   ├── alembic/versions/      Versioned schema migration
│   └── tests/                API, validation and rights tests
├── frontend/
│   ├── app/                  Next.js routes and CSS
│   ├── components/           Article card, feed, nav and footer
│   └── lib/api.ts            Typed API client
└── docs/                     Architecture, legal safeguards and roadmap
```

## 7. Architecture and boundaries

```text
GDELT DOC 2.0 metadata ──> source permissions check ──> PostgreSQL
                                 │                    └── pending_review (hidden)
Original fictional fixtures ─────┴────> approved demo records
                                                      │
Redis + Celery Beat ──> Celery worker ──> GDELT adapter │
                                                      ▼
                                        FastAPI read-only public API
                                                      │
                                                  Next.js UI
```

- **Editorial comparison, multi-source clustering and AI summaries:** roadmap items, not falsely represented as implemented.
- **Privacy / SEO:** prototype uses no analytics, cookies, accounts or marketing forms. Set proper metadata, legal pages, indexing and editorial contact details before launching commercially.
- **Public access to API:** Only GET endpoints exist; permissions cannot be approved over HTTP.
- **Network protection:** Database ports are bound to localhost in Compose. Production needs HTTPS, hardened credentials, secret management, authentication, backups, monitoring and a security review.

Read [architecture](docs/ARCHITECTURE.md), [rights and publishing rules](docs/RIGHTS_AND_SAFETY.md), and [the implementation roadmap](docs/ROADMAP.md) before going live.

## 8. Attribution and documentation

The optional discovery adapter uses [The GDELT Project](https://www.gdeltproject.org/), not a licence to publishers' articles. See [GDELT DOC 2.0 API documentation](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/), [GDELT terms and reuse guidance](https://www.gdeltproject.org/about.html), [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [FastAPI documentation](https://fastapi.tiangolo.com/), and [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/20/orm/).

This code starter is supplied without operational or legal warranties. Obtain publisher and local-jurisdiction legal review before launching a commercial news service.


## Reader and editorial extensions

Search now supports publisher, country/region, language, section and inclusive UTC date filters. `/briefings` provides a dated source-linked digest; `/api/v1/briefings/daily` exposes it as JSON. This is not AI-generated analysis or an email service.

Private moderation is available through `python -m app.editorial` (`withdraw`, `block-source`, `audit`). Apply migrations first. Source approval now requires `--actor`; decisions are recorded in `audit_logs`. See [the project blueprint](docs/PROJECT_BLUEPRINT.md) for the full architecture, operator examples, development stages and remaining launch work.


## v0.3 Entertainment & Culture integration

The supplied entertainment expansion is merged with the v0.2 archive and moderation features. Fourteen sections, 24 fictional fixtures and 20 registered sources are available. Entertainment includes Movies, Films, Hollywood, Music, Pop, Rock and Arts; Movies includes Films and Hollywood; Music includes Pop and Rock. Group filters compose with publisher, language, country and dates. Daily briefing sections use the same groups, so a story can appear in both a parent section and its genre. Culture artwork, showcase and image credits are included. Source candidates remain pending. See COMPLETION_STATUS.md for remaining launch dependencies.


## v0.4 Intelligence Lab

Open `/intelligence` for explainable headline groups, coverage provenance, source-domain comparisons and time/section filters. JSON: `/api/v1/intelligence/events?hours=168&min_sources=1`. See [engineering notes](docs/INTELLIGENCE_ENGINEERING.md) for the algorithm, evaluation and operational limits. No new dependency or schema migration is required.


## v0.5 Security & post-quantum integrity

Open `/security` for runtime cryptographic self-test and control boundaries. Offline public-news exports support ML-DSA-65 + Ed25519 integrity receipts with encrypted private keys, trusted-key verification and expiry. API request budgets, host validation, sanitized errors, browser nonce policies and container hardening are added. Read [SECURITY.md](SECURITY.md) for operator commands, audit evidence and limitations. Local HTTP is not quantum-safe transport; production signing identity and deployment protection are not configured.


## v0.6 Free, passwordless owner access

Owner `bhuvanjakkula@gmail.com` can use a trusted-server-issued, single-use sign-in link with no password or payment. Run `./Open-Owner.ps1` after starting the services, then confirm the sign-in. Links expire after ten minutes and owner browser sessions last twelve hours. Read [owner access instructions](docs/OWNER_ACCESS.md). No sign-in email or mailbox verification is provided by this local workflow.


## v0.7 Private Watch Desk

Open `/watchdesk` with your existing free owner session to save private topic monitors, inspect matching evidence, compare equal activity windows and track reviewed/changed listings. Up to twelve monitors persist across browser sessions. No email, background notification or paid service is added. See [Watch Desk engineering notes](docs/WATCH_DESK.md) for usage, resource limits and verification.
