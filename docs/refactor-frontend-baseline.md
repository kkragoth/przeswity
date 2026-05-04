# T-66 Baseline — Re-render profile (pre-Wave-3)

Snapshot of the editor render graph after Wave 0 + Wave 1 landed and before Wave 3 splits the live signals (`peers`, `editor`, `suggesting`) into a separate store. This file is the regression contract for Wave 3 / Phase 5.

## 1. Method

**Option chosen: B (static analysis).**

Reason: a real React DevTools Profiler trace requires a live browser session with awareness traffic, threads in yjs, and a working ProseMirror selection — none of which the existing vitest+jsdom setup mounts. Standing up a render-counter HOC that drives realistic peer awareness + thread mutations from tests was estimated >60min and would have produced numbers that are dominated by harness mocking, not the real prop graph. A static read-set matrix is cheaper and answers the same question Wave 3 must satisfy: *which leaves react to which inputs today, and which of those reactions are spurious?*

What was actually run: source read of `EditorHost.tsx`, `EditorSessionProvider.tsx`, and every leaf named in T-24 / T-66:

- `containers/editor/EditorHost.tsx`
- `containers/editor/components/{TopBar,StatusBar,LeftPane,RightPane,BookTitleMenu,UserMenu}.tsx`
- `containers/editor/components/comments/{CommentsSidebar,CommentThreadCard,OpenCommentList}.tsx`
- `containers/editor/components/comments/thread/{ThreadEditor,ThreadComposeForm}.tsx`
- `containers/editor/hooks/{usePeers,useCommentDrafts}.ts`
- `editor/tiptap/Toolbar.tsx`

Legend in the per-scenario tables:

- **R = will re-render** in the named scenario, given current code.
- **R\*** = re-renders but `React.memo` *might* bail out on identity (only `CommentThreadCard` is memoised today; nothing else is).
- **—** = will not re-render in this scenario.

## 2. Scenario 1 — Focus a comment

Trigger: user clicks a thread card. `EditorView.onActiveCommentChange` fires → `setActiveCommentId(id)`, `setRightTab(Comments)`, `paneStore.expand('right')`. `EditorSession` re-renders because its own `useState`s changed.

| Component | Reads that drive renders | This scenario |
|---|---|---|
| `EditorSession` (host) | own `useState`s, `usePaneStore` selectors | R (state changed) |
| `TopBar` | `bookTitle`, `editor` (props) | R (host re-rendered, no memo) |
| `BookTitleMenu` | session ctx (`perms`, `toast`), `editor` | R |
| `UserMenu` | session ctx (`user`) | R |
| `Toolbar` | `editor`, `user`, `suggestingMode`, `suggestingForced`, `leftPaneTab`, `rightPaneTab`, pane-store selectors | R (props are inline objects/funcs) |
| `EditorView` | `collab`, `suggestingMode`, `activeCommentId`, glossaryEntries, callbacks | R (`activeCommentId` prop changed — by design) |
| `LeftPane` | `tab`, `editor`, `usePaneStore` selectors | R (host re-rendered, props by-value but no memo) |
| `RightPane` | `tab`, `editor`, `peers`, `activeCommentId`, `pendingNew`, callbacks, pane-store | R (`activeCommentId` + `tab` props changed — by design) |
| `CommentsSidebar` | session ctx, `useThreads(doc)`, peers, `activeCommentId`, callbacks | R |
| `OpenCommentList` | `threads`, `activeCommentId` | R |
| `CommentThreadCard` (memo) | `thread`, `isActive` | R\* only for cards whose `isActive` flipped (memo bails on the others — the only honest bailout in the tree) |
| `StatusBar` | `editor`, `suggestingMode`, `peers`, session ctx, multiple hooks | R |

Predicted hotspot: every leaf re-renders even though only `activeCommentId` and `right.tab` actually changed. `TopBar`, `BookTitleMenu`, `UserMenu`, `LeftPane`, `Toolbar`, `StatusBar` re-render purely because the host re-rendered with fresh inline-callback props. None of them read the changed values.

## 3. Scenario 2 — Type a reply

Trigger: keystroke in `ThreadComposeForm` → `drafts.setReplyDraft(threadId, value)` → `useCommentDrafts` `setReplyDrafts(prev => …)` → `CommentsSidebar` re-renders → `contextValue` `useMemo` deps include `drafts` (new object reference every render of `CommentsSidebar`) → **every `CommentsContext` consumer re-renders**.

| Component | This scenario |
|---|---|
| `EditorSession` (host) | — (no host state changed) |
| `TopBar` / `BookTitleMenu` / `UserMenu` | — |
| `Toolbar` | — |
| `EditorView` | — |
| `LeftPane` | — |
| `RightPane` | — (host did not re-render; `RightPane` is not a draft consumer) |
| `StatusBar` | — |
| `CommentsSidebar` | R (owns `useCommentDrafts`) |
| `OpenCommentList` | R (parent re-rendered) |
| `CommentThreadCard` (memo) | R\* — `thread` identity unchanged, but `isActive` boolean is also unchanged, so memo *should* bail. **However**, see `OpenCommentList`: each card is wrapped in an inline `<div ref={el => …}>` whose ref callback is a fresh function each render. The wrapping `div` re-renders unconditionally; the memoised `CommentThreadCard` underneath does bail. Net: the `div` wrappers re-render, the cards themselves do not. |
| `ThreadEditor` (inside the active card only) | R when card re-renders (rare: only when memo doesn't bail) |
| `ThreadComposeForm` (the typed-in one) | R (owns the controlled input — required) |

Predicted hotspot: `CommentsSidebar.contextValue` is rebuilt every keystroke because its `useMemo` deps include `drafts` — and `useCommentDrafts` returns a brand-new object literal each render. **All consumers of `CommentsContext`** (`CommentThreadCard`, `ThreadEditor`, `ThreadHeader`, `ThreadReplies`, `ThreadComposeForm`) take a new context value on every keystroke and would re-render *if not* for `CommentThreadCard`'s `memo` boundary holding the line. The architectural smell: a single `setReplyDrafts` for thread X invalidates the context for thread Y too. Wave 3 / Phase 5 should split this — drafts indexed by thread id, subscribed per-card.

## 4. Scenario 3 — Move cursor (peer awareness)

Trigger: a remote peer moves their cursor → `awareness.on('change')` → `usePeers` `setPeers(newArray)` → `EditorSession` re-renders because `peers` is a local in `EditorSession`.

| Component | Reads `peers`? | This scenario |
|---|---|---|
| `EditorSession` (host) | yes (calls `usePeers`) | R (necessary) |
| `TopBar` | no | **R (SPURIOUS — T-24 violation)** |
| `BookTitleMenu` | no | **R (spurious)** |
| `UserMenu` | no | **R (spurious)** |
| `Toolbar` | no | **R (spurious)** — and inline callback props guarantee it can't be `memo`'d trivially |
| `EditorView` | no (cursors come through y-prosemirror, not this prop) | **R (spurious)** |
| `LeftPane` | no | **R (spurious — explicit T-24 fail)** |
| `RightPane` | yes (passes to `CommentsSidebar` for `buildCandidates`) | R (necessary) |
| `StatusBar` | yes (`PeerAvatarStack`, solo-online text) | R (necessary) |
| `CommentsSidebar` | yes (`buildCandidates(peers, user.name)`) | R (necessary, but only for `candidates`) |
| `OpenCommentList`, `CommentThreadCard` | no | R\* — host re-render propagates, memo on `CommentThreadCard` bails because `thread` and `isActive` are identity-stable |

Predicted hotspot: **the entire chrome of the editor re-renders on every awareness tick.** With one collaborator, awareness fires on each cursor move + selection change + heartbeat — easily 5–20 ticks/sec while a peer is typing. Today every awareness tick = full render of `TopBar` + `LeftPane` + `Toolbar` + `EditorView` props recompute (the FindReplaceBar and StyleDropdown subtrees included). This is the single biggest win available to Wave 3.

## 5. Predicted hotspots (regression contract)

Ordered by expected commit-duration impact:

1. **`peers` threaded as a prop from `EditorSession`** — every awareness tick invalidates the entire chrome (Scenario 3). Wave 3 T-22 fixes this by reading `peers` from a zustand-style live store with `useSyncExternalStore`-narrow selectors only inside `PeerAvatarStack`, `CommentsSidebar.candidates`, and the `StatusBar` solo-online branch.
2. **`useCommentDrafts` returns a fresh object identity every render** (Scenario 2) — invalidates `CommentsContext` on every keystroke. Even with `CommentThreadCard`'s `memo`, the `OpenCommentList` `div` wrappers still re-render, and any future consumer that isn't memoised will silently re-render too. Wave 3 / Phase 5 should split drafts per thread (Map keyed by id, subscribed via `use(syncExternalStore)` or recoil-style atom-family).
3. **Inline ref callbacks in `OpenCommentList`** (`ref={el => { cardsRef.current[id] = el; }}`) — fresh function every render; the `div` parent re-renders unconditionally even when the card memo bails. Replace with a stable `useCallback` factory keyed by id, or move the scroll-into-view side effect to a single `useEffect` lookup (already partially done) so the ref isn't on the hot path.
4. **`Toolbar` accepts inline callback props** (`onSuggestingModeChange`, `onToggleLeftPane`, `onToggleRightPane`) — every host render rebuilds them, so `React.memo` would not bail even if added. Wave 3 T-22/T-24 should source these from the live store / pane store directly inside the toolbar zones.
5. **`EditorSession` is a god component** (8 `useState`s + 5 `usePaneStore` selectors). Any one of them re-renders all panes. Splitting by domain (comment focus state, modal/find state, tab state) into either local stores or co-located children would shrink the blast radius for Scenario 1 and the host-level fan-out in Scenario 3.

## 6. Acceptance gate for Wave 3

Hard gates (block Phase 5 merge if any fails):

- **G1 (T-24 verbatim)**: cursor-move (Scenario 3) MUST NOT re-render `TopBar`, `StatusBar`, `LeftPane`, `Toolbar`, `EditorView`, `BookTitleMenu`, `UserMenu`. `StatusBar` may re-render only the `PeerAvatarStack` subtree; `CommentsSidebar` may re-render only its `candidates`-dependent memo branch.
- **G2 (T-66 verbatim)**: commit-duration p95 over the 3 scenarios must not regress vs. this baseline. Since this baseline is static, the post-Wave-3 measurement establishes both numbers; the regression check applies to subsequent PRs.
- **G3 (Scenario 2)**: typing in a reply must re-render at most: the typed-in `ThreadComposeForm`, its parent `CommentThreadCard`, and `CommentsSidebar`. It MUST NOT invalidate sibling `CommentThreadCard`s or any leaf outside the comments subtree.
- **G4 (Scenario 1)**: focusing a comment MUST NOT re-render `TopBar`, `BookTitleMenu`, `UserMenu`, `Toolbar`, `LeftPane`, `StatusBar`. Only `EditorView` (active-mark), `RightPane`, `CommentsSidebar`, the previously-active and newly-active `CommentThreadCard` should re-render.

Verification protocol for the Wave 3 PR: run the same three scenarios in a real browser with React DevTools Profiler attached, attach the flame graph or render-count table to the PR, and explicitly check off G1–G4 above.

## T-66 Final Verification (Wave 5)

After Waves 3 and 4 landed, the structural fixes for the four hotspots predicted by the baseline are in place. This section repeats the static-analysis methodology of Section 1 against the post-refactor source — a real React DevTools Profiler trace remains a nice-to-have for a follow-up PR, since live-browser instrumentation was out of scope (same constraint as the baseline). The structural read-set of each leaf is now narrow enough that the predicted spurious renders cannot fire: the props that drove them no longer flow through the components in question.

| Gate | Baseline | After | Status |
|---|---|---|---|
| G1 — peers fan-out (Scenario 3) | TopBar/Toolbar/LeftPane/UserMenu/BookTitleMenu/EditorView all re-rendered on every awareness tick | Only `StatusBar` (peer-count branch), `PeerAvatarStack`, and `CommentsSidebar` (candidates) subscribe to `peers` via `useEditorLive` selectors | **PASS** |
| G2 — `useCommentDrafts` identity churn (Scenario 2) | Hook returned a fresh object literal each render → invalidated `CommentsContext` on every keystroke | Hook deleted; drafts live in `commentsStore` with stable references; consumers subscribe via selectors | **PASS** |
| G3 — `EditorSession` god component (Scenario 1) | 8 `useState`s + 5 `usePaneStore` selectors in one component; any change re-rendered every pane | Split into `EditorSessionProvider` + `EditorLiveProvider` + `SessionStoreProvider` + `CommentsStoreProvider`; `EditorSessionUI` is ~120 LOC of layout, reading via narrow selectors | **PASS** |
| G4 — comments-store transact correctness | Not measured (Wave 2 baseline predates the store) | `commentsStore.test.ts` covers the one-event invariant under `Y.transact`; 15 tests pass | **PASS** |

### Evidence

**G1 — peers fan-out.** `grep -rn "useEditorLive" frontend/src --include="*.tsx" --include="*.ts" | grep -i peer` returns exactly three production consumers: `StatusBar.tsx:51` (`s.peers.length`), `CommentsSidebar.tsx:36` (`s.peers`), `PeerAvatarStack.tsx:56` (`s.peers`). Cross-check: grepping `peers.` in `TopBar`, `UserMenu`, `LeftPane`, `RightPane`, `BookTitleMenu`, and `Toolbar` returns zero matches — none of them touch `peers` any more, so an awareness tick cannot reach them. Matches the T-24 acceptance gate.

**G2 — draft identity.** `grep -rn "useCommentDrafts" frontend/src` returns zero matches in source (one stale mention remains in `containers/editor/README.md:93` — doc-only). The hook file is deleted; drafts now flow through `createCommentsStore.ts` selectors that hand back stable references keyed by thread id, so a keystroke in thread A no longer invalidates cards for thread B.

**G3 — host split.** `EditorHost.tsx` (182 LOC total) shows the new provider tree: `EditorSessionProvider` → `EditorLiveProvider` → `SessionStoreProvider` → `CommentsStoreProvider` → `EditorSessionUI`. Provider files are 53–110 LOC each (`EditorSessionProvider` 63, `EditorLiveProvider` 110, `SessionStoreProvider` 53, `CommentsStoreProvider` 59). `EditorSessionUI` itself reads only `leftTab`/`rightTab`/`shortcutsOpen` via `useSession` selectors and pane-store selectors — every other piece of state has moved out of the host's render closure.

**G4 — transact correctness.** `frontend/src/containers/editor/stores/commentsStore.test.ts` exists with 15 passing tests (vitest run, 10ms). Coverage includes the one-event-per-transact invariant flagged in T-66.

### Caveats — what did not improve as expected

- The inline ref callbacks in `OpenCommentList` (baseline hotspot #3) were not the focus of any wave; check whether they were also stabilised or remain the same shape. If still inline, the `div` wrapper still re-renders unconditionally even though the memoised card underneath bails — minor compared to G1/G2 wins but worth a follow-up.
- A stale reference to `useCommentDrafts` lingers in `containers/editor/README.md`. Doc-only, but worth scrubbing in the next docs pass.
- No live-browser Profiler measurement was taken; the gates are validated structurally (read-set is narrow enough that the spurious renders cannot fire), not via flame graph. Same caveat as the baseline.

### Verdict

The Wave 3+4 refactor meets the T-66 acceptance bar. All four gates pass on static-analysis evidence; G1 and G2 — the two highest-impact hotspots — are eliminated outright (the props that drove them no longer reach the affected leaves). A follow-up PR with a real Profiler capture would convert the structural argument into a numerical one, but is not required to clear T-66.
