# Architecture

System architecture for the Prześwity editor. Read `docs/intro.md` first if
you haven't — this doc assumes you know what Tiptap, Yjs, and Hocuspocus are.

```
┌──────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                  │
│                                                                       │
│   ┌────────────────────┐      ┌─────────────────────────────────┐    │
│   │  TanStack Router   │ ───► │  containers/editor/  (REACT)    │    │
│   └────────────────────┘      │   - layouts, panels             │    │
│                               │   - session/live/pane stores    │    │
│                               │   - hooks bridging Yjs ↔ React  │    │
│                               └────────────┬────────────────────┘    │
│                                            │                          │
│                               ┌────────────▼────────────────────┐    │
│                               │  editor/  (DOMAIN, NO REACT)    │    │
│                               │   - Y.Doc ops, ADTs, format     │    │
│                               │   - DOCX/Markdown export        │    │
│                               └────────────┬────────────────────┘    │
│                                            │                          │
│                               ┌────────────▼────────────────────┐    │
│                               │  editor/tiptap/  (PROSEMIRROR)  │    │
│                               │   - extensions, slash, toolbar  │    │
│                               └────────────┬────────────────────┘    │
│                                            │                          │
│                                  ┌─────────▼─────────┐                │
│                                  │  Y.Doc + Aware-   │                │
│                                  │  ness (yjs)       │                │
│                                  └─────────┬─────────┘                │
└────────────────────────────────────────────┼─────────────────────────┘
                                  HTTPS │ WSS │ /collaboration
                                        │     │
┌───────────────────────────────────────▼─────▼─────────────────────────┐
│                              BACKEND (Node 22)                         │
│                                                                        │
│   ┌─────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│   │ Express (REST)  │   │  Hocuspocus      │   │  BetterAuth      │   │
│   │  /api/*         │   │  /collaboration  │   │  /api/auth/*     │   │
│   └────────┬────────┘   └────────┬─────────┘   └────────┬─────────┘   │
│            │                     │                       │             │
│            ▼                     ▼                       ▼             │
│   ┌────────────────────────────────────────────────────────────┐      │
│   │  modules/<feature>/  (router → service → policy → schema)  │      │
│   └────────────────────────────────────────────────────────────┘      │
│            │                     │                                     │
│            └────────────┬────────┘                                     │
│                         ▼                                              │
│                ┌────────────────┐                                      │
│                │ Drizzle / pg   │                                      │
│                └────────┬───────┘                                      │
└─────────────────────────┼─────────────────────────────────────────────┘
                          ▼
                   PostgreSQL 16
```

---

## Frontend layers

The dependency graph is strictly one-way and has only three layers.
This was the most-debated decision; respect it religiously.

### `src/editor/tiptap/` — Tiptap / ProseMirror

Lowest layer. Owns the Tiptap editor instance, all extensions, the toolbar,
slash menu, find/replace, block drag handles, and bubble menus.

- May import from `src/editor/<sibling-domain>/` for marks/decorations
  (e.g. `comments/CommentMark`, `suggestions/SuggestionMode`).
- May NOT import from `src/containers/`.
- Receives an `EditorContextHandle` (an imperative cell, not a React
  context) so PM plugins can read fresh values inside synchronous event
  handlers without stale-closure bugs.

### `src/editor/` — Domain logic

Pure ops on `Y.Doc`, ADTs, format conversion, DOCX export. No React state.

| Sub-domain     | Responsibility                                            |
|----------------|-----------------------------------------------------------|
| `collab/`      | `createCollab()` factory (Y.Doc + HocuspocusProvider), `SyncStatus` enum, peer cursor builders |
| `comments/`    | Comment ADT, `threadOps`, reactions, mentions, color      |
| `suggestions/` | `SuggestionMode` extension, `trackChangeMarks`, ops       |
| `versions/`    | `diffDoc`, `buildDiffDocument`, `splitDiffSides`          |
| `glossary/`    | `GlossaryHighlight` extension, ops                        |
| `identity/`    | User/Role types, color storage, perms                     |
| `io/`          | DOCX export, Markdown serializer, typography, stats       |
| `ai/`          | AI suggestion ops                                         |
| `shell/`       | Generic shell components: ContextMenu, Avatar, useToast   |

### `src/containers/editor/` — React shell

Page-level shells, panels, layout. Owns React state and the hooks that
bridge Yjs observations into React renders. Each feature is a self-contained
module:

```
<feature>/
  index.tsx           panel/sidebar/modal mount point (public)
  components/         ★ private to the feature
  hooks/              feature-local hooks
  store/              feature-local zustand store + provider (if any)
  __tests__/
  <feature>.css
```

External callers import via `@/containers/editor/<feature>` — its
`index.tsx`. **`components/` is private**: cross-feature reuse means
promoting to `src/components/` or `src/editor/`. Inside a feature, sibling
files use relative imports to signal the boundary.

---

## Backend layers

```
src/
├─ index.ts                 bootstrap (HTTP server + WS upgrade handling)
├─ app.ts                   Express app wiring (CORS, body parsing, auth, routers)
├─ env.ts                   zod-validated env (NODE_ENV, DATABASE_URL, …)
├─ auth/                    BetterAuth config, dev quick-login, session helpers
├─ collab/                  Hocuspocus server + auth + persistence + presence
├─ db/                      Drizzle schema, migrations, projections
├─ lib/                     shared infra (permissions, errors, rate limits, …)
├─ modules/<feature>/       feature modules — see pattern below
├─ openapi/                 Swagger UI + spec generation
└─ seed/                    dev users, books, threads
```

### Module pattern (canonical: `books`, `comments`)

The fully-developed shape is six files:

```
modules/<feature>/
  router.ts        Express router; mounts handlers, applies middleware
  service.ts       business logic; the only place that calls drizzle
  policy.ts        permission checks (returns / throws errors)
  schemas.ts       zod request/response schemas (single source of truth)
  openapi.ts       OpenAPI registrations driving the Swagger doc
  dto.ts           (optional) DB row → API payload mappers
```

Why this split:
- **`schemas.ts`** is shared by `router` (validation), `openapi` (spec), and
  `service` types — one definition, three consumers.
- **`policy.ts`** centralises permission checks per feature so a route file
  reads as a sequence of intent without inline auth logic.
- **`service.ts`** is the only file that touches `drizzle`. Easier to mock,
  easier to migrate.

**Reality:** today only `books/` and `comments/` carry all six files. Smaller
modules use a subset that matches their complexity:

| Module        | Files present                                                |
|---------------|--------------------------------------------------------------|
| `books`       | router, service, policy, schemas, openapi, workflow          |
| `comments`    | router, service, policy, schemas, openapi, dto               |
| `users`       | router, service, schemas                                     |
| `versions`    | router, schemas                                              |
| `assignments` | router, schemas                                              |
| `ai`          | router only                                                  |
| `pdf`         | router only                                                  |

When a module gains complexity (multiple endpoints, role-gated actions, or
non-trivial drizzle queries), grow it toward the full shape rather than
piling logic into `router.ts`.

### Two transports, one auth

| Path                      | Handler            | Auth                    |
|---------------------------|--------------------|-------------------------|
| `/api/auth/*`             | BetterAuth         | (issues cookies)        |
| `/api/*`                  | Express routers    | session cookie          |
| `/collaboration` (WS)     | Hocuspocus server  | session cookie via WS upgrade headers |

Hocuspocus reuses the BetterAuth session cookie at WS-upgrade time
(`backend/src/collab/auth.ts`), so there's only one source of identity.

### Persistence

- `book_yjs_state` — single row per book, full Y.Doc binary state, updated
  on every Yjs sync. `size_bytes` tracked alongside for monitoring growth.
- `book_snapshot` — labelled snapshots (manual or auto), full Y state.
- `comment_thread` / `comment_message` — projected from Yjs by
  `db/projections.ts` so search/list endpoints don't need to materialize a
  Y.Doc per request.
- `book_stage_history` — workflow stage transitions (editing → proofreading
  → typesetting → done).

The Yjs state is authoritative; the projections are a read-side cache.

---

## Realtime: end-to-end sync path

1. **Client** calls `createCollab(bookId)` → returns
   `{ doc, provider, persistence, ready }`.
2. `HocuspocusProvider` opens `WSS /collaboration?…`. Browser includes the
   BetterAuth cookie.
3. **Server** `onAuthenticate` verifies the cookie, looks up book access via
   `getBookAccessByUserId`, returns `{ user, roles, readOnly }`. Read-only
   sessions go through but the connection's `readOnly` flag is set.
4. **Persistence extension** loads the prior `book_yjs_state` blob, applies
   it to the server's Y.Doc, and streams pending updates to the client.
5. Subsequent edits flow as Y updates over the WS, persisted on every
   `onStoreDocument` debounced batch.
6. Awareness (peer cursors, presence) is broadcast in-memory only; presence
   API exposes a snapshot via `collab/presence.ts`.

> **Stage-1 invariant**: single backend process. Presence and the Hocuspocus
> document store are process-local. See `collab/server.ts` top-of-file
> comment for the multi-process plan.

---

## State boundaries — what lives where

| State                                       | Lives in                  | Sync model       |
|---------------------------------------------|---------------------------|------------------|
| Document content                            | Y.Doc `'default'`         | CRDT             |
| Comments                                    | Y.Doc `'comments'`        | CRDT             |
| Glossary                                    | Y.Doc `'glossary'`        | CRDT             |
| Document meta (title, header/footer text…)  | Y.Doc `'meta'`            | CRDT             |
| Suggestion replies                          | Y.Doc `'suggestionReplies'` | CRDT           |
| Suggesting toggle                           | Y.Doc `'__settings__'`    | CRDT             |
| Peer cursors / presence                     | Awareness                 | ephemeral        |
| Active comment id, panel toggles            | Zustand (session)         | local            |
| Versions / snapshots                        | `localStorage`            | local-only (Stage 1) |
| Auth session                                | BetterAuth cookie         | server-issued    |
| Book metadata, assignments, stage history   | Postgres (REST)           | request/response |

See `docs/yjs-and-collab.md` for the precise Y.Map shapes.

---

## Cross-cutting concerns

### Permissions

Backend is the only enforcement boundary. See `docs/permissions.md`.
Frontend `Permissions` shape is mirrored from the backend response and used
to gate UI affordances cosmetically.

### i18n

Every user-visible string must go through `t('namespace.key')`. The
`check-locales` script fails CI on missing keys. Files:

```
frontend/public/locales/{en,pl,ua}/translation.json
```

Convention defined in `CLAUDE.md`.

### OpenAPI client generation

Backend routes register schemas via `lib/openapi.ts`; the spec is served at
`/openapi.json`. The frontend client in `src/api/generated/` is produced by
`just gen-api` (requires backend running). A vitest enforces every route
has an `operationId`.

### Logging

Both sides use a structured logger (`backend/src/lib/log.ts`). Never use
`console.log` in production paths.

### Error model

Backend `lib/errors.ts` + `lib/errorCodes.ts` define a typed error envelope:
HTTP status + `code` + optional details. Routers throw, the global error
handler emits the envelope. Frontend `lib/api` maps codes to toasts.

---

## Reading map

- **Want to add a feature?** → `docs/extending-the-editor.md`
- **Want to understand Y.Doc shape?** → `docs/yjs-and-collab.md`
- **Want to understand who can do what?** → `docs/permissions.md`
- **Want to change typography / page margins?** → `docs/editor-styling.md`
- **Working on the React shell?** → `frontend/src/containers/editor/README.md`
