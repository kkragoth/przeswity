# Y.Doc shape & collaboration

Single source of truth for the shape of a book's `Y.Doc` and the rules for
mutating it. Pair with `docs/intro.md` §2.3 for the conceptual primer.

---

## Y.Doc top-level keys

A book is one `Y.Doc` named `book:<bookId>` on the wire. It contains the
following top-level types:

| Key                  | Type                          | Owner                                          | Notes |
|----------------------|-------------------------------|------------------------------------------------|-------|
| `default`            | `Y.XmlFragment`               | Tiptap (`@tiptap/extension-collaboration`)     | The ProseMirror document. Don't touch directly — go through Tiptap commands. |
| `comments`           | `Y.Map<CommentThread>`        | `editor/comments/threadOps.ts`                 | Plain JS objects (not nested Y types). |
| `glossary`           | `Y.Map<StoredEntry>`          | `containers/editor/glossary/hooks/useGlossary.ts` + glossary ops | Sorted client-side by term. |
| `meta`               | `Y.Map<unknown>`              | many readers; writers in `MetaPanel` and `useHeaderFooterSync` | See "meta keys" below. |
| `suggestionReplies`  | `Y.Map<SuggestionReply>`      | `editor/suggestions/suggestionReplyOps.ts`     | Replies to track-change suggestions. |
| `__settings__`       | `Y.Map<boolean>`              | `frontend/src/containers/editor/suggestions/hooks/useSuggestingMode.ts` | Per-doc settings; only key today is `suggestingMode`. |

> **Don't add top-level keys ad-hoc.** Update this table when you do.

The `'default'` fragment name is exported as `PROSEMIRROR_FIELD` from
`@przeswity/editor-schema`. Both Tiptap clients and the server-side
schema-aware code reference it by this constant.

---

## meta keys (Y.Map<unknown>)

`meta` is a flat namespace shared by document-level metadata.

| Key            | Type     | Written by                            | Read by                                |
|----------------|----------|---------------------------------------|----------------------------------------|
| `title`        | string   | `MetaPanel`                           | `MetaPanel`, DOCX export               |
| `isbn`         | string   | `MetaPanel`                           | `MetaPanel`                            |
| `targetWords`  | number   | `MetaPanel`                           | `useTargetWords`, status bar           |
| `deadline`     | string   | `MetaPanel`                           | `MetaPanel`                            |
| `notes`        | string   | `MetaPanel`                           | `MetaPanel`                            |
| `headerLeft`   | string   | `useHeaderFooterSync.applyHeaderFooter` | `useHeaderFooterSync` (PaginationPlus) |
| `headerRight`  | string   | same                                  | same                                   |
| `footerLeft`   | string   | same                                  | same                                   |
| `footerRight`  | string   | same (default `'{page}'`)             | same                                   |

> Empty/null values **delete** the key (see `MetaPanel.set()`); UIs should
> treat absence as "unset", not as `''`.

---

## Y.Map shapes (TypeScript)

### `comments` — `Y.Map<CommentThread>`

Keyed by `thread.id` (uuid). See `editor/comments/types.ts`:

```ts
interface CommentThread {
  id: string
  authorId: string
  authorName: string
  authorRole: Role
  authorColor?: string
  targetRole: Role | null      // mention narrowed to a role
  body: string
  originalQuote: string         // first quoted span when thread was created
  createdAt: number             // ms epoch
  edited?: number
  status: CommentStatus         // 'open' | 'resolved' | 'orphan'
  resolvedBy?: string
  resolvedAt?: number
  reactions?: Record<string /* emoji */, string[] /* userIds */>
  replies: CommentReply[]
  orphan?: { orphanedAt: number; lastKnownQuote: string; lastKnownAuthorId: string }
}
```

**Anchor model**: comments anchor to text via the `comment` ProseMirror mark
(see `editor/comments/CommentMark.ts`). The mark's `data-comment-id` matches
`thread.id`. When the mark is fully deleted by an edit, the thread becomes
**orphan** — the watcher in `editor/comments/commentOrphanWatcher.ts`
notices and sets `status='orphan'` plus `orphan.lastKnownQuote`.

> **Reactions / replies are nested plain arrays/objects, NOT nested Y types.**
> This is a deliberate Stage-1 trade-off: simpler ops, lower CRDT overhead.
> Cost: concurrent reaction/reply edits on the same thread can lose each
> other (last writer wins on the parent thread set). If/when this matters,
> migrate `reactions` and `replies` to `Y.Map` / `Y.Array` siblings keyed by
> thread id.

### `glossary` — `Y.Map<StoredEntry>`

Keyed by `entry.id` (uuid):

```ts
interface StoredEntry {
  id: string
  term: string
  translation: string
  notes?: string
  updatedAt: number
}
```

Glossary highlights are decoration-only (no marks in the doc), so deleting
a glossary entry repaints without touching the document.

### `suggestionReplies` — `Y.Map<SuggestionReply>`

See `editor/suggestions/suggestionReplyTypes.ts`. Keyed by reply id; each
reply carries a `targetSuggestionId` linking back to the
`insertion`/`deletion` mark whose attribute carries the suggestion id.

---

## Mutation rules

1. **Never mutate from a React component body.** Always go through a pure
   op module (`threadOps`, `glossaryOps`, `suggestionReplyOps`, `metaOps`)
   so extension code, slash commands, and the UI share one mutation path.
2. **Wrap multi-step writes in `Y.transact(doc, () => …)`.** Otherwise each
   `.set()` is broadcast separately. The op modules already do this.
3. **Don't read inside `.observe()` callbacks.** Yjs may fire mid-transaction;
   read the latest snapshot once at the top of your handler.
4. **Treat values as plain JSON.** No Date instances, no Maps, no class
   instances — they don't cross the wire. Numbers for timestamps.
5. **Origin tagging.** When you need to suppress your own observers, pass a
   distinctive origin to `Y.transact(doc, fn, origin)` and check
   `event.transaction.origin` in the observer.

---

## Awareness (peer cursors, presence)

Awareness is `provider.awareness`, an in-memory CRDT separate from the doc.
We write the user identity at connect time:

```ts
provider.awareness.setLocalStateField('user', {
  id, name, color, role, …
});
```

The Tiptap collaboration-cursor plugin reads each peer's `user` field.
`editor/collab/peerCursor.ts` builds the cursor + selection decorations.

> **Awareness is ephemeral.** Don't put anything in it that needs to
> survive a reconnect. We currently only put user identity, the suggesting
> flag (so peers can render a suggesting badge), and the selection.

---

## Sync status

`getProviderSyncStatus(provider)` in `editor/collab/syncStatus.ts` is the
single access point for Hocuspocus runtime fields. It returns a `SyncStatus`
enum (`Online | Connecting | Offline`). UI consumes the enum, never the raw
provider fields — those have changed shape between hocuspocus versions.

---

## Server-side persistence

| Table             | Stores                                   |
|-------------------|------------------------------------------|
| `book_yjs_state`  | Latest authoritative Y state (one row per book) |
| `book_snapshot`   | Labelled snapshots — full state copies   |

The Hocuspocus persistence extension (`backend/src/collab/persistence.ts`)
loads the row on connect, applies the binary state to the server's Y.Doc,
and writes back on debounced `onStoreDocument`. Updates are merged — we do
not currently retain an append-only update log.

> **No IndexedDB on the client.** See the comment at the top of
> `editor/collab/yDoc.ts`. Re-enabling requires an explicit "first-revision
> handshake" so stale local state can't push obsolete content back to the
> server.

---

## Stage-1 limitations

- **Single backend process** for the WS layer. Awareness and the doc store
  are both process-local. Multi-process needs `@hocuspocus/extension-redis`.
- **Suggest-only roles trust the client.** Anyone with WS access can write
  to `'default'`. Server-side validation that rejects edits not wrapped in
  `insertion`/`deletion` marks is a Stage-2 deliverable.
- **Comments projection is one-way.** `db/projections.ts` materializes
  `comment_thread`/`comment_message` from Yjs for list queries. The Yjs
  store is authoritative; the SQL rows can lag briefly during high write
  rates.

---

## Adding a new top-level Y type — checklist

1. Pick a stable string key. Add a row to "Y.Doc top-level keys" above.
2. Define the value shape in TypeScript. If you're storing complex nested
   collaborative data, prefer nested `Y.Map`/`Y.Array` over plain JS — see
   the comments-reactions trade-off above.
3. Write a pure ops module under `editor/<feature>/<feature>Ops.ts` that
   exposes `getX(doc)` plus all writers. Wrap multi-step writes in
   `Y.transact`.
4. Write a hook under the same feature folder that subscribes via
   `.observe()` and renders a snapshot.
5. If it's part of the document export (DOCX/Markdown), wire it into
   `editor/io/`.
6. If it's projected to SQL, add a projection in `backend/src/db/projections.ts`.
