# Development roadmap after the runnable MVP

**v0.9 status:** owner editorial moderation, private research collections, headline
comparisons, permission expiry, discovery-run history and SQLite recovery are now
implemented and tested. Historical phase lists below are planning context; consult
`../COMPLETION_STATUS.md` for the current outstanding work. Strong production identity,
live feed access, persistent semantic clusters, reviewed summaries and commercial
subscriber/email/billing features remain outstanding.

## Phase 1 — completed scaffold

- Homepage, all six topic routes, article detail, pagination, search and sources.
- Persistent SQL schema and migration; deterministic fictional data; source-permission gate.
- Metadata-only GDELT DOC 2.0 adapter, explicit opt-in; Redis/Celery recurring scheduling.
- Docker Compose, local Python test suite and setup instructions.

## Phase 2 — launch readiness

- Editorial dashboard with strong user authentication, permissions and a reviewer change log.
- Verified approved publisher feeds/APIs (one at a time), licence documentation and renewal alerts.
- Monitoring, backups, publisher-specific rate limits and systematic takedown handling.
- Privacy notice, original editorial policy, real contact and security audits.
- Remove `noindex` only when real publicly permitted content replaces demos.

## Phase 3 — differentiated product

- Event clustering by canonical topic, entity and semantic similarity.
- Licensed multi-source summaries with citation trails and human spot checks.
- User-selected countries/languages, notifications and daily email briefings.
- Analytics, SEO, accessibility reviews and original editorial coverage.

## Phase 4 — commercial scale

- Agreements with publishers/newswires for extended use, if justified.
- Subscriber accounts, paid analytical briefs, advertising separation and transparent editorial independence.
- Internationalization, multiregion CDN, database scaling and advanced search.

## v0.2 implemented reader/editorial increment

Combined archive filters, dated source-linked briefings, private withdrawal/source-blocking CLI and database audit records are now available. These do not replace the authenticated editorial web dashboard, event clustering or rights-cleared AI processing planned above. See PROJECT_BLUEPRINT.md for implementation details and acceptance criteria.


## 17 October 2026 update

Entertainment & Culture expansion is integrated with the existing reader/editorial increment. Fourteen sections are now supported. See ../COMPLETION_STATUS.md for current verification and outstanding roadmap work.
