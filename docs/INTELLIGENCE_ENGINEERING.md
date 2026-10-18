# Intelligence Lab — engineering notes

Implemented 17 October 2026, v0.4.

## What it does

`GET /api/v1/intelligence/events` groups permitted published headlines and returns inspectable member listings, shared terms, minimum pairwise similarity, domain counts, countries and timestamps. `/intelligence` provides the reader workspace. Filter by exact category, lookback (1–720 hours) and minimum domain count (1–20). No paid API, external model or new library is required.

## Matching algorithm

NFKC normalization and Unicode word tokenization precede English stop-word removal. Per-sample TF-IDF vectors use logarithmic term frequency, smoothed inverse document frequency and cosine similarity. A deterministic newest-first complete-link assignment requires **every member pair** to share at least three terms and score at least 0.42. Matching is constrained to the same category and language with a maximum 72-hour group span. The algorithm selects the eligible group with the greatest minimum match score.

Complete-link avoids transitive chaining: A similar to B and B similar to C does not automatically group A with C. This is a conservative lexical heuristic, not semantic event understanding. It can miss paraphrases and can merge unrelated reports sharing distinctive words. Negation, entity disambiguation and multilingual semantics are not resolved. The threshold is an initial engineering setting, not a calibrated probability.

## Resource and publication boundaries

The query loads at most 301 rows to detect truncation, analyzes the latest 300 and marks truncated reports. Pair comparison is quadratic in the worst case; the strict sample cap bounds each request. There is no background task, shared cache or persisted grouping state. Production deployments still need rate limits, concurrency/load testing and precomputed grouping for larger datasets. Group identifiers hash sorted membership, so they change when membership changes. Scores and assignments may change when the sample changes.

Source approval and publication predicates run before analysis; pending, blocked, withdrawn and future-dated records are excluded. The new API adds no mutation endpoint. Source counts deduplicate publisher domains; this does not establish independent ownership or independent reporting. All existing fictional labels remain visible.

## Verification and evaluation

- 19 backend tests passed, covering related/unrelated grouping, deterministic order, time/language/category boundaries, chaining, repeated domains, empty inputs, API validation and publication exclusion.
- Frontend production build and TypeScript passed.
- Browser checked at a narrow viewport: dashboard, provenance expansion and multiple-publisher empty state. Desktop and exhaustive accessibility audits remain pending.
- Synthetic eight-headline fixture recovered its three expected pairs without extra pairs. This tiny designed fixture is a smoke test, not evidence of real-news accuracy.
- Five local 300-singleton engine runs: 61–89 ms. Excludes database, network, rendering and concurrent traffic. See INTELLIGENCE_EVALUATION.json.
- Reproduce: from backend, run `.venv/Scripts/python.exe -m app.evaluate_intelligence`.

## Next engineering gates

Use a labeled, rights-cleared news corpus for precision/recall by language and section; evaluate conflicting/negated headlines and syndicated coverage. Add editor split/merge decisions and durable provenance before production automation. Add source ownership mapping before making independence claims. Benchmark PostgreSQL queries, concurrent API load and permission revocation under caching before increasing the sample cap. AI generation remains unimplemented and requires separate permitted inputs and review.
