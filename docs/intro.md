# Prześwity Editor — Developer Intro

Onboarding doc for new contributors. Read top-to-bottom once, then use as a
reference. Pairs with the root `README.md` (boot/run) and
`frontend/src/containers/editor/README.md` (deeper architecture).

> If you only have 10 minutes: read **§1 What this is**, **§3 Mental model**,
> and **§5 Project structure**.

---

## 1. What this is

A collaborative, paginated, A4-style Word-processor-like editor for a
publishing house. Multiple users edit the same book in real time with peer
cursors, comment threads, track-changes ("suggesting") mode, snapshots/diffs,
glossary, and DOCX/Markdown export.

Stack at a glance:

| Layer       | Tech                                                                 |
|-------------|----------------------------------------------------------------------|
| Editor UI   | React 19 + Tiptap 3 (ProseMirror) + Tailwind + shadcn/ui             |
| Realtime    | Yjs CRDT + Hocuspocus WebSocket provider                             |
| Frontend    | Vite + TanStack Router/Query + Zustand                               |
| Backend     | Node 22 + Express + Drizzle/Postgres + BetterAuth + Hocuspocus       |
| Shared      | `@przeswity/editor-schema` — Tiptap schema + Markdown round-trip (backend-only today; see §4.4) |
| i18n        | `react-i18next` (PL primary, EN, UA)                                 |

---

## 2. Tiptap / ProseMirror / Yjs — 15-minute primer

You cannot work in this codebase without a basic mental model of the three
libraries below. Skim this once.

### 2.1 ProseMirror (the foundation)

Tiptap is a thin React-friendly wrapper around **ProseMirror**. Concepts you
*must* know:

- **Schema** — defines the allowed node types (`paragraph`, `heading`, …) and
  marks (`bold`, `italic`, `comment`, …). Yjs sync ignores schema (it ships
  binary updates), but rendering needs one on each side. Our **frontend**
  schema is assembled from Tiptap extensions in
  `frontend/src/editor/tiptap/extensions.ts`. The **backend** schema lives
  in `shared/editor-schema/src/index.ts` and is used for Markdown round-trip
  + seed. See §4.4 for the drift caveat.
- **Document** — a tree of nodes. Each position is an integer "doc position".
  `from`/`to` ranges describe selections and mark spans.
- **Transaction (`tr`)** — an immutable description of a state change. You
  build a `tr`, then `view.dispatch(tr)` applies it. Never mutate state
  directly.
- **Plugin** — a `ProseMirror Plugin` hooks into the view (key handling, click
  handling, decorations, custom state). Our find/replace, slash menu, and
  block drag handles are PM plugins under `editor/tiptap/`.
- **Decoration** — visual overlay that does NOT change the document (e.g.
  highlight a search hit). Cheap. Use these for transient UI.
- **Mark vs. node** — marks are inline (bold, comment, suggestion). Nodes are
  block (paragraph) or inline (text, image). Our `comment`, `insertion`,
  `deletion`, and `formatChange` are marks.

### 2.2 Tiptap (extension API)

Tiptap exposes ProseMirror through composable **Extensions**. Three flavours:

```ts
Node.create({ name: 'paragraph', /* schema spec */ });
Mark.create({ name: 'comment',   /* schema spec, attrs, render */ });
Extension.create({ name: 'focusMode', addProseMirrorPlugins() { … } });
```

Common patterns you'll see:
- `addAttributes` — declares attrs the schema serializes (with `parseHTML` /
  `renderHTML`).
- `addCommands` — registers chainable commands (`editor.commands.foo()`).
- `addKeyboardShortcuts` — keymap.
- `addProseMirrorPlugins` — drop down to PM for anything beyond the above.
- `addInputRules` / `addPasteRules` — text patterns that auto-transform.

Where to look in this repo:

| Where                                    | What                                |
|------------------------------------------|-------------------------------------|
| `src/editor/tiptap/extensions/`          | Generic extensions (FocusMode, …)   |
| `src/editor/tiptap/extensions.ts`        | `buildExtensions(config)` registry  |
| `src/editor/comments/CommentMark.ts`     | `comment` mark                      |
| `src/editor/suggestions/trackChangeMarks.ts` | `insertion` / `deletion` / `formatChange` marks |
| `src/editor/suggestions/SuggestionMode.ts`   | wraps every keystroke into suggestion marks |
| `src/editor/glossary/GlossaryHighlight.ts`   | decoration-based glossary highlight |
| `shared/editor-schema/src/index.ts`      | Backend schema — Markdown export, seed |

### 2.3 Yjs + Hocuspocus (the network)

Yjs is a CRDT — replicas converge automatically without a central authority,
even with concurrent edits. Hocuspocus is the WebSocket transport.

Mental model:

- **`Y.Doc`** is the source of truth. The Tiptap document is just a *view* of
  one Y type inside `Y.Doc` (the ProseMirror XML fragment).
- **Y types** we use: `Y.XmlFragment` (the prose) and `Y.Map` (meta,
  glossary, comments, suggestion replies, settings). No `Y.Array` in
  production paths today — snapshots live in localStorage (frontend) and
  `book_snapshot` rows (backend), not in the Y.Doc.
- **Tiptap ↔ Yjs binding** is the `@tiptap/extension-collaboration`
  extension; we register it in `extensions.ts`.
- **Awareness** is ephemeral state attached to a session — cursor positions,
  user identity, color. Not persisted; cleared on disconnect.
- **Persistence** is server-side only (Postgres `book_yjs_state`). We
  intentionally **do not** use IndexedDB persistence — see
  `editor/collab/yDoc.ts` for the comment explaining why.

Writes work like this:

1. UI calls a pure op (`threadOps.addThread(map, …)`) on a `Y.Map`.
2. Yjs records the change, fires observers, broadcasts the update.
3. Hocuspocus relays it; remote clients merge it; their observers fire.
4. React hooks (`useCommentThreads`, `useDocumentMeta`, …) re-render.

Rule of thumb: **mutate Y types only through pure ops**. Never inline
`map.set(…)` from a component.

---

## 3. Mental model — three layers

```
┌────────────────────────────────────────────────────────────────────┐
│  src/containers/editor/  — REACT SHELL                              │
│  layouts, panels, hooks that bridge Yjs → React renders.            │
│  May import from src/editor/* and src/components/*.                 │
├────────────────────────────────────────────────────────────────────┤
│  src/editor/  — DOMAIN LOGIC                                        │
│  Pure ops on Y types, ADTs, format conversion, no React state.      │
│  Can import from src/editor/tiptap/* but NOT from containers.       │
├────────────────────────────────────────────────────────────────────┤
│  src/editor/tiptap/  — TIPTAP / PROSEMIRROR                         │
│  Extensions, slash menu, find/replace, drag handles, toolbar.       │
│  No knowledge of containers; receives a `ctx` handle for state.     │
└────────────────────────────────────────────────────────────────────┘
```

**The dependency rule is one-way.** `editor/` must not import from
`containers/`. Violating it creates circular modules.

---

## 4. Key architectural decisions (the "why")

### 4.1 Yjs is the source of truth — React observes

We never mirror Y state into Zustand or component state. React hooks subscribe
to `Y.Map` / `Y.Array` and re-render. This avoids stale-state classes of bugs
when remote updates arrive.

Exception: ephemeral UI state (active comment, hovered block, pulse tick)
lives in Zustand stores under `containers/editor/session/`.

### 4.2 Editor context handle, not React context

`@/editor/tiptap/editorContext.ts` is an **imperative cell** (`ctx.get()` /
`ctx.update()`), not a `React.Context`. ProseMirror plugins fire
synchronously inside event loops; capturing closure values would go stale.
The handle is updated in `useLayoutEffect` so reads inside event handlers
always see the current snapshot.

### 4.3 Suggesting mode wraps keystrokes

Track-changes is implemented client-side: `SuggestionMode` intercepts every
edit transaction and rewrites it into `insertion` / `deletion` marks. Format
toggles emit `formatChange` marks. **Stage 1 trusts the client** — Stage 2
adds a server-side Yjs-update validator. Don't ship destructive edits while
suggesting; check the marks first.

### 4.4 Shared schema package — backend-only today

`shared/editor-schema` exposes a Tiptap-compatible schema plus a Markdown
↔ Y.Doc binary-state round-trip. **As of Stage 1 it is consumed only by
the backend** (seed scripts, Markdown export, book initialisation from
markdown). The frontend builds its own schema directly via Tiptap 3 in
`editor/tiptap/extensions.ts::buildExtensions`.

Two consequences worth knowing about:

- **Version skew.** Frontend uses `@tiptap/*@^3`, backend + shared use
  `@tiptap/*@^2`. The Yjs wire format does not carry schema info, so this
  works in practice — but a node/mark added on one side is invisible to
  the other unless mirrored manually.
- **Drift risk.** Adding a new mark on the frontend without mirroring it
  in `shared/editor-schema/src/index.ts` will silently produce empty/
  blank ranges in DOCX/Markdown export and seed data.

If/when we migrate the backend (and the shared package) to Tiptap 3 and
import that single schema from the frontend, the drift risk goes away.
Until then, treat the schema as TWO sources of truth — one for runtime
editing, one for export/seed — and keep them aligned by hand.

### 4.5 Zustand for ephemeral UI; Yjs for collaborative state

| State                                  | Lives in              |
|----------------------------------------|-----------------------|
| Document content, comments, glossary, meta | Yjs (`Y.Doc`)     |
| Active comment id, panel open/closed   | Zustand (session)     |
| Suggesting toggle, peer cursors        | Zustand + Yjs awareness |
| Versions / snapshots                   | `localStorage` (per book) |
| Auth session                           | BetterAuth cookie     |

Versions are local-only by design in Stage 1 — they're a power-user
quality-of-life feature, not collaborative.

### 4.6 ADT discriminators over optional fields

Per `CLAUDE.md`: a focus state is `{ kind: 'note', noteId } | { kind: 'board',
boardId } | { kind: 'none' }`, never `{ noteId?, boardId? }`. See
`HeaderFooterKind` enum, `SyncStatus` enum, the comment ADT.

### 4.7 Pagination is visual, not structural

`tiptap-pagination-plus` paints page breaks/headers/footers as decorations
over the editor; the underlying document is one long flow. This means
splitting is automatic and nothing in the doc structure encodes "page 3".
DOCX export computes pagination at export time.

### 4.8 Permissions are enforced server-side

Every REST mutation checks `lib/permissions.ts`. Hocuspocus auth is gated by
`backend/src/collab/auth.ts`. **Frontend role-gating is currently cosmetic
only** (Stage 1 limitation tracked in README) — never assume the UI's role
checks are a security boundary.

### 4.9 i18n — every user-visible string

`t('namespace.key')`. Keys exist in EN/PL/UA. The `check-locales` script
fails CI when a key is missing in any locale. See `CLAUDE.md` for naming
convention.

---

## 5. Project structure

```
przeswity/
├─ backend/                      Express + Drizzle + Hocuspocus
│  └─ src/
│     ├─ app.ts                  app wiring
│     ├─ index.ts                bootstrap (HTTP + WS)
│     ├─ env.ts                  zod-validated env
│     ├─ auth/                   BetterAuth, dev quick-login, session helpers
│     ├─ collab/                 Hocuspocus server, auth, persistence, presence
│     ├─ db/                     Drizzle schema, migrations, projections
│     ├─ lib/                    permissions, errors, rate limits, OpenAPI
│     ├─ modules/                feature modules (REST). Each has:
│     │   <feature>/
│     │     router.ts            Express router
│     │     service.ts           business logic
│     │     policy.ts            permission checks
│     │     schemas.ts           zod request/response schemas
│     │     openapi.ts           OpenAPI registration
│     ├─ openapi/                Swagger UI + spec generation
│     └─ seed/                   dev users, books, threads
│
├─ frontend/
│  └─ src/
│     ├─ main.tsx                Vite entry
│     ├─ routes/                 TanStack Router file-based routes
│     ├─ api/generated/          openapi-ts output (do not edit)
│     ├─ app/                    app-level providers
│     ├─ auth/                   BetterAuth client glue
│     ├─ components/             shared UI (forms, tables, badges, ui/, …)
│     ├─ containers/             page-level shells
│     │  └─ editor/              ★ the editor shell (see its README)
│     │      index.tsx           EditorHost
│     │      Providers.tsx       provider stack
│     │      EditorLayout.tsx
│     │      session/            sessionStore, liveStore, paneStore
│     │      hooks/              editor-wide hooks (collab, export, fonts, …)
│     │      layout/             TopBar, LeftPane, RightPane, StatusBar, …
│     │      comments/           comment threads UI
│     │      versions/           snapshots + diff UI
│     │      suggestions/        track-changes UI
│     │      glossary/ meta/ outline/ peers/ status/ workflow/
│     ├─ contexts/               cross-cutting React contexts
│     ├─ editor/                 ★ DOMAIN LOGIC — no React state
│     │   collab/                yDoc factory, syncStatus, peerCursor
│     │   comments/              CommentMark, threadOps, reactions, mentions
│     │   suggestions/           SuggestionMode, trackChangeMarks, ops
│     │   versions/              diffDoc, buildDiffDocument, splitDiffSides
│     │   glossary/              GlossaryHighlight extension, ops
│     │   identity/              user types, perms, color storage
│     │   io/                    DOCX export, Markdown, typography, stats
│     │   ai/                    AI suggestion ops
│     │   shell/                 ContextMenu, Avatar, useToast
│     │   tiptap/                ★ Tiptap extensions, toolbar, slash, find
│     │     index.tsx            EditorView (renders <EditorContent>)
│     │     extensions.ts        buildExtensions(config)
│     │     editorContext.ts     imperative ctx handle
│     │     hooks/               useEditorInit + helpers
│     │     extensions/          generic extensions
│     │     blocks/              block hover, drag, menu
│     │     canvas/              BubbleToolbar, BlockMenu, DragHandle
│     │     toolbar/             top-of-document formatting bar
│     │     slash/               slash command menu
│     │     find/                find & replace plugin
│     │     headerFooter/        page header/footer editor
│     │     contextItems/        right-click items
│     ├─ hooks/                  app-wide hooks
│     ├─ i18n/                   i18next setup
│     ├─ locales/                en/pl/ua translation.json
│     ├─ lib/                    api, fetch wrappers, helpers
│     ├─ styles/                 global tailwind layers
│     └─ utils/                  generic utils
│
├─ shared/
│  └─ editor-schema/             @przeswity/editor-schema workspace package
│      src/
│        index.ts                Backend Tiptap schema (Markdown round-trip, seed)
│        markdown.ts             markdown serializer
│
├─ docs/
│  ├─ intro.md                   ← you are here
│  └─ editor-styling.md          how to change fonts/spacing/page margins
│
├─ docker-compose.dev.yml        db + shared sidecar + backend
├─ docker-compose.deploy.yml     deploy stub (Stage 2)
├─ justfile                      `just dev`, `just gen-api`, `just db-*`
└─ README.md                     boot, env vars, seeded data
```

---

## 6. End-to-end flow — a single keystroke

So you can wire the layers together in your head:

1. User presses **B** with one word selected.
2. Keymap in `StarterKit` dispatches `toggleBold` command → ProseMirror builds
   a `tr` adding the `bold` mark.
3. If suggesting mode is on, `SuggestionMode` intercepts and rewrites the `tr`
   into a `formatChange` mark instead.
4. `view.dispatch(tr)` applies the transaction to the editor's PM state.
5. The `Collaboration` extension translates the PM step into a Yjs update on
   the shared `Y.XmlFragment`.
6. `HocuspocusProvider` sends that update over WebSocket.
7. The backend (`backend/src/collab/server.ts`) auths the connection, persists
   the update to Postgres (`book_yjs_state`), broadcasts to peers.
8. Peers' `Y.Doc` merges the update; `Collaboration` extension converts it
   back to PM steps; the editor view re-renders.
9. Comment marks, glossary decorations, and peer cursors all repaint via
   their own observers/decorations.

---

## 7. Where to start when you need to…

| Task                                | Start here                                                    |
|-------------------------------------|---------------------------------------------------------------|
| Add a new block type / mark         | New file under `editor/tiptap/extensions/`, register in `extensions.ts`. Mirror in `shared/editor-schema/src/index.ts` if it round-trips through Markdown/DOCX. |
| Add a new keyboard shortcut         | The owning extension's `addKeyboardShortcuts`                 |
| Add a slash command                 | `editor/tiptap/slash/`                                        |
| Add a toolbar button                | `editor/tiptap/toolbar/`                                      |
| Add a side panel / tab              | New folder under `containers/editor/<feature>/`               |
| Add a REST endpoint                 | New folder under `backend/src/modules/<feature>/`             |
| Change page margins / fonts         | `docs/editor-styling.md`                                      |
| Add an i18n string                  | EN/PL/UA `translation.json` + `t()` call                      |
| Touch the schema                    | Frontend: `editor/tiptap/extensions.ts`. Backend export/seed: `shared/editor-schema/`. **Both** if it round-trips through Markdown/DOCX. |

---

## 8. Common gotchas

- **Cookies & `127.0.0.1`** — BetterAuth cookies are scoped to `localhost`.
  Mixing `127.0.0.1` and `localhost` between frontend and backend silently
  drops auth.
- **IndexedDB** — disabled deliberately (see `editor/collab/yDoc.ts`).
  Don't re-enable without solving the duplicate-content problem.
- **Schema drift** — when you change `shared/editor-schema`, the `shared`
  Docker sidecar (`tsc --watch`) must rebuild before the backend picks it up.
  `just dev` handles this; if you're running native, run
  `npm -w @przeswity/editor-schema run build`.
- **Tiptap version pin** — we use `@tiptap/y-tiptap`'s `yCursorPlugin`
  directly because the `extension-collaboration-cursor` package imports a
  different y-prosemirror instance and crashes. See the comment in
  `extensions.ts`.
- **Pagination + zoom** — `editor-zoom-frame` applies `transform: scale`. Pin
  overlays must live as siblings of `.editor-page` to scroll naturally
  without scaling.
- **OpenAPI client** — `frontend/src/api/generated/` is generated. Edit the
  backend route's OpenAPI registration, run `just gen-api` (with backend
  running), commit both.
- **i18n CI** — `npm -w frontend run check-locales` fails the build on a
  missing key. Always edit all three `translation.json` files together.

---

## 9. Stage-1 limitations (from README)

- Suggest-only roles trust the client (Stage 2 server-side validator).
- Single Hocuspocus instance, no Redis fan-out.
- Frontend role-gating is cosmetic; backend enforces.
- F5 polish items, F6 permission UI gating, D2 deploy stack — all Stage 2.

If you find yourself fighting one of these, it's not a bug — it's a Stage
boundary.

---

## 10. Reading list (in this repo)

1. `README.md` — boot, env, seeded users.
2. `docs/intro.md` — this file.
3. `frontend/src/containers/editor/README.md` — editor architecture deep-dive.
4. `docs/editor-styling.md` — typography & page-layout knobs.
5. `CLAUDE.md` — coding conventions enforced in review.

External:
- ProseMirror Guide — https://prosemirror.net/docs/guide/
- Tiptap Docs — https://tiptap.dev/docs
- Yjs Docs — https://docs.yjs.dev/
- Hocuspocus — https://tiptap.dev/docs/hocuspocus
