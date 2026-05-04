# Frontend simplification plan — component / container / hook by hook

> Companion to `docs/refactor-frontend.md`. That doc redesigns editor **state management** (per-session zustand stores, provider split, `doc.transact` boundaries). This doc is the **simplification** layer: dead code, duplications, prop hygiene, brittle effects, micro-refactors. Items are independently shippable and most are <50 LOC each. Where simplification depends on a refactor-frontend wave, it is annotated `[after T-XX]`.
>
> Numbering uses `S-NN` to avoid collision with `T-NN` in refactor-frontend.md.

---

## 0. Scope & non-overlap with refactor-frontend.md

| Concern | Owned by |
|---|---|
| Per-session zustand factories, `EditorLiveProvider`, `commentsStore`, `sessionStore` | refactor-frontend.md |
| `doc.transact` wrapping of composed comment ops | refactor-frontend.md (T-51) |
| `permsFor(role)` single source of truth | refactor-frontend.md (T-03) |
| Pane store ergonomics (`toggle`, `showSide`, `dismissBoth`) | refactor-frontend.md (T-30) — **already shipped** in `paneStore.ts` |
| Dead/duplicate small code, micro-effect cleanups, prop pruning beyond the state refactor | **this doc** |
| Cross-tree pattern unification (dialog hooks, cache invalidation hooks, badge components) | **this doc** |
| Suggestion / glossary / outline / versions panel internals | **this doc** (deferred sub-plans flagged at end) |
| Non-editor containers (admin, books, coordinator, auth, settings) | **this doc** |
| API client, i18n, routes, lib | **this doc** |

If a candidate appears in both docs, the refactor doc wins. This file flags the overlap.

---

## 1. Highest-leverage wins (read these first)

| # | What | Where | Impact |
|---|---|---|---:|
| **S-01** | Collapse 4 cache-invalidation hooks into one `useInvalidate(keyFn)` factory | `hooks/api/cache/*.ts` (4 files) + ~10 callers | −36 LOC, 4 files deleted |
| **S-02** | Unify `useConfirmDialog` + `useLinkPromptDialog` + `useFormDialog` into `useImperativeDialog<T>()` + a single `<ImperativeDialogHost>` | `components/feedback/*`, `hooks/useFormDialog.ts`, ~6 callers | −60 LOC, three near-identical promise/ref/state machines collapse to one |
| **S-03** | Merge `BookStatusBadge` + `CoordinatorStatusBadge` (and similar logic in `BookRow`) into one `<ActivityBadge>` | `containers/books`, `containers/coordinator` | −20 LOC, removes drift risk between two views of the same `bookAttention()` result |
| **S-04** | Consolidate `EditUserDialog` + `NewUserDialog` boilerplate (mutation + dialog lifecycle is identical) | `containers/admin/components/*` | −40 LOC |
| **S-05** | Delete `useEditorBootstrap` (3-line wrapper) and inline at single caller | `containers/editor/hooks/useEditorBootstrap.ts` | −11 LOC, removes the wrapper for one fewer hook to learn |
| **S-06** | Drop `_me: _me` in `BookRow`, `bookTitle?` in `EditorSkeleton` if unused, and other parameter graveyards | various | −small, but kills the "is this still needed?" tax |

Everything else in this doc is below this bar; reach for them after the above lands.

---

## 2. Editor — components

### 2.1 `EditorHost.tsx` (196 LOC)
Already targeted by refactor-frontend Phase 1–4. After waves land, the host is ~80 LOC. Simplification items **on top of** the refactor:

- **S-10** Inline the `expandLeft`/`expandRight`/`toggleLeft`/`toggleRight`/`drawerOpen` locals. Each is one call into `paneStore` already exposing `showSide`/`toggle`/`dismissBoth`. Once Phase 3 (T-31/T-32) lands, the closures are pure adapters — read directly from the store.
- **S-11** `leftTabLabels` + `rightTabLabels` records (lines 74–84) are computed every render but only consumed by `Toolbar`. Move into `Toolbar` itself (it already takes `t`) and drop both props (`leftPaneTab`, `rightPaneTab`). Falls out of T-44 but worth listing as a separate commit.
- **S-12** Effect at 69–72 dispatches `glossaryHighlight/refresh` whenever `glossaryEntries` change. Once `glossary` lives in `EditorLiveStore` (refactor doc T-23 follow-up or new T-2x), move this effect into `GlossaryHighlight` extension setup so the host stops knowing about ProseMirror dispatch.

### 2.2 `LeftPane.tsx` (138 LOC) / `RightPane.tsx` (95 LOC)
- **S-13** Both panes are switch-by-tab dispatchers. After T-42 lands (tabs in `sessionStore`), `tab` and `onTabChange` props disappear. The remaining body is one `<header>` + a `switch`. Trim each to <60 LOC.
- **S-14** `LeftPane` defines `OutlineGhostIcon` inline. If only used here, fine; if `OutlineSidebar` reuses, lift to a shared `icons.tsx` next to `EmptyState`.

### 2.3 `TopBar.tsx` (37 LOC)
- **S-15** `bookTitle` is read once and rendered. After session provider exposes book metadata, drop `bookTitle` prop entirely and read from context. (Currently `bookTitle` only flows through `EditorHost` → `TopBar` and `EditorSkeleton`.)

### 2.4 `BookTitleMenu.tsx` (119 LOC)
- **S-16** Confirm-dialog boilerplate (lines around 23–24, 38–42, 112–116) collapses with **S-02**.
- **S-17** This component does three things: title rename, immersive toggle, share menu. Each is small but lives in one file. Once over 120 LOC, split into `BookTitleRenameMenu`, `BookTitleShareMenu`, parent picks the right one. Defer until S-16 lands; the file shrinks first.

### 2.5 `UserMenu.tsx` (58 LOC)
- **S-18** Already minimal. Audit overlaps with `components/layout/AppTopBar.tsx`'s in-file `UserMenu` (lines 15–62 of `AppTopBar.tsx`) — the editor and the app-shell maintain two near-identical menus. Pull the shared bits into `components/layout/UserMenu.tsx` and have both places consume it.

### 2.6 `StatusBar.tsx` (90 LOC)
- **S-19** `WordCountTarget` + connection-status + peer-stack + suggesting-mode label are all crammed in one return. Split into 3 leaves: `<WordCountStat>`, `<ConnectionStat>`, `<PeerStat>`. Each <30 LOC, easier to memoize later.
- **S-20** Once `peers` and `suggesting` come from the live store (refactor T-22, T-23), drop those props.

### 2.7 `EditorSkeleton.tsx` (82 LOC)
- **S-21** Component receives `bookTitle?` and never renders it (verify). If unused, drop the prop. Otherwise add one `<h1>` and document.

### 2.8 `PageJumper.tsx` (85 LOC)
- **S-22** Two `useEffect` blocks (lines ~18–36) both keyed on `[open]`. Merge into one effect: when `open` flips on, reset draft + add listeners; cleanup removes listeners. Saves ~5 LOC and avoids ordering surprises.

### 2.9 `EmptyState.tsx`
Already minimal. No action.

### 2.10 Comments subtree
The whole subtree (`components/comments/**`) is the subject of refactor-frontend Phase 5. After Phase 5:
- `CommentsSidebar` shrinks from 130 → ~60 LOC.
- `CommentsContext.tsx` is **deleted** (T-57).
- `useCommentCallbacks.ts`, `useCommentDrafts.ts`, `useCommentThreads.ts` are **deleted**.
- `CommentThreadCard`, `ThreadHeader`, `ThreadEditor`, `ThreadReplies`, `CommentReply` take only `threadId` (T-56).

Simplification items **on top of** Phase 5:
- **S-30** `CommentAnchors.tsx` (124 LOC) uses `threadChangeKey()` + `eslint-disable-line react-hooks/exhaustive-deps` (around line 52) to defeat the unstable-thread-array dep. Once `useThreads` is replaced by store selectors with `shallow`, the workaround disappears — delete the helper.
- **S-31** `OpenCommentList.tsx` wraps each card in `<div ref={el => { cardsRef.current[id] = el; }}>`. Inline ref creation is fresh every render. Either: (a) move scroll-into-view to a single `useLayoutEffect` keyed on `activeCommentId` that does `document.querySelector('[data-thread-id=...]')`, eliminating the ref map, or (b) build a stable factory `(id) => useCallback`. Option (a) is shorter.
- **S-32** `MentionTextarea.tsx` (129 LOC) is two units in one file: `MentionTextarea` component + `buildCandidates` selector. `buildCandidates` is consumed by `CommentsSidebar`. Move `buildCandidates` into a small `mentionCandidates.ts` so the textarea file is purely UI.
- **S-33** `Reactions.tsx` (61 LOC) holds a hardcoded emoji list. Pull into `editor/comments/reactions.ts` next to existing reaction logic; the component imports the constant. Trivial, removes one source of drift.
- **S-34** `ResolvedThreadCard.tsx` confirm-dialog boilerplate folds into **S-02**.
- **S-35** `previewBody` in `CommentThreadCard.tsx` (lines 12–16) and any equivalent in resolved card duplicate ellipsis logic. Move to `editor/comments/format.ts` (next to the existing glossary `format.ts`). One function, two callers.

### 2.11 Versions subtree (`components/versions/**`)
Six files, ~250 LOC total. Not surveyed by refactor-frontend.md; treat as a sub-plan.
- **S-40** `VersionsPanel.tsx` confirm-dialog boilerplate folds into **S-02**.
- **S-41** `MarkdownDiffView.tsx` and `DiffMarkdownView.tsx` — the two filenames are confusing (one is a wrapper around the other). Rename one or merge.
- **S-42** `useAutoSnapshot` hook + `useVersions` hook + `VersionsPanel` carry overlapping responsibilities (debounce a snapshot vs. produce snapshots). Mark as a follow-up: schedule a `refactor-versions.md` if this grows beyond the ~150 LOC budget. Out of scope for first pass.

### 2.12 Glossary / Meta / Outline panels
- **S-50** `GlossaryPanel.tsx` exports `useGlossary(doc)` hook (a y-map observer) **and** the panel UI. Split: `editor/glossary/useGlossary.ts` (hook, used by `EditorHost.tsx:59`) + `containers/editor/components/glossary/GlossaryPanel.tsx` (UI only). Removes the back-channel where panel and host both import from the same UI file.
- **S-51** `MetaPanel.tsx` — survey shows it's a thin form wrapper. After S-02 lands, audit whether it needs its own dialog state.
- **S-52** `OutlineSidebar.tsx` — DOM traversal + active-heading tracking. Acceptable as-is. Schedule deeper rework as `refactor-outline.md` if it grows.

### 2.13 `peers/PeerAvatarStack.tsx`
- **S-60** Component runs `setInterval(..., TICK_MS)` to refresh "idle X minutes" labels. Drop the interval entirely: idle-since is a pure function of `lastActiveAt` + current time, computed at render. Re-render is already triggered when peers update. Worst case the label is stale for one peer-tick.

### 2.14 `status/SyncMini.tsx`
Already lean. No action.

### 2.15 Suggestions sidebar
- **S-70** Out of scope for this pass. File `refactor-suggestions.md` if/when worked on (refactor-frontend T-75 already flags this).

---

## 3. Editor — hooks (`containers/editor/hooks/**`)

24 hooks. Most are correct; this is a hygiene pass.

| Hook | LOC | Action |
|---|---:|---|
| **S-80** `useEditorBootstrap.ts` | 11 | **Delete**. Inline at the single caller in `EditorHost`. (Refactor T-73 also flags this.) |
| **S-81** `useDocumentKeyDown.ts` | 33 | After T-43 (sessionStore), takes no args. Trim further: read store, register listeners, done. Public type stops exposing `Dispatch<SetStateAction<T>>` (refactor T-78). |
| **S-82** `useCommentOps.ts` | 119 | Becomes `createCommentsStore` actions (refactor T-51). The pure `createCommentOps(doc, user)` factory at line 14 stays and is reused by the store; the `useMemo` wrapper hook is deleted. |
| **S-83** `useCommentDrafts.ts` | 38 | **Delete** — folded into store (refactor T-50). |
| **S-84** `useCommentThreads.ts` | 73 | **Delete** — folded into store (refactor T-50). The pure filter selectors (`filterByStatus`, `filterByAuthor`, etc.) move to `editor/comments/filters.ts`. |
| **S-85** `useCommentCallbacks.ts` | 119 | **Delete** — replaced by store selectors (refactor T-56/T-57). |
| **S-86** `usePeers.ts` | 52 | After T-22, called once inside `EditorLiveProvider`. Component-level callers gone. No internal change. |
| **S-87** `useSuggestingMode.ts` | 51 | After T-23, called once inside `EditorLiveProvider`. No internal change. |
| **S-88** `usePageNavigation.ts` | 103 | Internal DOM math is necessary. Verify the `setInterval` (if any) is gated on `editor` mount. No changes. |
| **S-89** `useVersions.ts` | 103 | OK. Schedule `refactor-versions.md` for deeper rework. |
| **S-90** `useConnectionStatus.ts` | 82 | Reads `provider` events. Verify cleanup unsubscribes. No changes. |
| **S-91** `useDocumentImport.ts` / `useDocumentExport.ts` | 64 / 50 | Both are imperative one-shot helpers consumed by `BookTitleMenu`. After S-17 (menu split), keep co-located with the menu file or move to `editor/io/`. Pick one home. |
| **S-92** `useAutoSnapshot.ts` | 49 | OK. Tied to versions sub-plan. |
| **S-93** `useReadingStats.ts` | 35 | Pure derivation over `editor.state.doc`. After live store, read editor from store. No code changes. |
| **S-94** `useTargetWords.ts` | 17 | Pure helper. No changes. |
| **S-95** `useEditorHeadings.ts` | 23 | Observer over y-map. No changes. |
| **S-96** `useNarrowLayout.ts` | 22 | Single-callsite hook (twice in editor). Acceptable as a hook because it owns a `matchMedia` listener. No changes. |
| **S-97** `useFontsReady.ts` | 21 | OK. |
| **S-98** `useInitialSync.ts` | 39 | OK. |
| **S-99** `useMentionDetection.ts` | 42 | OK. |
| **S-100** `useCollabSession.ts` | 19 | OK. |

Net hook deletions after refactor + this doc: 4 hooks (`useEditorBootstrap`, `useCommentDrafts`, `useCommentThreads`, `useCommentCallbacks`). `useCommentOps` keeps its pure factory and loses its hook wrapper.

---

## 4. Editor — stores

- **S-110** `paneStore.ts` already exposes `toggle`/`showSide`/`dismissBoth` (refactor T-30 shipped). One follow-up: `paneClass(side, state)` (line 61) returns `pane-${side}-open` for Expanded but `pane-${side}-${state}` otherwise — two casing rules in one helper. Pick one (`pane-${side}-${state}` always; rename CSS) for one less special case.
- **S-111** `createLiveStore.ts` (43 LOC) — clean factory. Verify it is `useMemo`d at the call site so StrictMode does not create two stores per session (refactor T-80 owns this; cross-link).
- **S-112** Once Phase 4–5 land, add `containers/editor/stores/README.md` (refactor T-02 owns this) describing: persisted (`paneStore`) vs. per-session (`liveStore`, `sessionStore`, `commentsStore`); how they compose; where `editorContext.ts` ref-cell fits.

---

## 5. Editor — `editor/tiptap/**`

### 5.1 `EditorView.tsx` (137 LOC) and `types.ts`
- **S-120** Today: 5 props (`collab`, `activeCommentId`, `glossaryEntries`, `onActiveCommentChange`, `onCreateComment`). After refactor T-60, two of those become direct store calls, leaving `collab` + `glossaryEntries`. Once glossary is in the live store too, the prop interface is `{ collab }` — at which point `EditorView` could read `collab` from session context and the prop disappears entirely. Open question: is the explicit prop still useful for tests? If not, delete.

### 5.2 `Toolbar.tsx` (82 LOC)
- **S-121** After refactor T-23 (suggesting in store) + T-44 (tabs in store), `Toolbar` props collapse to `{ editor }`. The component then becomes a layout wrapper around four `Zone` components. Trim to ~50 LOC.
- **S-122** `leftTabLabels` / `rightTabLabels` derivation (currently in `EditorHost`) moves into `Toolbar` per **S-11**.

### 5.3 `editorContext.ts`
- **S-123** Document the synchronous-read sites at the top of the file (refactor T-61 owns this). No code change.

### 5.4 Toolbar zones
- **S-124** `PaneToggleZone.tsx`, `BlockFormattingZone.tsx`, `InsertZone.tsx`, `TextFormattingZone.tsx` — each currently takes individual props. After zones read directly from `paneStore` and `liveStore`, props are mostly `{ editor }`. Audit whether `PaneToggleZone` still needs `user`/`perms` once stable session context is in place — they read from context.

---

## 6. Non-editor — containers

### 6.1 `containers/admin/**` (~250 LOC across 7 files)
- **S-130** `EditUserDialog.tsx` + `NewUserDialog.tsx` share the entire structure: `useFormDialog` + mutation + toast + invalidate. Extract `useUserMutation({ mode: 'create' | 'edit' })` + a single `<UserDialog mode=...>` component. Consumes `UserFormFields`. **−40 LOC.** [S-04 in the top wins table.]
- **S-131** `UsersPage` → `UsersTable` → `UserRow` → `[EditUserDialog, DeleteUserButton]` thread an `onChanged: () => void` callback. After **S-01** (cache invalidation factory), `DeleteUserButton` and `EditUserDialog` invalidate directly; `onChanged` prop disappears top-to-bottom. **−4 callsites.**
- **S-132** `useUserForm.ts` `stringToTags`/`tagsToString` — move to `lib/strings.ts` if reused; otherwise inline.
- **S-133** `SystemRoleBadge.tsx` has a TODO about promoting to a `SystemRole` enum. Either do it (small) or delete the TODO. Don't leave hand-written enum drift.

### 6.2 `containers/auth/**`
- **S-140** `LoginPage.tsx` (47 LOC) + `useLoginForm.ts` (38 LOC) are clean. No action.
- **S-141** `DevQuickLogin.tsx` is dev-only behind `import.meta.env.DEV`. Audit that it's tree-shaken in prod build (build size check from refactor T-67 covers this).

### 6.3 `containers/books/**`
- **S-150** `BookRow.tsx`: `me: _me` parameter is unused (`_` prefix). Remove. **[S-06]**
- **S-151** `BookStatusBadge.tsx` collapses with `CoordinatorStatusBadge.tsx` per **S-03**.
- **S-152** `BookEditorPage.tsx` (23 LOC) — just renders `<EditorHost>` with route params. OK.

### 6.4 `containers/coordinator/**`
- **S-160** `useBooksDashboard` returns 8 fields; the filter-setter object (around lines 28–33) is rebuilt every render. Stabilise with `useCallback` per setter or hoist setters into a `useReducer`.
- **S-161** Split `useBooksDashboard` into `useBooksDashboardData` (query + KPI derivation) and `useBooksDashboardFilters` (filter state + persistence). Filters live in `localStorage` already — wrap with `useLocalStorageState` instead of bespoke effect.
- **S-162** `BooksList.tsx` `BooksListRow` `memo` uses a custom comparator (around lines 67–72) that hand-checks `stageDraft`/`progressDraft`. Replace by passing stable handlers (post **S-160**) and let `memo` shallow-compare normally. Custom comparators rot.
- **S-163** Three `<FilterChip>` groups in `CoordinatorDashboard` share structure. Extract `<FilterChipGroup label options active onChange />`. **−10 LOC** in the dashboard.
- **S-164** `NewBookPage.tsx` (44 LOC) — uses `useNewBookForm`. After **S-02** + a generic `useFormState`, audit whether the bespoke hook still earns its keep.

### 6.5 `containers/settings/SettingsPage.tsx`
- **S-170** Single-tab `<Tabs>` wrapper (lines ~23–27 and ~57). Drop `<Tabs>` until a second tab exists. **−4 LOC.**
- **S-171** Color and image fields are repeated `<Label>` + input boilerplate. Once `<ColorField>` / `<ImageField>` exist (sharable with profile/admin), replace.

---

## 7. Shared — `components/**`

### 7.1 Feedback (`components/feedback/**`)
- **S-180** Unify three dialog hooks per **S-02**. Concrete shape:

  ```ts
  // hooks/useImperativeDialog.ts
  export function useImperativeDialog<T = boolean>() {
      const [state, setState] = useState<DialogState<T> | null>(null);
      const resolveRef = useRef<((v: T) => void) | null>(null);
      const open = (opts: DialogOptions<T>) => new Promise<T>((resolve) => {
          resolveRef.current = resolve;
          setState({ ...opts });
      });
      const settle = (value: T) => { resolveRef.current?.(value); resolveRef.current = null; setState(null); };
      return { state, open, settle };
  }
  ```

  Plus a `<ImperativeDialogHost dialog={...} />` rendering by `state.kind` (`'confirm' | 'prompt' | 'form'`). All call sites become `await dlg.open({ kind: 'confirm', title, destructive })`.

- **S-181** `EmptyState.tsx` is fine.
- **S-182** `PresenceDot.tsx` — only consumer is `PeerAvatarStack`. If still single-callsite, inline; otherwise leave.

### 7.2 Avatars
- **S-190** `components/Avatar.tsx` is the canonical implementation. `editor/shell/Avatar.tsx` re-exports it. Keep the re-export (back-compat) but flag for deletion when the editor namespace no longer requires it.

### 7.3 Badges
- **S-200** Two status-by-attention badges (`BookStatusBadge`, `CoordinatorStatusBadge`) collapse per **S-03** into `<ActivityBadge book={book} variant?="book" | "coordinator">`. Variant only affects label namespace.
- **S-201** `RoleBadge` (book role) and `SystemRoleBadge` (system role) read from different i18n namespaces. Keep separate; do **not** unify — semantics differ. Add a one-line file comment to each so the next reader doesn't try.

### 7.4 Layout
- **S-210** `AppTopBar.tsx` defines an in-file `UserMenu` (~lines 15–62) that duplicates `containers/editor/components/UserMenu.tsx`. Extract once into `components/layout/UserMenu.tsx`, both consumers import. **−~30 LOC.**
- **S-211** Hardcoded nav links in `AppTopBar` (`/books`, `/coordinator`, `/settings`) — TanStack Router can give type-safe `<Link to="/coordinator" />`. Already in use? If yes, keep. If raw strings, fix.

### 7.5 People picker
- **S-220** `RoleSelect` lives inside `PeoplePickerFields.tsx` (~lines 35–52). Lift to `components/selects/RoleSelect.tsx`; `UserFormFields.tsx` (admin) reuses.
- **S-221** `usePeoplePickerState` will share state shape with the unified imperative dialog after **S-02**. Audit at that point; may collapse further.

### 7.6 Tables
- **S-230** `DataTable.tsx` is generic. Audit whether `UsersTable.tsx` and `BooksList.tsx` use it consistently. If both rebuild their own table grid, point them at `DataTable`. Defer until measured.

### 7.7 Forms
- **S-240** `ReadOnlyField.tsx` is fine.

---

## 8. Shared — hooks (`hooks/**`)

### 8.1 Cache invalidation (`hooks/api/cache/**`)
**S-01 (top win).** Today:

```ts
// useInvalidateBooks.ts
export function useInvalidateBooks() {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: booksListQueryKey() });
}
```

…and three other files identical to within a key name. Replace with:

```ts
// hooks/api/cache/useInvalidate.ts
export function useInvalidate(keyFn: () => readonly unknown[]) {
    const qc = useQueryClient();
    return () => qc.invalidateQueries({ queryKey: keyFn() });
}
```

Call sites:

```ts
const invalidateBooks = useInvalidate(booksListQueryKey);
const invalidateUsers = useInvalidate(usersListQueryKey);
```

Delete `useInvalidateBooks.ts`, `useInvalidateUsers.ts`, `useInvalidateBookAssignments.ts`, `useInvalidateMe.ts`. **−36 LOC, −4 files.** Risk: low; the four named hooks have one job each.

### 8.2 Form hooks
- **S-250** `useLoginForm` (RHF + zod), `useNewBookForm` (useState), `useProfileSettings` (useState + query + mutation + dirty). Extract a shared `useFormState<T>` for the useState-based ones:

  ```ts
  export function useFormState<T extends object>(initial: T) {
      const [values, setValues] = useState(initial);
      const setField = <K extends keyof T>(k: K, v: T[K]) => setValues(prev => ({ ...prev, [k]: v }));
      const reset = () => setValues(initial);
      return { values, setValues, setField, reset };
  }
  ```

  Use in `useNewBookForm`, `useProfileSettings`. **−~15 LOC.** Don't touch `useLoginForm` — RHF is a different shape and works.

### 8.3 `hooks/useFormDialog.ts`
- **S-260** Folds into **S-02** (imperative dialog).

### 8.4 React utils
- **S-270** `useStableCallback`, `useDebouncedEffect`, `withStop` — keep. `useDebouncedEffect` includes `ms` in deps; if changing `ms` should not re-fire the effect, drop it from deps and document. Two-line change.

### 8.5 Storage
- **S-280** `useLocalStorageState.ts` is fine. Consume from coordinator filters per **S-161**.

---

## 9. `lib/**`

- **S-290** `lib/dates.ts:5` re-exports `MISSING_DATE_DAYS` from `lib/constants.ts`. Pick one home. Same for `lib/status.ts:6` re-exporting `allowedNextStages` from `lib/stage.ts`. Drop the indirection — barrels rot.
- **S-291** `lib/auth.ts` predicates (`isAdmin`, `isProjectManager`, `canAccessCoordinator`, `canAccessAdmin`, `canCreateBooks`) are explicit and fine. Do **not** generalise to `can(user, permission)` — the named predicates are easier to grep and refactor. Keep.
- **S-292** `lib/roleI18n.ts` (14 LOC) — verify callers; if only one or two, inline. Otherwise keep.
- **S-293** Test files (`*.test.ts`) co-located in lib are fine.

---

## 10. `routes/**`

- **S-300** `_app.tsx` `beforeLoad` does manual session fetch + redirect. Other guarded routes reproduce the same shape. Extract `protectedBeforeLoad` (or `requireSession`) factory; routes call it.
- **S-301** `lib/routes.ts:isImmersiveRoute(pathname)` does string matching. TanStack Router supports per-route metadata. Add `meta: { immersive: true }` to the editor route and read `useMatches()` instead of comparing strings. Type-safe and survives renames.
- **S-302** `routes/_public/login.tsx` — verify it reads the `next` query param and routes back. If shared with `_app` redirect, factor.

---

## 11. `api/**` and `app/**`

- **S-310** `api/interceptors.ts` uses module-level `refreshPromise` + `WeakSet retried` for dedup. Correct, but document at top of file: "do not attach interceptors twice — registration is idempotent only because `retried` is module-scoped." Two-line comment, prevents future foot-guns.
- **S-311** `app/queryClient.ts` defaults are reasonable. No changes.
- **S-312** `app/router.ts` — check it constructs the router once (not per-render). No changes if so.

---

## 12. `i18n/**`

- **S-320** `LanguageSwitcher.tsx` calls `localStorage.setItem` manually around line 8. If `i18next-browser-languagedetector` is configured with `lookupLocalStorage`, the persistence is automatic — drop the manual write. **Verify by reading `i18n/index.ts` config**, then delete one line.
- **S-321** Audit `public/locales/{en,pl,ua}/*.json` for orphan keys after refactor-frontend lands (T-70 does an additions-only check; this is a removals check). Out of scope until refactor stabilises.

---

## 13. Cross-tree unifications (recap)

The four cross-tree wins, in priority order:

1. **`useInvalidate(keyFn)` factory** → 4 hooks deleted [**S-01**]
2. **`useImperativeDialog<T>` + `<ImperativeDialogHost>`** → 3 hooks + 2 hosts collapse to 1 + 1 [**S-02**]
3. **`<ActivityBadge>`** → `BookStatusBadge` + `CoordinatorStatusBadge` collapse [**S-03**]
4. **`<UserDialog mode>` + `useUserMutation`** → `EditUserDialog` + `NewUserDialog` collapse [**S-04**]

Smaller cross-tree pickups: shared `<UserMenu>` (S-210), shared `<RoleSelect>` (S-220), shared `useFormState` (S-250).

---

## 14. Order of operations

**Independent of refactor-frontend.md (ship anytime):**

- S-01 (cache invalidation factory)
- S-02 (imperative dialog) — touches several files; sequence first because S-04, S-16, S-34, S-40 all depend on it
- S-03 (activity badge unification)
- S-05 (delete `useEditorBootstrap`)
- S-06 (param graveyard sweep)
- S-22 (`PageJumper` effect merge)
- S-30/S-31 (only after refactor T-50, since they depend on the store)
- S-60 (PeerAvatarStack interval drop) — after refactor T-22
- S-150 (`BookRow _me` cleanup)
- S-160–S-163 (coordinator dashboard split)
- S-170 (settings tabs)
- S-180 (already same as S-02)
- S-200 (badge unification — same as S-03)
- S-210 (shared `<UserMenu>`)
- S-220 (shared `<RoleSelect>`)
- S-290 (barrel cleanup)
- S-300/S-301 (route guard + immersive meta)
- S-310 (interceptor doc comment)
- S-320 (LanguageSwitcher manual persist)

**Blocked on refactor-frontend.md waves:**

- S-13/S-14 (after T-42)
- S-15 (after stable session context)
- S-19/S-20 (after T-22, T-23)
- S-30–S-35 (after Phase 5 — store-driven comments)
- S-50 (after T-23 follow-up adding glossary to live store)
- S-80 (after refactor lands; deletion is then trivial)
- S-83/S-84/S-85 (Phase 5 deletion targets)
- S-110 (`paneClass` only after CSS classes audited)
- S-120/S-121 (after T-60, T-23, T-44)

**Out of scope for this pass (separate docs):**

- `refactor-suggestions.md` — Suggestions sidebar deep dive
- `refactor-versions.md` — Versions panel + auto-snapshot consolidation
- `refactor-outline.md` — Outline DOM traversal
- `refactor-glossary.md` — Glossary store + extension pairing (after S-50)
- `refactor-admin.md` / `refactor-coordinator.md` if any container exceeds 200 LOC after this pass

---

## 15. Estimated size delta

| Bucket | LOC delta |
|---:|---:|
| Cache invalidation hooks (S-01) | −36 |
| Imperative dialog unification (S-02 + dependents) | −60 |
| Activity badge (S-03) | −20 |
| User dialog (S-04) | −40 |
| Hook deletions overlapping with refactor-frontend (S-80 + Phase 5) | −240 |
| Smaller wins (S-22, S-60, S-150, S-170, etc.) | −40 |
| New shared modules (`useInvalidate`, `useImperativeDialog`, `<ActivityBadge>`, `<UserDialog>`, `useFormState`) | +120 |
| **Net** | **≈ −300 LOC** |

---

## 16. Risks

- **Dialog unification (S-02) is wide.** Touches admin, books, coordinator, comments, versions, and editor menus. Land it as one PR with a working compatibility shim from old hook names to new (`export const useConfirmDialog = legacyConfirmShim(useImperativeDialog)`) and delete the shim two PRs later. Same playbook as refactor-frontend T-58.
- **Cache invalidation factory (S-01) needs a TS audit.** Today's hooks return `() => Promise<void>`; the generic must return the same. Add a type test to `useInvalidate` so callers don't silently get `Promise<unknown>`.
- **Coordinator dashboard split (S-161).** Persisting filter state in localStorage will collide with any tab-open in another window. Use a versioned key (`coordinator-filters.v1`) and a write debounce.
- **Shared `<UserMenu>` (S-210).** Editor menu has more items (e.g. immersive mode toggle) than app-shell menu. Build the shared piece around the smaller surface and let the editor inject extra items via a `slot` prop. Don't let the merge regress the smaller menu.
- **`isImmersiveRoute` → route meta (S-301).** Touches every layout that hides chrome on the editor page. Roll out behind a feature flag if there's any doubt.

---

## 17. Acceptance gates

- **G-A** TypeScript build green at every PR boundary.
- **G-B** Bundle size from `npm run build`: each cross-tree unification PR is net-zero or smaller (gzip delta in PR description).
- **G-C** Vitest + Playwright suites green.
- **G-D** Manual smoke test list (parallel to refactor-frontend T-65):
  - Login, logout, dev-quick-login.
  - Book list / new book / open editor / rename book.
  - Coordinator filters: each chip toggle, persistence across reload.
  - Admin: create user, edit user, delete user (confirm dialog).
  - People picker: open, select, save.
  - Editor: comment, reply, resolve, delete (confirm dialog), versions snapshot + diff modal.
  - Language switcher across all three locales.
- **G-E** Per-PR diff: net LOC negative or justified (with new shared module).

---

## 18. Out of scope

- y-doc schema / collab provider changes
- Backend
- TipTap extension internals
- CSS / visual changes (refactor must be pixel-identical)
- New i18n strings (drift audit only, owned by refactor-frontend T-70)
- Full rewrite of suggestions, versions, outline, glossary panels (deferred follow-up docs)

---

## Appendix — task ID index

`S-01` invalidation • `S-02` imperative dialog • `S-03` activity badge • `S-04` user dialog • `S-05` delete useEditorBootstrap • `S-06` param graveyard • `S-10`–`S-21` editor host/panes/skeleton • `S-22` PageJumper effects • `S-30`–`S-35` comments leaves • `S-40`–`S-42` versions sub-plan • `S-50`–`S-52` glossary/meta/outline • `S-60` PeerAvatarStack • `S-70` suggestions deferred • `S-80`–`S-100` editor hooks • `S-110`–`S-112` editor stores • `S-120`–`S-124` tiptap shell • `S-130`–`S-133` admin • `S-140`–`S-141` auth • `S-150`–`S-152` books • `S-160`–`S-164` coordinator • `S-170`–`S-171` settings • `S-180`–`S-182` feedback components • `S-190` avatar • `S-200`–`S-201` badges • `S-210`–`S-211` layout • `S-220`–`S-221` people picker • `S-230` table • `S-240` form • `S-250`–`S-280` shared hooks/storage/utils • `S-290`–`S-293` lib • `S-300`–`S-302` routes • `S-310`–`S-312` api/app • `S-320`–`S-321` i18n
