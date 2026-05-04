# Frontend refactor plan — editor state & component simplification

> Scope: `frontend/src/containers/editor/**` and `frontend/src/editor/tiptap/EditorView.tsx` plus the few callers that drill props through them. Also folds in adjacent fixes (i18n drift audit, permissions cleanup, dialog patterns) discovered while surveying. Not in scope: y-doc schema, backend, TipTap extension internals, CSS.

---

## 0. Revision log

- **r1** (initial): single global `sessionStore` + global `commentsStore` + provider, key-remount for reset.
- **r2** (this version, post adversarial review by codex): switched to **per-session zustand stores via `createStore`** (key remount does NOT reset module-level singletons). All multi-step y-doc ops wrapped in `doc.transact(...)`. Provider split into stable + live signal contexts. Multiple smaller corrections folded in.

Each change in r2 carries a `(r2)` marker so reviewers can spot what shifted.

---

## 1. Problem map (current state)

`EditorSession` (`frontend/src/containers/editor/EditorHost.tsx:34`) is the de-facto god component: 8 `useState`s + selectors from `paneStore` + 6 child-prop bundles. It threads `editor`, `user`, `doc`, `peers`, `activeCommentId`, `pendingNew`, `leftTab`/`rightTab` (and setters), `onToast` through `TopBar`, `LeftPane`, `RightPane`, `StatusBar`, `EditorView`, `Toolbar`. Each pane/sidebar then *re-derives* `perms` from `user.role`. Comment-side state spans 4 hooks (`useCommentOps`, `useCommentDrafts`, `useCommentThreads`, `useCommentCallbacks`) glued together inside `CommentsSidebar` and re-broadcast through a private `CommentsContext`.

### Smells

1. **Prop drilling of session primitives** (`editor`, `user`, `collab`, `doc`, `peers`, `bookId`, `onToast`) — passed to ~12 components though they're stable for the lifetime of an `EditorSession`.
2. **Cross-pane state lifted too high.** `activeCommentId`, `pendingNew`, `leftTab`/`rightTab`, `findOpen`, `shortcutsOpen` live in `EditorSession` but only 1–2 leaves consume each. Comment focus re-renders the whole tree.
3. **Pane store split brain.** `usePaneStore` (zustand, persisted) holds `left`/`right` visibility but tab state is local React state. They describe the same UI surface.
4. **`useCommentCallbacks` is 119 LOC of boilerplate** wrapping `ops` + `drafts` and rebuilds a per-thread callbacks `Map` on every thread change — only because `CommentThreadCard` is `memo`'d. Store selectors make it disappear.
5. **`CommentsContext` value rebuilt every render.** The `useMemo` deps include `drafts` whose object identity flips on every setter call.
6. **Imperative `EditorCtx` ref-cell** (`editor/tiptap/editorContext.ts`) hides extension dependencies on `user`/`suggesting`/`glossary`. *(r2: also read by `useEditorContextMenu.ts:45` and `useHeaderFooterSync` — synchronous-event-time reads, not just plugins.)*
7. **Permissions recomputed everywhere.** `ROLE_PERMISSIONS[user.role]` is dereferenced in `EditorHost`, `StatusBar`, `EditorView`, `CommentsSidebar`, `SuggestionsSidebar`, `BookTitleMenu`, `Toolbar/PaneToggleZone`, and 4 `contextItems/*.ts` files. Should resolve once per session.
8. **Ad-hoc layout math** (e.g. EditorHost.tsx:75–80, `narrow ? () => ... : () => cyclePane(...)`) reads as a riddle; should be a method on the pane store.
9. **`pendingNew` round-trip.** Editor → host state → effect in `CommentsSidebar` calls `ops.createThread` → clears via `onPendingHandled`. A direct store action is shorter.
10. **`useDocumentKeyDown` takes 4 setters** because state lives in the parent. With a store, the hook becomes dependency-free.
11. **Toolbar receives string labels** (`leftPaneTab`, `rightPaneTab`) rather than reading the active tab itself — extra coupling.
12. **`peers` derived once, threaded twice.** `EditorHost` calls `usePeers(provider)`, passes to `RightPane` + `StatusBar`.
13. **No `doc.transact` boundary in comment ops** *(r2)*. `useCommentOps` performs 2-step y-doc updates without `transact`, so every subscriber (notably `useThreads` with deep observe) sees intermediate states. Composing more ops in store actions amplifies this.

---

## 2. Target architecture (r2)

Two new domain stores + **two** providers (split for re-render hygiene), with the ref-cell `EditorCtx` kept as-is for synchronous TipTap reads.

### A. `containers/editor/stores/createSessionStore.ts` — per-session zustand factory *(r2)*

Transient session UI state currently scattered across `EditorSession` `useState`s. **Created via `createStore` per session**, exposed via context, **NOT** a module singleton.

```ts
// shape
interface SessionState {
    activeCommentId: string | null
    pendingNewComment: { id: string; quote: string } | null
    leftTab: LeftTab
    rightTab: RightTab
    findOpen: boolean
    shortcutsOpen: boolean

    setActiveComment(id: string | null): void
    enqueuePendingComment(a: { id: string; quote: string }): void
    consumePendingComment(): { id: string; quote: string } | null
    setLeftTab(t: LeftTab): void
    setRightTab(t: RightTab): void
    openFind(): void; closeFind(): void
    toggleShortcuts(): void; closeShortcuts(): void
}

export const createSessionStore = () =>
    createStore<SessionState>()((set, get) => ({ ... }));
```

**Consumption pattern** *(r2)*:

```ts
const SessionStoreCtx = createContext<StoreApi<SessionState> | null>(null);

export function useSession<T>(selector: (s: SessionState) => T, eq?: EqFn): T {
    const store = useContext(SessionStoreCtx);
    if (!store) throw new Error('useSession outside provider');
    return useStore(store, selector, eq);
}
```

Why per-session: the existing `key={collab.id}` remount (`EditorHost.tsx:220`) only remounts components — it does **not** reset module-level zustand stores. A factory + provider gives correct lifetime AND survives StrictMode double-invoke / HMR module re-eval cleanly.

### B. Extend `paneStore.ts` with intent-level toggles

Stays a module singleton (persisted, app-level, single instance is correct).

```ts
interface PaneStore {
    left: PaneState; right: PaneState
    setSide(side, state); expand(side); hide(side); rail(side); cycle(side)
    // new:
    toggle(side: PaneSide, narrow: boolean): void
    showSide(side: PaneSide, narrow: boolean): void  // auto-hides opposite when narrow
    dismissBoth(): void
}
```

Eliminates `expandLeft`/`expandRight`/`toggleLeft`/`toggleRight`/`dismissDrawers` from `EditorHost` (~20 LOC). `narrow` stays an explicit argument at every call site — never read from the store *(r2: codex pushback)* so mobile drawer behavior cannot regress silently.

### C. Two provider contexts, split by re-render frequency *(r2)*

**Stable context** — values that change ≤ 1 time per session:

```ts
// containers/editor/EditorSessionProvider.tsx
interface EditorSessionStableContext {
    user: User
    perms: RolePermissions          // resolved once
    bookId: string
    collab: CollabBundle            // doc + provider
    toast: ToastFn
}
```

**Live context** — values that fire frequently (awareness, observers):

```ts
// containers/editor/EditorLiveContext.tsx
interface EditorLiveContext {
    editor: Editor | null
    setEditor(e: Editor | null): void
    peers: Peer[]
    suggesting: SuggestingModeState  // { effective, forced, setMode }
}
```

Why split: putting `peers` (awareness 'change' fires constantly) and `suggesting` (y-map observer) into the same context as `user`/`bookId` would re-render every consumer of the stable values on every cursor move. *(r2: codex pushback.)*

Hook ergonomics:

```ts
const { user, perms } = useEditorSession();
const editor = useEditorLive(s => s.editor);
```

Implementation note: `EditorLiveContext` is itself best implemented as a tiny zustand-like store (or `useSyncExternalStore`) so consumers subscribe to a single field. A plain React context would still re-render all consumers when `peers` updates.

### D. `containers/editor/stores/createCommentsStore.ts` — collapse 4 hooks

Per-session zustand factory (same `createStore` pattern as `sessionStore`). Owns:

- filter state (status / author / role)
- drafts: `draft`, `replyDrafts: Record<threadId, string>`, `editTarget`, `editText`
- pure selectors over `useThreads(doc)` output: `selectVisible`, `selectOpen`, `selectResolved`, `selectAuthors`
- composed actions wrapped in `doc.transact(...)` *(r2 — required, see Smell 13)*:
  - `submitInitialBody(threadId)`, `submitReply(threadId)`, `editSubmit()`
  - `resolveThread(threadId, editor)`, `removeThread(threadId, editor)`
  - `beginEditThread(threadId, body)`, `beginEditReply(threadId, replyId, body)`, `cancelEdit()`
  - `toggleThreadReaction(threadId, emoji)`, `toggleReplyReaction(threadId, replyId, emoji)`
  - `flushPending(pending)` — consumes pending payload and creates the thread atomically

Selector design rules *(r2: codex pushback on T-44)*:
- Per-thread selectors defined upfront: `selectThread(id)`, `selectIsActive(id)`, `selectReplyDraft(id)`, `selectIsEditingThread(id)`, `selectIsEditingReply(id, replyId)`.
- Always pass `shallow` when selecting arrays/objects.
- Thread cards subscribe by id, not to the whole list.

### E. Delete `CommentsContext.tsx` once D lands

Dead code after store migration.

---

## 3. Expanded task list (r2)

> Each task is small, ships green, independently revertible. Prefix `T-` for commit messages and PR descriptions.

### Phase 0 — Prep

- **T-01** ✅ Plan locked at `docs/refactor-frontend.md` (this file).
- **T-02** Add `frontend/src/containers/editor/stores/README.md`: store-boundary rules (persisted vs transient; per-session via `createStore`; no module-singleton transient state).
- **T-03** Extract `ROLE_PERMISSIONS[user.role]` into a single source. Two-step:
  - **T-03a** Add `frontend/src/editor/identity/perms.ts` with a pure `permsFor(role): RolePermissions`. Replace **all** inline `ROLE_PERMISSIONS[...]` lookups: `EditorHost`, `StatusBar`, `EditorView`, `CommentsSidebar`, **`SuggestionsSidebar`** *(r2: missed in r1)*, `BookTitleMenu`, `Toolbar/PaneToggleZone`, and the 4 `editor/tiptap/contextItems/*.ts` files.
  - **T-03b** Once `EditorSessionProvider` lands (T-10), delete `permsFor` callers in components and read `perms` from context. Keep `permsFor` for the contextItems files (they run outside React).
- **T-04** *(r2)* Add a one-screen architecture diagram in `docs/refactor-frontend.md` appendix showing: stable context, live context/store, sessionStore, commentsStore, paneStore, editorContext ref-cell. Reviewers should be able to answer "where does X live" without reading code.
- **T-05** *(r2)* Snapshot-test the *current* editor render in a Playwright/Vitest browser test: open book, single comment, reply, edit, resolve, restore. This becomes the regression net for the entire refactor.

### Phase 1 — Stable session provider (high value, low risk)

- **T-10** Add `EditorSessionProvider` exposing `user`, `perms`, `bookId`, `collab`, `toast`. Wrap `EditorSession`. Export `useEditorSession()`.
- **T-11** Migrate `TopBar` → context. Drop matching props from `EditorHost`.
- **T-12** Migrate `BookTitleMenu`, `UserMenu`.
- **T-13** Migrate `LeftPane` (drop `user`, `bookId`, `onToast`, `doc`).
- **T-14** Migrate `RightPane` (drop `user`, `doc`).
- **T-15** Migrate `VersionsPanel`, `MetaPanel`, `GlossaryPanel`, `OutlineSidebar`, `SuggestionsSidebar`, `CommentsSidebar`. One commit per leaf.
- **T-16** Migrate `EditorView`'s `user` to context.
- **T-17** Cleanup pass: delete now-unused prop fields; ensure prop interfaces shrink to UI-only.

### Phase 2 — Live context for editor / peers / suggesting *(r2 expanded)*

- **T-20** Add `EditorLiveStore` (per-session zustand) with `editor`, `peers`, `suggesting`. Expose via `EditorLiveProvider` mounted inside the stable provider. Selector hook `useEditorLive(s => …)`.
- **T-21** Replace the `useState<Editor | null>` in `EditorSession` with `liveStore.setEditor`. Remove the `onEditorReady` prop on `EditorView`.
- **T-22** Move `usePeers(provider)` invocation into `EditorLiveProvider`. Drop the `peers` prop from `RightPane`, `StatusBar`. `PeerAvatarStack` reads from store.
- **T-23** Move `useSuggestingMode(doc, role)` into `EditorLiveProvider`. Drop `suggestingMode`/`suggestingForced`/`onSuggestingModeChange` props from `EditorView`, `Toolbar`, `StatusBar`.
- **T-24** *(r2)* Verify with React DevTools Profiler that updating `peers` does NOT cause `TopBar`/`StatusBar`/`LeftPane` to re-render unless they read `peers`. If they do, narrow selectors are wrong.

### Phase 3 — Pane store ergonomics

- **T-30** Extend `paneStore` with `toggle(side, narrow)`, `showSide(side, narrow)`, `dismissBoth()`. Add unit tests for cycle/hide rules. Keep `narrow` as an **explicit parameter** — never read inside the store *(r2)*.
- **T-31** Replace `expandLeft`/`expandRight`/`toggleLeft`/`toggleRight`/`dismissDrawers` in `EditorHost` with the new methods.
- **T-32** Remove pane side-effects from `EditorHost` event paths where natural — but **keep `narrow` resolution at the call site** (still computed via `useNarrowLayout()` in `EditorHost`/`EditorView`). *(r2: codex pushback on T-22.)*

### Phase 4 — Session store (transient UI state)

- **T-40** Add `createSessionStore` factory + `SessionStoreProvider` + `useSession(selector)` hook.
- **T-41** Migrate `activeCommentId` and `pendingNewComment`. `EditorView` callbacks call `useSession.setActiveComment` / `enqueuePendingComment` directly.
- **T-42** Migrate `leftTab`/`rightTab`. Update `LeftPane`/`RightPane` to read from store; drop `tab` and `onTabChange` props.
- **T-43** Migrate `findOpen`/`shortcutsOpen`. Refactor `useDocumentKeyDown` to take no args and read/write the store directly. Delete `DocumentKeyDownHandlers`.
- **T-44** Update `Toolbar` to read `leftTab`/`rightTab` (and labels) from store. Drop `leftPaneTab`/`rightPaneTab`/`onToggleLeftPane`/`onToggleRightPane` props.
- **T-45** *(r2: collapsed from old T-35 + T-43.)* Skip the temporary `useEffect` bridge — keep the existing `pendingNew` effect untouched until Phase 5's `flushPending` action exists, then replace in one move.

### Phase 5 — Comments store (single source of truth)

- **T-50** Add `createCommentsStore` factory with filter + drafts + pure selectors. No actions yet — purely state migration from `useCommentDrafts` + `useCommentThreads`.
- **T-51** Move comment ops into the store. **Wrap every multi-step mutation in `doc.transact(...)`** *(r2 — codex pushback)*. Audit existing single-step ops; add transact even for those if the action also clears drafts, so subscribers see one logical event.
- **T-52** Add composed actions: `submitInitialBody`, `submitReply`, `editSubmit`, `resolveThread`, `removeThread`, `flushPending`. Each is one `doc.transact` block + one draft mutation.
- **T-53** *(r2)* Add a `commentsStore.test.ts` that asserts y-doc subscribers see exactly one event per composed action (regression guard for the transact wrapper).
- **T-54** Replace `pendingNew` effect in `CommentsSidebar` with `flushPending(useSession.consumePendingComment())`.
- **T-55** Define the per-thread selector set: `selectThread(id)`, `selectIsActive(id)`, `selectReplyDraft(id)`, `selectIsEditingThread(id)`, `selectIsEditingReply(id, replyId)`. Add `shallow` everywhere arrays/objects flow.
- **T-56** Rewrite `CommentThreadCard`, `ThreadHeader`, `ThreadEditor`, `ThreadReplies`, `CommentReply` to take only `threadId` (and `replyId` where needed). Delete the per-thread callbacks `Map`.
- **T-57** Delete `useCommentCallbacks.ts`, `useCommentDrafts.ts`, `useCommentThreads.ts`, `CommentsContext.tsx`.
- **T-58** *(r2: realism check on test rewrite — codex pushback.)* Port the cases in `useCommentCallbacks.test.tsx` and `useCommentOps.test.ts` to test the store actions directly. If porting balloons past 30 minutes per file, instead ship a **shim hook** (`useCommentCallbacksLegacy`) wrapping the store with the old surface for one PR cycle, delete in the next. Decision recorded in the PR description.

### Phase 6 — Cleanups & guardrails

- **T-60** Replace `EditorView`'s `onActiveCommentChange`, `onCreateComment` callbacks with direct store calls. Prop interface collapses to `{ glossaryEntries }` (or move that into live store too).
- **T-61** Document `editor/tiptap/editorContext.ts` *(r2)*: top-of-file comment listing every synchronous-read site (`useEditorContextMenu`, `useHeaderFooterSync`, plugin handlers in `extensions.ts`, `slash/SlashCommand`, `glossary/GlossaryHighlight`). Lock the rationale: "any code reachable from a ProseMirror plugin step or a DOM event handler that runs before React commits must read here, not from React state."
- **T-62** ESLint guard: forbid imports of deleted files (`useCommentCallbacks`, `useCommentDrafts`, `useCommentThreads`, `CommentsContext`) under `containers/editor/components/comments/**`.
- **T-63** `sessionStore.test.ts`: pending-comment enqueue/consume race; find/shortcuts toggle; tab change does not affect comment state; per-session lifetime (two stores don't share state) *(r2)*.
- **T-64** `commentsStore.test.ts`: draft round-trip; edit cancel clears state; resolve clears active comment; flushPending no-op when queue empty; transact emits one event (T-53).
- **T-65** Manual browser walkthrough: open book → comment → reply → edit reply → resolve → reopen → delete; pane toggles; find / shortcuts; suggesting toggle. Capture before/after screenshots.
- **T-66** *(r2)* Profile re-renders before/after with React DevTools Profiler: focus a comment, type a reply, move cursor (peer awareness). Record render counts in PR description; gates Phase 5 merge.
- **T-67** *(r2)* Bundle size check: `npm run build` before/after, compare main chunk size. Adding `createStore` factories should be net-neutral (we delete more than we add).

### Phase 7 — Adjacent cleanups discovered during survey *(r2 — new)*

These aren't strictly state-management but live in the same code paths. Each is a separate PR.

- **T-70** **i18n drift audit.** CLAUDE.md mandates that every modified file extracts hardcoded strings to i18n into all three locales (`en`, `pl`, `ua`). Run a grep audit on all files touched in Phases 1–6 and verify no English literals leaked into JSX. Add a one-shot CI check: `eslint-plugin-i18next` rule set to `error` for the editor directory.
- **T-71** **Dialog patterns.** `VersionsPanel` uses `useConfirmDialog` + `ConfirmDialogHost`; `BookTitleMenu` and friends use ad-hoc dialogs. Audit and standardise to one pattern. Out-of-scope for state refactor — file as a follow-up issue if scope explodes.
- **T-72** **Toast plumbing.** `ToastFn` is threaded through ~10 components today. Once it's in `useEditorSession()`, audit whether any leaf still receives `onToast` as a prop and remove. (Mostly captured in Phase 1, but worth a pass.)
- **T-73** **Hook directory hygiene.** `containers/editor/hooks/` has 24 hooks. After Phase 5 deletes 3, audit for further candidates: `useEditorBootstrap` is a 3-line wrapper that could inline; `useNarrowLayout` is used once. Decide keep/inline per hook.
- **T-74** **`EditorView` prop interface.** Currently 11 fields (`editor/tiptap/types.ts:9`). After Phases 1–5 it should be 2–3. If any leaks remain, either move them to live store or accept them as genuinely UI-specific.
- **T-75** **Suggestions sidebar.** Same hook+context architecture pattern likely applies to `SuggestionsSidebar` (not surveyed deeply). Schedule survey + plan as follow-up; do not bundle into this refactor.
- **T-76** **Other god-components.** Audit `containers/books`, `containers/coordinator`, `containers/auth` for similar prop-drilling patterns. Schedule as separate refactor docs (`docs/refactor-books.md` etc.).
- **T-77** **A11y pass on pane toggles.** `aria-pressed` and `aria-expanded` are used inconsistently across `Toolbar` and pane handles. Quick audit while we're touching the code.
- **T-78** **Strict TypeScript on event handlers.** `setShortcutsOpen: (open: boolean | ((prev: boolean) => boolean)) => void` in `useDocumentKeyDown` is a leaky React-internal shape. After T-43 it's gone — verify no other hooks expose `Dispatch<SetStateAction<T>>` in public types.
- **T-79** **`assertNever` callsites.** `useCommentCallbacks` and `useCommentOps` use `assertNever` for ADT exhaustiveness. After consolidation, ensure the store's switch statements still hit every case (TS will fail if not, but a deliberate test helps).
- **T-80** **Document StrictMode behavior.** `createStore` factories are called in render — make sure they're memoised with `useMemo` (or held in a ref) so StrictMode's double invocation does not create two stores per session. Add a comment + test.

---

## 4. Estimated size delta

| File | Now | After |
|---|---:|---:|
| `EditorHost.tsx` | 221 | ~80 |
| `CommentsSidebar.tsx` | 132 | ~60 |
| `useCommentCallbacks.ts` | 119 | **deleted** |
| `useCommentDrafts.ts` | 38 | **deleted** (folded into store) |
| `useCommentThreads.ts` | 73 | **deleted** (folded into store) |
| `CommentsContext.tsx` | 33 | **deleted** |
| `Toolbar.tsx` | 82 | ~55 |
| `useDocumentKeyDown.ts` | 33 | ~18 |
| `EditorView` props (`types.ts`) | 11 fields | 2–3 fields |
| new `createSessionStore.ts` | — | ~70 |
| new `createCommentsStore.ts` | — | ~170 |
| new `EditorSessionProvider.tsx` | — | ~50 |
| new `EditorLiveProvider.tsx` | — | ~70 |
| new `editor/identity/perms.ts` | — | ~10 |

Net: ~150 LOC deleted; 4 hooks/contexts → 2 stores + 2 providers; prop count on every leaf drops from 5–8 to 1–2.

---

## 5. Trade-offs / risks

- **Two providers vs one** *(r2)*: two providers cost one extra wrapper but isolate render storms from awareness. The single-provider approach in r1 was wrong.
- **Per-session stores via `createStore`** *(r2)*: required, not optional. Module singletons + key remount is the bug we're avoiding.
- **`doc.transact` wrapping** *(r2)*: required for any composed action. Adds 2 lines per action; pays back by collapsing observer storms.
- **Pane state stays persisted; tab state stays transient.** Deliberate. If users complain about losing tab choice on reload, persist the tab subset later — don't pre-empt.
- **`editorContext.ts` stays.** Synchronous reads from ProseMirror plugins and DOM event handlers cannot use React context. Document, don't delete.
- **Test rewrite risk** *(r2)*: T-58 has an explicit fallback (legacy shim hook for one PR cycle) so the comments PR doesn't grow unbounded.
- **StrictMode double-invoke** *(r2)*: `createStore` must be memoised. T-80 covers this with a test.

---

## 6. Order of operations

Phase 0 → 1 → 2 → 3 → 4 → 5 → 6, then optional Phase 7 follow-ups in their own PRs.

Phases 1, 2, 3, 4 are independently shippable. **Phase 5 lands as one PR** (the four hooks delete together), gated by T-66 profiler results. Phase 6 is cleanup-only.

---

## 7. Out of scope

- y-doc schema changes
- Backend / collab provider changes
- TipTap extension internals (only the React shell touching them is in scope)
- Visual / CSS changes (refactor must produce pixel-identical UI)
- New i18n keys (existing keys preserved; T-70 is a *drift* audit, not a content change)
- Suggestions store consolidation (T-75; separate refactor doc)

---

## Appendix A — Architecture diagram (text)

```
┌──────────────────────────────────────────────────────────────────────┐
│ EditorHost (mount/unmount on collab.id)                              │
│  ├─ useEditorBootstrap()  → collab, ready                            │
│  ├─ <EditorSessionProvider value={user, perms, bookId, collab,toast}>│
│  │   └─ <EditorLiveProvider> (per-session store)                     │
│  │        owns: editor, peers, suggesting                            │
│  │      └─ <SessionStoreProvider> (per-session store)                │
│  │           owns: activeCommentId, pendingNew, leftTab,             │
│  │                 rightTab, findOpen, shortcutsOpen                 │
│  │         └─ <CommentsStoreProvider> (per-session store)            │
│  │              owns: filter, drafts, composed ops (doc.transact)    │
│  │              └─ <EditorSession>  (UI tree only)                   │
│  │                                                                    │
│ Module-level (app-wide, persisted): paneStore                        │
│ Module-level (per-collab, ref-cell): editorContext.ts                │
│   ↳ read synchronously by ProseMirror plugins + DOM event handlers   │
└──────────────────────────────────────────────────────────────────────┘
```

## Appendix B — Decisions / pushbacks log

- **r2-pb-1** (codex): per-session lifetime ⇒ `createStore` per session, not module singletons. ✅ adopted.
- **r2-pb-2** (codex): missing `doc.transact` ⇒ wrap composed comment actions. ✅ adopted (T-51, T-53).
- **r2-pb-3** (codex): live signals (peers, suggesting) shouldn't share a context with stable session values ⇒ split providers. ✅ adopted.
- **r2-pb-4** (codex): T-44 needs upfront per-thread selectors + `shallow`. ✅ adopted (T-55).
- **r2-pb-5** (codex): T-03 missed `SuggestionsSidebar`. ✅ adopted (T-03a).
- **r2-pb-6** (codex): T-22 risked mobile drawer regression by hiding `narrow` inside the store. ✅ kept `narrow` explicit (T-30, T-32).
- **r2-pb-7** (codex): `editorContext` synchronous reads aren't only plugins (also `useEditorContextMenu`). ✅ documented (T-61).
- **r2-pb-8** (codex): T-35 was churn vs T-43. ✅ collapsed into T-45.
- **r2-pb-9** (codex): test rewrite realism ⇒ explicit shim fallback. ✅ documented (T-58).
