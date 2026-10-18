# Watch Desk — v0.7 engineering and usage

Updated 17 October 2026.

## New reader workflow

Open `/watchdesk` while signed in through the existing free owner access. Up to 12 private monitors persist in the database. Create a monitor from a starter or choose a name, up to eight phrases, up to five excluded phrases, any/all matching, an optional exact section and a 1/3/7/30-day window. Edit and remove controls are available on every monitor.

The current local owner workspace includes three starter monitors created and verified through the website: AI & cybersecurity, Business & markets, and Music & culture. The AI monitor's two fictional matches were marked reviewed during browser verification. These local preferences are not automatically seeded into other installations.

## Innovations delivered

1. **Explainable matching:** each listing shows the matched phrase and whether it appeared in the headline, description or both. Complete normalized word sequences avoid substring collisions such as `AI` matching `said`. Unicode NFKC and case-folding normalize text; this remains lexical matching, not semantic language understanding.
2. **Content-aware review checkpoints:** reviewing a monitor stores a fingerprint for each currently sampled matching listing. Newly arriving matching articles and altered title/description/source attribution/category/location/language/publication metadata return to the unreviewed queue. This is content-change detection, not a cryptographic publication attestation or evidence that the change is important. Editing monitor criteria resets that monitor's checkpoints.
3. **Comparable activity windows:** current and previous equal-duration windows compare publication-time counts with a visible source-domain count and demo count. A zero baseline is labeled first observed, rather than an infinite percentage increase. Incomplete samples suppress percentage changes and label their trend incomplete.
4. **Private persistent workflows:** existing authenticated owner sessions protect every report and mutation. Owner identity comes from the validated server session, never the request payload. Origin checks, bounded bodies, existing host policies and request budgets remain in force. Changes are recorded in the operator audit log.
5. **Consistent UTC timestamps:** article API serialization now explicitly normalizes naive SQLite dates to UTC, avoiding browser/server timezone reinterpretation. Stored timestamps are not rewritten.

## Resource boundaries

The report reads the latest 600 permitted published listings within twice the largest configured lookback; it fetches a 601st row to detect truncation. Each monitor then applies its own current/previous windows. This cap can bias observed counts, so the page states sample limits and suppresses truncated percentage trends. All phrase evaluation occurs on this sample; it is not a full-text search over the entire archive.

A monitor previews up to eight matching current-window listings. The review button covers **all currently sampled matching listings**, including those beyond the preview, and says so explicitly. A later arrival remains unreviewed even if its publication time is old, because review checkpoints are per article and content fingerprint, not a simple timestamp watermark.

Review lookups are restricted to monitored IDs and article IDs in the current sample. A database uniqueness constraint gives each owner at most 12 monitor slots, even when creation races. PostgreSQL mutation queries request row locks; SQLite does not provide equivalent row-level locking. Concurrent insert conflicts return a retryable 409 rather than exceeding the monitor cap. This is not a collaborative editing system: configuration version conflicts and multiple-tab edits need further work before multiple human editors share an identity.

Report and review requests each cost ten existing request-budget units. Monitors are computed on page load/refresh. There is no background alert worker, email delivery, SMS, external API/model call, notification permission or paid service.

## Publication and authentication boundaries

Every report and review action checks current source permissions and article status before evaluating matches. Blocked, pending, withdrawn and future-dated records do not appear. Review records can persist when content is hidden but do not make it visible. An expired or missing owner session cannot read reports or mutate monitors. The website only proxies three fixed watch actions; it cannot act as an arbitrary authenticated API proxy.

New POST routes: `/api/v1/owner/watch/save`, `/remove`, `/review`. Existing JSON body bounds are 4 KiB. The report route is `GET /api/v1/owner/watch/report`. The public news routes remain read-only. Website actions use protected owner cookies and explicit-origin checks; API sessions are not returned to browser JavaScript.

All monitor matching uses fields already permitted for public display. Source-domain counts do not establish independent ownership, corroboration or factual accuracy. Fictional fixtures remain labeled. No generated news summaries or model-based factual confidence claims are introduced.

## Verification

- 59 backend tests passed, including word/phrase boundaries, Unicode normalization, exclusions, any/all rules, equal windows, zero baseline, truncation labels, changed-story checkpoints, source blocks, ownership isolation, input validation, monitor limits, review cleanup and a real 605-record database truncation test.
- Frontend TypeScript and production build passed.
- SQLite migration `0004_watch_desk` applied successfully.
- Browser verification in a narrow viewport: owner session retained, all three starters saved through the form, matching explanations visible, review action persisted and disabled when fully reviewed.
- Existing security and PQC signature regression tests remain passing. No dependencies were added in this increment; previous dependency advisory reports remain point-in-time evidence from v0.5.

## Remaining limitations

Grouping and monitoring are experimental lexical tools, not editorial judgments or fact verification. Percentage changes reflect the selected sample and publication timestamps, which can differ from actual discovery time. The UI does not infer causes or forecast future events. There is no delivery guarantee, live-news integration, cross-language semantic matching or automatic monitoring while the application is closed. Production PostgreSQL/Redis/container deployment, independent audits and quantum-safe transport remain pending.

End-to-end HTTP checks also passed private-page protection, create, review, edit, remove, foreign-origin rejection and fixed-action proxy enforcement using a temporary verification monitor. Existing starter monitors were retained. See WATCH_DESK_VERIFICATION.json.
