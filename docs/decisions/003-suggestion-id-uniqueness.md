# ADR 003 — suggestionId uniqueness model

## Decision

`suggestionId` values are generated client-side via `makeId()` (crypto-random UUIDv4 or equivalent). Two adjacent edits by the same author are merged into one suggestion entry only when they share the **same transaction** (single ProseMirror `appendTransaction` call), never by wall-clock proximity or spatial adjacency.

## Context

Two correctness risks were identified:

1. **Collision** — if IDs are short/random without session entropy, two independent edits across clients might share an ID and merge into one wrong suggestion card.
2. **False pairing** — if pairing is spatial ("ranges touch"), a coincidental deletion near an unrelated insertion appears as a "Replace" when they are independent changes.

## Rejected alternatives

- **Short random IDs (6 chars)** — collision probability is low but non-zero in a multi-user session over a long editing session. Rejected in favour of full UUID.
- **Spatial pairing (ranges touch)** — too broad; merges unrelated changes near each other. Rejected; the current implementation pairs only within a single transaction (same `appendTransaction` batch).
- **Server-assigned IDs** — would require a round-trip before the suggestion mark appears in the doc. Rejected for latency reasons; the frontend generates the ID and the backend stores it on first sync.

## Consequence

Two separate keystrokes by the same author **can** produce two suggestion entries if they land in different transactions. This is intentional: it preserves granularity and allows independent accept/reject per keystroke batch. Consecutive typing collapses into one entry via the neighboring-mark reuse in `attrsForAuthoredMark`.
