# Event Desk — persistent evidence workflow

Open `/events` after owner sign-in. In Intelligence Lab, expand **Track this
coverage over time**, enter your own investigation label and save its evidence.
The Event Desk also accepts 1–12 distinct story identifiers directly.

## Capabilities

- Stable random investigation IDs survive changes to the suggested headline groups.
- A chronological evidence timeline is reloaded through current publication and
  source-permission gates. Withdrawn listings and expired permissions hide content
  and connections on the next request.
- SHA-256 fingerprints detect changes in title, description, source, URL, section,
  language, country, date or fictional-demo status relative to the saved baseline.
- Pairwise connections expose shared terms, Jaccard headline overlap, publisher
  domain relationship and publication time distance. At most 66 edges per dossier.
- Human review has draft, reviewed and archived states. Changed or unavailable
  evidence flags a reviewed dossier for another review. Editing resets it to draft.
- A digest of the evidence displayed on the page prevents reviewing a stale view.
  Optimistic revision checks reject concurrent edits and duplicate review requests.
- Review reasons and save decisions enter the existing audit log.

## Boundaries

Connections are lexical diagnostics, not semantic inference, contradiction
detection, independent corroboration or fact verification. Different publisher
domains need not be independently owned. A review is an editor's recorded action,
not a claim that a report is true. Demo evidence remains explicitly fictional.

The desk is private to the configured owner. It does not publish dossiers or send
notifications. It saves identifiers, fingerprints and your own labels/notes; it
does not retain publisher article snapshots. Only 30 dossiers per owner, including
archived investigations, are allowed; a database uniqueness constraint protects
allocation under concurrent requests. Capacity cannot be recovered through deletion
in this version. Audit history displays the latest 50 matching records.

## API and operations

- `GET /api/v1/owner/events`
- `POST /api/v1/owner/events/save`
- `POST /api/v1/owner/events/review`

All endpoints require the existing owner session. Mutations enforce trusted browser
origins, strict input validation and bounded evidence selections. Browser actions
use the existing HttpOnly-cookie server proxy; tokens are not exposed to JavaScript.
Migration `0010_tracked_events` creates the dossier table. Back up before migration.
`Run-GlobalDesk.ps1` performs backup/migration and runs the new release locally.

## Validation — 18 October 2026

- 86 backend regression tests passed, including five Event Desk tests covering
  auth/origin validation, version conflicts, content drift, withdrawals, source
  permission expiry, capacity and owner scoping.
- Production build, TypeScript and database migration passed.
- Seven live-local HTTP checks passed; see `EVENT_DESK_HTTP_VERIFICATION.json`.
- Browser automation could not attach in this session; no visual acceptance claimed.
