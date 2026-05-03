# ADR 006: book_yjs_state size tracking & future compression

## Status
Accepted (2026-05-03). Tracking-only first; compression deferred.

## Context
`book_yjs_state` stores a single `bytea` per book — the latest Yjs document update. It
has no compression, no rotation, and no historical record. Two concerns:

- A pathological collaboration session (huge paste, many concurrent updates, AI ingest)
  can grow the row to GBs. Postgres `bytea` is uncapped and a single oversized row
  inflates the heap, slows backups, and chokes any list endpoint that reads it.
- The PK on `(book_id)` precludes future branches/snapshots — we only ever have one
  state row per book. Snapshots live in `book_snapshot` (immutable history) but cross-
  book branching is not on the roadmap.

## Decision
- **Now:** add `size_bytes integer NOT NULL DEFAULT 0` and update it on every write
  (via `persistence.store()`). Log a structured warning when a single write exceeds
  5 MB. Migration `0004_book_yjs_size_and_indexes.sql` backfills existing rows.
- **Later (deferred):** introduce LZ4 compression at the storage layer (`bytea_lz4`
  helper or external `pg_lz4` extension) once a real book demonstrably exceeds the
  threshold. Yjs updates compress well (often 4–10×) because they share common
  structural prefixes.
- **Never (out of scope):** branching off `book_yjs_state`. If branching becomes a
  product requirement, model it as N rows with a synthetic PK and a `branch_id`
  column — do not retrofit the bytea.

## Consequences
- One extra column read on every snapshot list / page load. Negligible at typical sizes.
- Compression is deliberately not done as part of this refactor: the threshold for
  pulling that lever should be data-driven (a real book over 5 MB), not speculative.
- The `WARN` log lets us catch the first occurrence in production without polling.
