# Current update — GlobalDesk v0.17 — 18 October 2026

News TV now includes every eligible published headline in the selected channel,
removing the API's 12-item cap and UI's five/four-item caps. The headline strip
flashes each item for ten seconds while idle and follows the active story during
playback. The complete rundown scrolls. Illustrated mode is the usable default
until a real presenter video exists. Reduced-motion users receive static text
between changes, without ticker movement.

The previously interrupted OpenAI / D-ID integration is present. Migration 0012
was applied after a verified SQLite backup. OPENAI_API_KEY and DID_API_KEY are
still missing: no external presenter video has been generated or verified.
Server credentials belong in the private environment, never browser code.

All 97 backend tests passed (two upstream deprecation warnings). Production build including TypeScript passed. See the News TV guide for operation.
The outstanding production dependencies listed below still apply; this is not a
claim that the commercial platform or every historical roadmap item is complete.

---

# Current delivery status â€” GlobalDesk v0.16 â€” 18 October 2026

## v0.16 flagship channel redesign

News TV now has its own network masthead, channel navigation, editorial typography,
panoramic illuminated studio, curved anchor desk, shaded original presenter,
story wall, broadcast lower thirds, scrolling headline ticker, programme rundown,
control deck and source-linked editorial panels. Desktop side-by-side and stacked
mobile layouts were inspected in the browser; temporary viewport override reset.
Channel tabs, play/pause and Next headline were verified in the redesigned player.
Production build and TypeScript passed. Existing artificial-presenter, fictional-demo,
source identity and narration-permission disclosures remain visible. This is a visual
upgrade of the local bulletin, not an external live broadcast or photorealistic avatar.
Screenshots: `docs/news-tv-grand-desktop.png` and `docs/news-tv-grand-mobile.png`.

## v0.15 News TV player

Added `/tv` with original animated presenter Nova, finance/research/demo playlists,
source captions, on-device browser narration and silent 10-second demo video export.
Real-source speech needs separately documented source narration permission; existing
metadata approvals do not grant it. Original fictional demos can be narrated with
explicit disclosure. Migration 0011 applied after verified database backup.
91 backend tests and production build passed. Browser checked the demo voice
playback state, animation and caption advancement. Exported-video playback and
audio audibility remain unverified. No external TV stream or photorealistic avatar
provider is connected. See `docs/NEWS_TV.md` for controls and operating limits.

## v0.14 automatic news updates

Public news pages check collected publication revisions every second and refresh
on changes. Added visible cadence, pause/resume, hidden-tab suspension, edit-field
protection and retry backoff. Connected market/innovation services now wait 60
seconds after each local fetch; Celery schedules use the same configurable interval.
Existing publication/permission gates remain enforced. Unconnected sources do not
become live, and upstream second-by-second publication/delivery is not guaranteed.
88 backend tests, production build and browser pause/resume checks passed.
See `docs/LIVE_UPDATES.md` for exact timing and source coverage.

## v0.13 persistent Event Desk

Added private `/events` investigations with stable IDs, evidence timelines,
pairwise headline connections, content fingerprints, evidence-change detection,
draft/reviewed/archived workflows, review audit reasons and optimistic concurrency.
The Intelligence Lab can save selected groups to the desk with your own labels.
Permissions and publication status are rechecked on every read; stale evidence
digests cannot be marked reviewed. No generative AI or semantic accuracy is claimed.

86 backend tests, TypeScript, production build and seven local HTTP integration
checks passed. Database backup verified and migration 0010 applied. Test dossier
and temporary verification session removed. See `docs/EVENT_DESK.md`.
This implements persistent editorial event tracking; semantic clustering,
licensed AI summaries and the other production dependencies remain outstanding.

## v0.12.1 local operations completion

- Added `Run-GlobalDesk.ps1`: verified backup, migrations, idempotent seed,
  production build, API/website readiness checks, feed refresh services, logs,
  occupied-port protection and cleanup of its own child services.
- Added scheduled Innovation Radar and official market metadata jobs to Celery.
  Their existing source-permission checks remain in effect; GDELT stays opt-in.
- 81 backend tests passed, including scheduler/importer integration. Production
  build, TypeScript and launcher startup passed. Two upstream test deprecations remain.
- SQLite backup verified before startup; migrations are current. Docker is absent,
  so container execution and PostgreSQL restoration remain unverified.
- In-app browser automation could not attach; no fresh visual acceptance claimed.
- Source archive now excludes operational logs as well as secrets and databases.
- Eleven live-local HTTP checks passed. Innovation refresh succeeded; SEC and
  Federal Reserve refreshes succeeded. ECB was unavailable on this attempt;
  the page exposes partial refresh failure and preserves previously fetched data.

This closes the interrupted finance release and local startup/refresh integration.
It does not close the entire product roadmap. Remaining local feature development
includes editor-reviewed persistent semantic clusters, reviewed licensed AI
summaries, subscriber entitlements and internationalization. External launch
dependencies below are deferred at the user's request to finish local work first.

## v0.12 Wall Street & Global Exchanges

Added `/markets`, a Wall Street focus, official finance headlines from SEC/Federal
Reserve/ECB, topic/search/region/date filters, 12 exchange gateways, city clocks,
browser favourites and an investor research desk. The homepage and navigation
link directly to the finance section. Source permission gates and withdrawal
protection remain enforced. No prices, trade execution or exchange trading-status
claims are introduced. 80 backend tests and production build passed. Migration
0009 applied after backup. See docs/MARKETS.md for sources and local refresh service.

## v0.11 Innovation Radar

Added real, separately labelled research/official metadata from Crossref and the
GOV.UK science department feed. Eight technology lenses, search/type/region/date
filters, topic evidence, source links, freshness and explicit coverage gaps are
available at `/innovation` and in the homepage preview. The local importer can
refresh every 30 minutes while running. 77 backend tests and production build
passed. No abstracts, article bodies or publisher images are collected.
See docs/INNOVATION_RADAR.md for source policies, limits and refresh commands.
This does not complete comprehensive global newsroom or multilingual coverage.

## v0.10 cover and customer account update

Latest layout revision: removed the cover from the homepage so customers reach
news directly. Founder credit now sits next to the GlobalDesk masthead. Account
forms moved to `/account/access`; build and browser navigation checks passed.

Added an editorial cover featuring Dr. Bhuvan Jakkula, Editor and Founder,
customer support at globalnewsbhuvanjakkula@gmail.com, and working customer sign-up/sign-in
with email, password and mobile. Existing newsroom moved to `/news`. Customer
accounts have salted password hashes, expiring hashed sessions, protected cookies,
origin checks and rate limits. They cannot access owner tools. Owner access is
preserved without payment or password promotional copy.

73 backend tests and the production build passed. Five website account HTTP
checks passed; fixture data was removed. Migration 0007 applied after backup.
See docs/CUSTOMER_ACCOUNTS.md. Email/mobile verification, recovery, production
identity and subscriber billing remain outstanding.

The local implementation is verified. The commercial live-news project is not
fully complete; the outstanding work below remains explicit.

## Completed and verified in v0.9

- Finished comparison and private Research Library verification: bounded selections,
  private notes, fingerprints, permission rechecks, version conflicts and collection limits.
- Added authenticated Editorial Desk with story withdrawal, source blocking and audit history.
- Added optional publisher permission expiry enforced across public and private evidence views.
- Added persistent discovery-run status/results and owner-only job history.
- Added non-overwriting SQLite backup/check/restore and tested recovery round trip.
- Backed up the existing database, applied research and operations migrations, and seeded idempotently.
- 69 backend tests passed, with two upstream deprecation warnings.
- Frontend production build and TypeScript passed using `.next-final` on this OneDrive host.
- 12 localhost HTTP checks passed, including authenticated research/editorial pages.
  The temporary verification session was removed. See `docs/FINAL_HTTP_VERIFICATION.json`.
- Fresh browser visual verification was attempted but the in-app browser failed to attach.
  HTTP checks do not establish visual or accessibility acceptance.

## Outstanding project work

- Hosting account/domain, production HTTPS and deployment destination have not been supplied.
- Live publisher feeds require actual account access and documented permissions. Discovery
  stays disabled and fixtures stay labeled fictional. No publisher permissions were fabricated.
- Docker/PostgreSQL/Redis/Celery execution and PostgreSQL restore remain unverified on this host.
- Production identity integration, real operator contact/policies and independent security review.
- Persistent editor-reviewed semantic event clusters and reviewed, licensed AI summaries.
- Subscriber entitlements, consent-based email delivery/alerts, billing and internationalization.
- External monitoring/renewal notifications, off-device backups and deployment recovery drills.

Owner access remains free. Existing watch/research data is preserved. A source release and
SHA-256 manifest are provided as `GlobalDesk-v0.16-verified-source.zip` and `.zip.sha256`.
See `docs/OPERATIONS.md` and `docs/RESEARCH_LIBRARY.md` for new workflows.

## Historical delivery notes (superseded by the current status above)

### GlobalDesk v0.3 delivery status

## Completed in this update
- Integrated the previously pending entertainment ZIP without overwriting archive filters, daily briefings, moderation or audit migrations.
- Added Entertainment, Movies, Films, Hollywood, Music, Pop, Rock and Arts, original local covers, culture showcase and image credits.
- Parent topic groups compose with existing publisher, language, region and date filters.
- Added regression coverage for grouped archives and blocked sources; updated briefing expectations for all 14 sections.
- Updated source package, seeded local database and started the local API and production website.

## Verification
- 13 backend tests passed; two upstream deprecation warnings.
- Next.js production compilation, TypeScript and generation passed.
- Alembic upgrade head and idempotent seed passed on SQLite: 14 categories, 20 sources, 24 fictional stories.
- 14 HTTP route checks passed: homepage, eight culture routes, combined search, briefings, sources, image credits and a culture story.
- Browser visual/accessibility verification has not been performed.

## Still pending â€” not claimed complete
- Docker is unavailable: PostgreSQL/Redis/Celery deployment and backup restoration remain unverified.
- Live publisher feeds require actual approved access/rights configuration; discovery stays disabled. Stories remain explicitly fictional.
- Hosting account, domain, HTTPS and deployment destination are not configured.
- Authenticated editorial dashboard, publisher permission expiry, ingestion job monitoring, reviewed AI summaries and persistent/editor-reviewed event clustering remain roadmap development.
- Accounts, consent-based email/alerts, subscription billing and internationalization remain roadmap development.
- Real operator identity, editorial contact and production policies must be supplied for launch.

These roadmap capabilities are not implemented by the entertainment ZIP or this integration. The application is a verified local demo, not a completed commercial live-news deployment.


## v0.4 Intelligence Lab increment

Implemented bounded, explainable lexical headline grouping and an evidence workspace with provenance, domain counts, time/section filters and matching details. 19 backend tests and frontend production build passed. Browser verified dashboard, provenance expansion and multiple-domain empty state in a narrow viewport. See docs/INTELLIGENCE_ENGINEERING.md. This is an experimental grouping engine, not validated semantic intelligence or fact verification. Earlier deployment and live-content dependencies remain.


## v0.5 Security & integrity increment

Implemented request guardrails, explicit hosts, cost-aware per-process request budgets, browser nonce policies, generic error responses, restricted container defaults, offline hybrid ML-DSA-65/Ed25519 export receipts and a public Security page. 42 backend tests passed. Frontend/backend dependency audits found no known advisories in their checked trees. Six routes passed nonce/header checks and browser navigation was verified. See SECURITY.md and the JSON evidence in docs/. Container deployment, quantum-safe TLS, production key custody, authentication and independent security review remain pending. This increment does not certify the application or make the entire system post-quantum secure.


## v0.6 Owner access increment

Configured free owner access for bhuvanjakkula@gmail.com. Added trusted-local passwordless link issuance, atomic redemption, hashed expiring links/sessions, origin checks, protected browser cookies, logout/revoke-all, private workspace and Open-Owner.ps1. 48 backend tests and frontend production build passed. End-to-end local sign-in, cookie protections, replay rejection and logout passed. The owner is signed in in the current local browser. No email delivery, mailbox verification, paid service or production remote identity provider was added. See docs/OWNER_ACCESS.md.


## v0.7 Watch Desk increment

Implemented private persistent topic monitors, editable inclusion/exclusion rules, explainable match evidence, equal-window sampled activity comparisons, content-aware review checkpoints and authenticated mutation auditing. Normalized article API timestamps to UTC. Three local starter monitors were created through the browser, with AI demo matches reviewed during verification. 59 backend tests, frontend production build and SQLite migration passed. See docs/WATCH_DESK.md. Existing live-content and production deployment limitations remain.
