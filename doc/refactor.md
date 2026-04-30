# Frontend refactor plan — `frontend/src`

Audit date: 2026-04-30. Stack: React 18, TanStack Router/Query, Tiptap + Yjs/Hocuspocus, Zustand, react-hook-form, Tailwind + shadcn/ui, vite, vitest, i18next, `@hey-api` generated client.

## A — Architecture issues

**A1. EditorHost is the de facto editor god-state — 9 useStates + drilled props through 6 layers.** `containers/editor/EditorHost.tsx:39-150` owns `editor`, `activeCommentId`, `pendingNew`, `rightTab`, `leftTab`, `findOpen`, `shortcutsOpen`, plus 9 hooks. Every state change re-renders Toolbar+EditorView+LeftPane+RightPane+StatusBar simultaneously. **Fix:** `editor/state/uiStore.ts` (Zustand). EditorHost shrinks to ~50 LOC. **L**

**A2. Extension wiring needs 6 mutable refs to escape stale closures.** `editor/tiptap/EditorView.tsx:36-59` mirrors `userRef`, `suggestingRef`, `glossaryRef`, `dragStateRef`, `onHeaderClickRef`, `onFooterClickRef` per render; `extensions.ts:48-58` accepts six getters. **Fix:** one `EditorRuntimeContext` ref with typed getters. **M**

**A3. CommentsSidebar prop-drills 14 props with fresh `buildCallbacks` per render.** `CommentsSidebar.tsx:110-133` — 11 closures × thread × render; all cards re-render even when one changes. **Fix:** `CommentsContext` (ops, drafts, currentUser, peers, editor); cards derive their own callbacks via `useMemo([threadId, ops])`. **M**

**A4. Versions persisted to one global localStorage key for all books.** `useVersions.ts:10` `STORAGE_KEY = 'editor-poc.versions'`. Switching books shows wrong snapshots; `editor-poc` prefix is leftover demo. **Fix:** key by `bookId`, move to IndexedDB (`y-indexeddb` already a dep). **M**

**A5. Query-key inconsistency.** `useBooksDashboard.ts:19` `['books']`; `useBookContext.ts:23,27` `['book', id]` / `['book-assignments', id]`; `PeoplePicker.tsx:39` `['bookAssignments', id]` (kebab vs camel — won't invalidate). Generated `*QueryKey()` helpers exist and are unused. **Fix:** delete hand-written keys, use generated. **S**

**A6. ADT violations.** `editor/comments/types.ts:14-16` discriminator + optional siblings (`status` + `resolvedBy?`/`resolvedAt?`); Toolbar's `suggestingMode + suggestingForced` (3 valid states from 2 booleans); `CommentFilterState.role: Role | ''` sentinel. **Fix:** discriminated unions per CLAUDE.md. **M**

**A7. `useThreads` rebuilds full thread array on every Y change.** `editor/comments/useThreads.ts:7-19` — `observeDeep` fires for every nested set including peer keystrokes in drafts; full re-sort + re-render. **Fix:** memo per thread by id, or 50ms `requestIdleCallback` coalesce. **M**

**A8. `useHasHeadings` walks whole doc on every editor update.** `LeftPane.tsx:70-89` — only used to choose between EmptyState and OutlineSidebar; outline already iterates the doc. **Fix:** single `useDocOutline(editor)` hook, both consumers derive. **S**

**A9. CSS architecture — two paradigms in conflict.** ~3960 LOC global CSS in editor (`comments.css 667`, `layout.css 464`, `toolbar.css 361`) vs Tailwind+shadcn elsewhere. `.thread`, `.btn-primary` are global — specificity wars guaranteed. **Fix:** CSS Modules migration for editor scope. **L**

**A10. EditorHost takes raw `role: string` and casts to `Role` inside.** `EditorHost.tsx:35,157` — narrow at the route boundary instead. **S**

## B — Performance hotspots

- **`usePeers` re-emits on every peer keystroke.** `usePeers.ts:21-50` — awareness fires because `lastActiveAt` updates on `selectionUpdate`/`update` (`EditorView.tsx:118-129`); 4–10×/sec during collab → StatusBar + sidebar mention candidates re-render. Split into `usePresence` (rare) + `usePeerActivity` (high-freq, narrow consumers).
- **CommentsSidebar re-renders all open threads on every keystroke** (A3 + A7 + `formatTime` returns new string per call, `CommentsSidebar.tsx:28-34`).
- **MarkdownDiffView recomputes diff on every parent render** — `editor.getJSON()` returns a new object each call. `useMemo` keyed on `editor.state.doc` revision.
- **Activity-throttle leak.** `EditorView.tsx:118-127` — pending `setTimeout` not cleared on cleanup; fires on dead awareness after unmount.
- **`useVersions` JSON-stringifies whole snapshot array on every change** (`useVersions.ts:35-37`); MB-scale main-thread spike per snapshot.
- **`useEditorInit` may rebuild extensions** when ref-getter deps churn → full ProseMirror state reset. Verify dep array.

## C — Repetition / DRY

- **Diff hunk walkers** — `MarkdownDiffView.buildInlineLines:57-102` and `buildSbsRows:104-152` share the same loop. Extract `walkHunks(changes, visitors)`.
- **Reaction toggle** — `useCommentOps.ts:26-36` and `:37-51` duplicate set-toggle math. Extract `toggleEmoji(reactions, emoji, userId)`.
- **`stopPropagation + cb.X()` buttons** in `CommentThreadCard.tsx` — 12+ repeats. Extract `<StopButton>`.
- **Draft panel** — initial-draft, edit-thread-body, and reply-edit are the same `MentionTextarea + Post + Cancel`. Extract `<DraftPanel>`.
- **localStorage-backed state** — `usePaneState`, `useVersions`, `useBooksDashboard.showOnlyMine`, `useNewBookForm` each roll their own. Extract `usePersistedState`.
- **"Replace document" flow** — `FileMenu.onFile:51-71` and `applyTemplate:73-79` share `confirm → setContent → toast`. Extract `replaceDocument`.
- **`t('...', { defaultValue })` defaults** hide missing keys across CommentThreadCard/CommentsSidebar — remove, populate locales.
- **Time formatting** — `formatTime` in CommentsSidebar duplicates `lib/dates.ts`.

## D — Code-quality nits (CLAUDE.md violations)

- **Files > 200 LOC:** `CommentThreadCard.tsx 245`, `MarkdownDiffView.tsx 236`, `CommentsSidebar.tsx 204`. CSS: `comments.css 667`, `layout.css 464`, `toolbar.css 361`, `shell.css 337`.
- **Inline math:** `StatusBar.tsx:83,89` (word-target percent); `CommentsSidebar.tsx:31-32` (time bucketing). Extract named utilities.
- **String-literal types where enums are mandated:** `CommentThread.status`, `LeftTab`, `RightTab`, `LineKind`, `DashboardView`, `QuickFilter`, `DraftKind`.
- **Hardcoded strings:** `FileMenu.tsx:55,76` window.confirm + `:99-103,114,120,126` "DOCX (.docx)" / "Markdown (.md)"; `Toolbar.tsx:62` `window.prompt('Link URL', …)`; `CommentsSidebar.tsx:30-33` `'just now'/'m ago'`; `CommentThreadCard.tsx:73,157,164`.
- **Sentinel/`as` casts:** `CommentFilterState.role: Role | ''`; `useVersions.ts:46` `Math.random().toString(36).slice(2,11)` (use `editor/utils.makeId`).
- **`editor-poc.versions`** — leftover demo storage key.
- **CLAUDE.md drift:** says `public/locales/...`; actual is `src/locales/{en,pl,ua}/<ns>.json`.

## E — Refactor plan (phased)

### Phase 1 — Mechanical cleanup (1–2 days, low risk)

1. Replace hand-written query keys with generated `*QueryKey()` from `api/generated/@tanstack/react-query.gen.ts` (fixes A5 invalidation bug).
2. Kill `defaultValue` fallbacks; populate `en|pl|ua/editor.json` + `common.json`; run `npm run check-locales`.
3. Extract i18n strings in `FileMenu`, `Toolbar`, `CommentsSidebar.formatTime`, `CommentThreadCard`.
4. Convert string-literal unions → string-valued enums (`CommentStatus`, `LeftTab`, `RightTab`, `LineKind`, `DashboardView`, `QuickFilter`, `DraftKind`).
5. Inline math → `lib/wordTarget.ts`, consolidate into `lib/dates.ts`.
6. Per-book versions key in `useVersions.ts` (drop `editor-poc` prefix).
7. Fix activity-throttle leak: track timer in ref, clear on cleanup (`EditorView.tsx:118-134`).
8. Pick one casing for `book-assignments` key; standardize.

### Phase 2 — Targeted extractions (~1 week)

9. **CommentsContext** — `{ ops, drafts, currentUser, peers, editor, candidates }`. `CommentsSidebar` → ~80 LOC; cards build callbacks locally. Eliminates A3 churn.
10. Extract `<DraftPanel>` from `CommentThreadCard` — under 150 LOC.
11. Extract `walkHunks` in `editor/versions/diffWalk.ts`; `MarkdownDiffView` becomes two ~40-LOC consumers.
12. `usePersistedState` primitive — migrate `usePaneState`, dashboard filters.
13. `replaceDocument(editor, html, sourceName, toast)` helper.
14. ADT-ify `CommentThread.status` and `EditMode = {kind:'editing'} | {kind:'suggesting', forced}` (Toolbar, EditorView, useSuggestingMode, EditorHost).
15. Coalesce `useThreads` with 50ms `requestIdleCallback` — first measurable collab perf win.
16. Split `usePeers` → `usePresence` (rare) + `usePeerActivity` (high-freq, narrow consumers).

### Phase 3 — Structural (2–3 weeks)

17. **`useEditorUiStore` (Zustand)** — `activeCommentId`, `pendingNew`, tabs, find/shortcuts overlays, panes. EditorHost becomes a layout shell; per-child selector subscriptions kill whole-tree re-renders.
18. **`EditorRuntimeContext`** — collapse the six refs in `EditorView.tsx` + `extensions.ts` into one runtime object. Riskiest change; gate behind flag, keep `extensions.test.ts` golden stable. Land **after** #17 (overlap on EditorView).
19. **Versions to IndexedDB** (`y-indexeddb` infra or `idb-keyval`); per-book; lazy-load snapshot bytes.
20. **CSS Modules migration** for `comments.css`, `versions.css`, `editor.css`; `tokens.css` stays global. Pure scoping, no visual change. Can run in parallel.
21. **Targeted tests** (12 test files for 220 sources today): `diffDoc`, `diffWalk` post-extraction, `threadOps`, `useCommentThreads` filter matrix, `useVersions` snapshot round-trip, `markdown.ts` round-trip, y-cursor wiring in `extensions.ts:75-89`.
22. Move `role as Role` cast from `EditorHost.tsx:157` to the route loader.

**Sequencing:** Phase 1 unblocks Phase 2 (enums used in store types). Phase 2 unblocks Phase 3 (context exists before store). #18 must follow #17. #20 parallel with anything.
