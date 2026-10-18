# Current verification — v0.16, 18 October 2026

- Production build and TypeScript passed after the channel redesign.
- Browser inspected 1440px desktop layout and default narrow mobile layout.
- Channel tabs, play/pause and headline advancement verified; viewport override reset.
- Screenshots saved as `docs/news-tv-grand-desktop.png` and `docs/news-tv-grand-mobile.png`.
- This update changes presentation and player navigation; no new backend logic.

## Earlier v0.15 verification

- 91 backend tests passed, including three bulletin/narration-permission tests.
- Production build and TypeScript passed; launcher applied migration 0011 after backup.
- Browser inspected studio, demo selection, synthetic-voice playing state and
  automatic caption advancement. Audio audibility and video-file playback unverified.
- TV API HTTP checks are recorded in `docs/TV_HTTP_VERIFICATION.json`.

## Earlier v0.14 verification

- 88 backend tests passed; production build and TypeScript passed.
- Revision tests cover the one-second cache and permission/withdrawal changes.
- Browser verified Checking every second, Pause and Resume on market news.
- Screenshot saved as `docs/live-updates-preview.png`.
- New local launcher instance uses 60-second post-fetch refresh intervals.
- Twelve live-local HTTP checks passed, including the website update proxy.
  Latest finance and innovation refreshes both completed successfully.
- Source publication timing and upstream availability still limit delivery latency.

## Earlier v0.13 verification

- 86 backend tests passed with two upstream deprecation warnings.
- Five new Event Desk tests cover permissions, evidence drift, stale decisions,
  concurrent versions, owner isolation, capacity and review auditing.
- Production build and TypeScript passed in `.next-events`, then the local
  launcher rebuilt `.next-local-release` and started the updated website/API.
- Database backup verified; migration 0010 applied successfully.
- Seven additional local HTTP checks passed through the website owner proxy;
  QA dossier and session removed. See `docs/EVENT_DESK_HTTP_VERIFICATION.json`.
- Browser visual acceptance remains unverified; Docker is unavailable.

## Earlier v0.12.1 verification

- 81 backend tests passed with two upstream deprecation warnings. Command:
  `python -m pytest -q -p no:cacheprovider --basetemp=.test-tmp-oct18-final`.
- Production build and TypeScript passed using `.next-local-release`.
- Complete local launcher syntax, backup, migrations, seeding and API/website
  readiness passed. Launcher owns the running service processes.
- Scheduler regression verifies both 30-minute jobs invoke the existing importers.
- Browser webview attach timed out. HTTP checks do not prove visual acceptance.
- Docker is unavailable; Celery/Redis/PostgreSQL integration was not executed.
- See `docs/LOCAL_RELEASE_HTTP_VERIFICATION.json` for the latest read-only checks.
- Eleven HTTP checks passed: eight website pages, health and both metadata APIs.
  Finance returned 46 stored headlines; SEC and Federal Reserve refreshed 25 and
  20 records. ECB refresh failed with ConnectError, so finance correctly reports
  partial failure and keeps existing records. Innovation refreshed successfully
  across all nine requests and returned 78 stored signals. Counts are a snapshot.

## Earlier v0.12 verification

- 80 backend tests passed; production build and TypeScript passed for `.next-markets`.
- Migration 0009 applied after verified backup; live finance feeds fetched successfully.
- Finance page, exchange clocks/favourites, filters and official-source links checked locally.
- See docs/MARKETS.md for finance data coverage and operational limits.

## Earlier v0.11 verification

- 77 backend tests passed; four Radar tests passed again after narrowing ambiguous keywords.
- Production build and TypeScript passed for `.next-radar-final`.
- Migration 0008 applied after a verified backup. Real metadata fetch succeeded.
- Six final HTTP route checks passed; see `docs/INNOVATION_HTTP_VERIFICATION.json`.
- Browser checked topic filtering and expanded provenance on the live Innovation Radar.
- Local refresh service is running on a 30-minute interval while its process remains active.
- Coverage is international research metadata plus a UK official source, not comprehensive global news.

## Earlier v0.9 verification

- Backend: 69 passed; two upstream deprecation warnings. Command:
  `python -m pytest -q -p no:cacheprovider --basetemp=.test-tmp-final`.
- Frontend: production build, TypeScript and page generation passed with `NEXT_BUILD_DIR=.next-final`.
- Database: verified backup before migration; upgrades 0005 and 0006 applied;
  idempotent seed passed; current revision `0006_operations`.
- Recovery: automated SQLite backup/restore round trip preserves saved data and refuses overwrites.
- HTTP: 12 checks passed against localhost API 8010 and production frontend 3010,
  including authenticated research/editorial pages. Temporary session removed.
  Evidence: `docs/FINAL_HTTP_VERIFICATION.json`.
- Visual QA: browser attach timed out; no new visual/accessibility sign-off claimed.
- Docker/PostgreSQL/Redis/Celery deployment and production recovery remain unverified.

See COMPLETION_STATUS.md for remaining project work and docs/OPERATIONS.md for workflows.
