# Innovation Radar — v0.11

`/innovation` provides source-linked discovery across artificial intelligence,
quantum, semiconductors, robotics, climate/energy, space, biotechnology and
cybersecurity. The homepage has a real-metadata preview above the fictional
newsroom examples. The founder masthead and direct news access are retained.

## Real metadata sources

- Crossref's public REST API: titles, DOI links, publisher labels and publication
  dates. Crossref states that almost none of this metadata is subject to copyright
  and it can be used for any purpose, while abstracts can have publisher/author
  copyright. No abstracts are collected.
  https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- GOV.UK news Atom feed, filtered to the Department for Science, Innovation and
  Technology. Original government news URLs, titles and source dates only.
  Contains public sector information licensed under the Open Government Licence
  v3.0. No government logos, third-party images or article bodies are copied.
  https://www.gov.uk/help/reuse-govuk-content
  https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/

Source reuse documentation was inspected on 17 October 2026. The importer adds
only these two named metadata sources with documented scopes and audit records.
It never replaces existing source blocks, expiry or pending review decisions.
Every public read applies the same publication/permission-expiry gate as the
newsroom. Signals are stored separately from fictional articles.

## Reader features

- Topic chips with counts for the selected time window; counts can overlap.
- Headline search, research/official filters, source region and 7/30/90-day windows.
- Original links, source attribution, retrieval time and expandable keyword evidence.
- Explicit distinctions between research records and official announcements.
- Retrieval freshness and last-run status, bounded sample/display counts and a
  coverage section identifying missing regions and language coverage.

No headline match establishes a breakthrough, truth, peer-review quality or
source independence. Ambiguous standalone terms such as “space” and “climate”
are excluded so public-space and emotional-climate research are not mislabeled.
Regions describe issuing sources, not the location of research or reported events.
Crossref research locations remain unspecified. Research dates are publication
dates; announcements may use the source's update date when no publication date
is present. Future dates and incomplete research dates are excluded.

## Refresh and limits

From `backend/` after migration `0008_innovation`:

```powershell
python -m app.innovation_ingest          # one explicit refresh
python -m app.innovation_ingest --watch  # local service, every 30 minutes
```

Alternatively `./Start-GlobalDesk.ps1 -Service Innovation`. Keep this service and
the API/site running for ongoing local updates; it is not an OS-installed service.
Only run one importer. First startup waits if a refresh just finished. Scheduled
refresh persistence across machine restarts and distributed locking remain future
operational work. The importer does not change the disabled GDELT setting.

Each cycle fetches one official feed and eight bounded Crossref queries, with a
one-second delay between research requests, 25-second timeouts, no redirects and
a 2 MB decompressed response limit. XML declarations/entities are rejected.
Signals deduplicate by source URL hash and updates do not republish withdrawn rows.
The API analyses at most 500 stored records and displays up to 60. Crossref searches
sample up to 12 records per query over 90 days; headline filters may exclude more.
These counts are sample sizes, not global publishing totals or trend estimates.
Refresh results use private ingestion history with radar-prefixed identifiers.

Initial fetch stored 85 unique research records and eight official announcement
records before tighter topic filtering; current visible totals depend on dates
and classification. Data is not included in the source ZIP; run the importer.

## Verification

77 backend tests passed, including safe feed parsing, malformed/future/incomplete
records, title cleanup, word boundaries, duplicate updates, filters and permission
expiry. Four Radar tests passed again after tightening classification. Production
build/TypeScript passed. The local database was backed up before migration.
Browser checks cover the new page and filtering/provenance; see accompanying preview.

This is international research discovery plus a UK official feed. Further permitted
regional newsroom sources and multilingual classification are needed for broad
global news coverage; the interface does not claim comprehensive worldwide news.
