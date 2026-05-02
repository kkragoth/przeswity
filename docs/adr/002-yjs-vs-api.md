# ADR 002: Yjs vs REST API as Source of Truth

- Status: Accepted
- Date: 2026-05-02

## Context

The editor deals with two distinct classes of data:

1. **In-document collaborative state** — document text, meta fields (title,
   subtitle, target word count, header/footer content), and glossary entries.
   Multiple peers edit this simultaneously in real time.

2. **Server resources** — book record, user profiles, role assignments,
   workflow stage. These are changed by deliberate user actions and persisted
   on the server; they do not change mid-session without a user intent.

Several design options were considered for in-document state:

- Store everything in the REST API and poll/invalidate via react-query.
  Introduces round-trips on every keystroke and makes conflict resolution the
  server's problem.
- Use a hybrid: write to the API on save and separately sync via Yjs.
  Creates double-write bugs and consistency races.
- Use Yjs exclusively for in-document state, REST API for everything else.

## Decision

**Y.Doc is the source of truth for in-document collaborative state.**
Text lives in the default ProseMirror fragment managed by the Tiptap
Collaboration extension. Meta fields live in `doc.getMap('meta')`.
Glossary entries live in `doc.getMap('glossary')`.

React mirrors Yjs state through observer hooks:

    @/editor/meta/useDocumentMeta(doc)
    @/editor/glossary/useGlossaryEntries(doc)

Writes go through pure ops modules:

    @/editor/meta/metaOps       setMetaField(map, key, value)
    @/editor/glossary/glossaryOps   addEntry / updateEntry / deleteEntry

**The REST API (via react-query) is the source of truth for server resources.**
Book metadata (title, stage, assignments) and user/role data are fetched and
mutated exclusively through API calls. The editor receives these as props or
query results; it never writes them to the Y.Doc.

## Consequences

**Positive:**
- Clear ownership boundary. No double-write or consistency races between Yjs
  and the API.
- In-document edits are conflict-free by CRDT semantics; no server round-trip
  per keystroke.
- react-query handles caching, background refresh, and optimistic updates for
  server resources without any Yjs involvement.

**Negative / Trade-offs:**
- Y.Doc state is not directly queryable from the server side without decoding
  the Yjs binary. We accept this; the server can read document content via the
  Hocuspocus persistence hook at save time.
- Session-level Y.Doc state is not available before the Hocuspocus WebSocket
  syncs. The `useEditorBootstrap` / `useInitialSync` gates rendering until
  sync completes, which adds initial load latency on slow connections.
