# Comparison and Research Library

Select two to four different stories using Compare controls on story cards, then
open `/compare`. The public comparison shows publisher domains, regions,
languages, sections, timing and pairwise headline-term overlap. Shared terms do
not establish agreement, contradiction, independence or factual correctness.

An authenticated owner can save a collection with a name and up to 1,000
characters of private notes, then revisit `/research`. Collections store story
identifiers and fingerprints rather than snapshots of publisher metadata.
Every read rechecks publication status and source permissions, including expiry.
Withdrawn or blocked stories are hidden and counted as unavailable. Changed
metadata is flagged against the saved baseline. Editing refreshes that baseline.

The library supports at most 20 collections per owner. Updates and removals
require the current version, so stale tabs cannot silently overwrite a newer
save. All successful changes write audit records. Origin checks and existing
hashed, expiring owner sessions protect mutations. Neither notes nor collection
records are exposed by the public API. Apply migration `0005_research` or later.

Regression tests cover order, selection validation, authentication, origins,
capacity/reuse, optimistic concurrency, changed metadata and withdrawn content.
