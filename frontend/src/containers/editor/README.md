# Editor Container

## Overview

Tiptap-based collaborative document editor backed by Yjs (Hocuspocus WebSocket
provider). Features: real-time peer cursors and presence, comment threads with
reactions and mentions, glossary highlighting, document meta panel, manual and
auto snapshots with visual diffs, AI-assisted suggestions (track-changes mode),
find/replace, and document export to DOCX and Markdown.

## Architecture

Three-tier separation keeps React state, domain logic, and Tiptap internals
independent:

**`src/containers/editor/`** — React shell. Owns React state, layout, routing
between panels, and the hooks that bridge Yjs observations into React renders.
Entry point is `index.tsx` (`EditorHost`, lifecycle gating). Editor chrome
lives under `layout/`; per-feature UI lives under `<feature>/` modules:

    index.tsx               EditorHost (lifecycle gating + provider stack)
    layout/                 TopBar, LeftPane, RightPane, StatusBar,
                            BookTitleMenu, UserMenu, PageJumper,
                            EditorSkeleton, EmptyState
    session/                editor-wide state — sessionStore, liveStore,
                            paneStore + SessionProvider, LiveProvider
    hooks/                  editor-wide hooks (collab, export, fonts, etc.)

    comments/               comment threads, replies, reactions, mentions
    versions/               VersionsPanel, snapshots, diff views
    glossary/               GlossaryPanel
    meta/                   MetaPanel
    outline/                OutlineSidebar
    suggestions/            SuggestionsSidebar
    peers/                  PeerAvatarStack
    status/                 SyncMini
    workflow/               ShortcutsModal (no panel — modal only)

### Feature module shape

Each `<feature>/` is a self-contained module:

    <feature>/
        index.tsx           panel / sidebar / modal mount point
        components/         internal pieces — private to the feature
        hooks/              feature-local hooks
        store/              feature-local zustand store + provider (if any)
        __tests__/          unit tests + harnesses
        <feature>.css       styles owned by the UI surface

External callers import the feature via `@/containers/editor/<feature>` —
its `index.tsx`. **A feature module's `components/` folder is private**:
external code must not import from `@/containers/editor/<feature>/components/`.
Cross-feature reuse means promoting the component to `src/components/` or
to a shared editor location. Inside a feature, sibling files use relative
imports (`./components/Foo`, `../store/Bar`) to signal the boundary.

Hooks under `hooks/` (top-level, not per-feature) own editor-wide state; none
of them import from `@/editor/tiptap/` internals.

**`src/editor/`** — Domain logic. No React component state. Sub-domains:

    collab/       yDoc (CollabBundle factory), syncStatus, peerCursor, types
    comments/     Comment ADT, threadOps, reactions, color, mentions, format
    glossary/     format, GlossaryHighlight extension
    versions/     diffDoc, buildDiffDocument, readOnlyExtensions, types
    suggestions/  SuggestionMode, suggestionOps, TrackChange extension
    io/           DOCX export (docx/), Markdown, typography, readingStats
    ai/           aiOps

**`src/editor/tiptap/`** — Tiptap extensions, toolbar, slash commands,
find/replace, block drag-and-drop. The Tiptap editor instance is initialised in
`hooks/useEditorInit.ts` via `buildExtensions`.

## Editor Context (no prop drilling)

`@/editor/tiptap/editorContext.ts` exports `EditorContextHandle` — a stable
imperative handle (not a React context) holding the current `EditorCtx` snapshot
(user, suggesting flag, glossary entries, header/footer callbacks). Extensions
read it synchronously at event time via `ctx.get()`, avoiding stale-closure
problems in Tiptap's ProseMirror plugin layer.

`useEditorInit` receives `ctx` as a prop and threads it into `buildExtensions`.
Deep children that only need React rendering should use the nearest hook rather
than threading `ctx` through JSX.

## Yjs as Source of Truth

`Y.Doc` is the source of truth for all in-document collaborative state.
React observes it through thin hooks:

- `useDocumentMeta(doc)` — subscribes to `doc.getMap('meta')`, re-renders on
  field changes.
- `useGlossaryEntries(doc)` — subscribes to `doc.getMap('glossary')`.

Writes always go through the pure ops modules so extension code and UI share
the same mutation paths:

    @/editor/meta/metaOps      setMetaField(map, key, value)
    @/editor/glossary/glossaryOps   addEntry / updateEntry / deleteEntry

The Tiptap editor binds to `doc` via the Collaboration extension (via
`buildExtensions`). Server sync is handled by `HocuspocusProvider` inside
`@/editor/collab/yDoc.ts` (`createCollab`).

## Comments

Domain code lives in `@/editor/comments/`:

- `Comment.ts` — Comment ADT (id, author, body, createdAt, resolvedAt, …).
- `threadOps.ts` — pure ops: add/reply/resolve/reopen/delete on `Y.Map`.
- `reactions.ts` — toggle emoji reactions.
- `color.ts` — stable per-author highlight color.
- `mentions.tsx` — `buildCandidates` and `renderBodyWithMentions` helpers.
- `types.ts` — shared TypeScript types.

UI lives in `@/containers/editor/comments/`. Container hooks
(`useCommentThreads`, `useCommentOps`, `useCommentCallbacks`,
`useCommentDrafts`, `useMentionDetection`) bridge Yjs observations to React.

## Versions

`useVersions(doc, user, editor, bookId)` in `versions/hooks/useVersions.ts`:

- Persists `VersionSnapshot[]` to `localStorage` under key
  `przeswity.versions:<bookId>` via `useLocalStorageState` with
  `VERSIONS_PERSIST_DEBOUNCE_MS` debounce.
- Auto-snapshots are capped at `VERSIONS_AUTO_KEEP` (8); oldest autos are
  dropped when the cap is exceeded.
- `diffWithCurrent(snapshot)` and `diffBetween(a, b)` compute diffs via
  `buildDiffDoc` from `@/editor/versions/diffDoc`.

`useAutoSnapshot` drives periodic auto-snapshots; it delegates to
`useVersions.snapshot(true)`.

## Collab Status

`getProviderSyncStatus(provider)` in `@/editor/collab/syncStatus.ts` is the
single access point for Hocuspocus runtime fields (`status`, `synced`,
`isSynced`, `isConnected`, and the nested `websocketProvider.status`). It
returns a `SyncStatus` enum value (`Online | Connecting | Offline`). All UI
components consume that enum — never the raw provider fields.

## Imports Rule

`src/editor/` must not import from `src/containers/editor/`. Containers depend
on the editor domain; the dependency is strictly one-way. Violating this
creates circular modules and couples domain logic to React component trees.

## Adding Extensions

Register new extensions in `@/editor/tiptap/hooks/useEditorInit.ts` by adding
them to `buildExtensions` (defined in `@/editor/tiptap/extensions.ts`). Each
extension should own its own file under `src/editor/tiptap/` or a relevant
sub-domain (`src/editor/<domain>/`). UI surfaces (toolbars, picker menus) hang
off the React shell in `src/editor/tiptap/` or `src/containers/editor/`.
