# Live updates — v0.14

Public news pages check `/api/updates` every second while visible. The website
proxy reads a lightweight publication revision from the API, covering all
permitted published news, innovation and market records and completed ingestion
runs. Source withdrawal and permission expiry affect visibility. A one-second
in-process cache shares aggregate work between clients. Polling never contacts
publishers directly.

When the revision changes, the current page refreshes automatically with its
filters. Focused inputs defer refresh until editing finishes. Hidden tabs stop
polling; Pause stops checks. Failed connections back off up to 30 seconds.
Private event/account/research/editing screens are excluded to preserve work.

Connected finance (SEC, Federal Reserve, ECB) and innovation (GOV.UK, Crossref)
importers now default to 60 seconds after each local fetch finishes, replacing
30 minutes. `FEED_REFRESH_SECONDS` configures this interval, clamped to 60–86400.
Fetch duration adds to this delay. Run one refresh service per feed/database;
choose the local services or Docker's scheduler. Celery schedules both at the
configured interval and expires queued jobs after one interval. Docker execution
remains unverified here.

This is per-second checking of collected updates, not a promise of a new story or
end-to-end delivery every second. Publication, network, fetch and rendering delays
remain. Unconnected providers do not become live. GDELT remains disabled pending
configured access/permissions. Fictional seed news is never relabelled live.
True per-second upstream delivery needs a streaming integration for each provider.

The endpoint returns opaque revisions/timing, without private dossier or owner
data. Aggregates detect supported ingestion/moderation workflows; arbitrary direct
database content edits that leave markers unchanged need manual page refresh.
Existing API request budgets remain enforced, giving this local polling design
finite client capacity.

## Verification — 18 October 2026

88 backend tests and production build/TypeScript passed. Tests cover cached
revisions, withdrawal and permission invalidation. Browser verified **Checking
every second**, Pause and Resume. Screenshot: `live-updates-preview.png`.
