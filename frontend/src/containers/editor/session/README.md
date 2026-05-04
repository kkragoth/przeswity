# Editor stores — boundary rules

## 1. Purpose

This directory holds state stores that back the editor session UI. It exists to keep
state ownership explicit: each store has a defined lifetime, a defined scope (app-wide
vs per-session), and a defined re-render profile. New stores must declare which of
the three categories below they belong to before they are added. Components must
never reach for module-level transient state — the categories below exist precisely
to make that mistake hard.

## 2. The three categories of state

### A. Module-level singleton, persisted

Used by `paneStore.ts` (left/right pane visibility — `Expanded` / `Rail` / `Hidden`).
This is created once at module load via zustand's `create()` with the `persist`
middleware (key `editor.panes`). One instance lives for the whole app. This is the
**correct** shape here: pane visibility is a user preference that should survive
session swaps, book swaps, reloads, and HMR. There is exactly one user, exactly one
sidebar layout, so a single global singleton is the right model. Do **not** use this
shape for anything that should reset when the editor session changes.

### B. Per-session stores via the `createStore` factory

Used by `sessionStore`, `commentsStore`, and `liveStore`. Each is built as a
factory: `createStore<State>()((set, get) => ({ ... }))` returning a fresh
`StoreApi<State>`. The factory is invoked **once per `EditorSession`**, keyed by
`collab.id`, and the resulting store is exposed through a React context. Lifetime
equals mount → unmount of the session. Consumers read via
`useStore(api, selector, shallow)` wrapped in a typed hook (e.g. `useSession`,
`useComments`, `useEditorLive`). The factory call MUST be memoised in `useMemo`
(or held in a ref) so React StrictMode's double-invocation does not produce two
stores for the same session — see T-80.

### C. Ref-cell (`@/editor/tiptap/editorContext.ts`)

Not a store. A plain mutable module-level object read synchronously by ProseMirror
plugins, slash command handlers, glossary highlight, and DOM event handlers
(`useEditorContextMenu`, `useHeaderFooterSync`) — code paths that run **before**
React commits and therefore cannot read from React state or context. The full
contract and the list of synchronous-read sites is documented at the top of
`editorContext.ts` itself (T-61). It is mentioned here only so newcomers know it
exists and why it is not a fourth category of store.

## 3. Why no module-level transient state

`EditorHost` remounts its children with `key={collab.id}` to reset session state
when the user opens a different collab document. **Key remount only remounts React
components — it does NOT reset module-level zustand stores.** A store created with
top-level `create<T>()(...)` is bound to the JS module, not to any component, so it
survives remounts entirely; the next session would inherit the previous session's
`activeCommentId`, drafts, tab selection, etc. This is the bug the per-session
factory pattern (category B) exists to prevent. Anything whose correct lifetime is
"one session" must be a `createStore` factory behind a context provider, never a
module singleton.

## 4. Why split providers (stable vs live)

`EditorSessionProvider` carries values that change at most once per session:
`user`, `perms`, `bookId`, `collab`, `toast`. `EditorLiveProvider` carries
high-churn signals: `editor`, `peers` (yjs awareness — fires on every cursor
move), `suggesting` (y-map observer). They are split because a single React
context re-renders **every** consumer when its value changes. If `peers` lived
in the stable context, every cursor movement by any peer would re-render
`TopBar`, `LeftPane`, `BookTitleMenu`, and every other consumer of `user` /
`perms` / `bookId`. The live context is itself implemented as a per-session
zustand store so consumers can subscribe to a single field via selector and only
re-render when that field changes.

## 5. The `doc.transact` rule

Every multi-step y-doc mutation performed inside a store action MUST be wrapped
in `doc.transact(() => { ... })`. This is required, not optional. yjs notifies
every subscriber after each individual mutation; without `transact`, deep
observers (notably `useThreads`) see intermediate states and emit one render per
step. Composed comment actions like `submitInitialBody`, `submitReply`,
`editSubmit`, `resolveThread`, `removeThread`, and `flushPending` perform two or
more y-doc writes plus a draft mutation — all of those go inside a single
`transact` block so subscribers see exactly one logical event. This rule comes
from Smell 13 in §1 of `docs/refactor-frontend.md`. T-53 / T-64 add a regression
test that asserts one event per composed action.

## 6. Selector hygiene

- Always pass `shallow` (from `zustand/shallow`) when a selector returns an array
  or object. Without it, every `set` produces a new reference and the consumer
  re-renders even when the values are unchanged.
- Per-thread selectors take an `id` parameter:
  `selectThread(id)`, `selectIsActive(id)`, `selectReplyDraft(id)`,
  `selectIsEditingThread(id)`, `selectIsEditingReply(id, replyId)`.
- Never select the whole list and filter in the component. Component-level
  filtering forces re-renders whenever any unrelated entry in the list changes.
  Define the selector upfront and let the store memoise the slice.
- Components that render a single item subscribe by id, not to the whole
  collection.

## 7. Where things live

```
containers/editor/
    session/
        paneStore.ts            (A) module singleton, persisted
        sessionStore.ts         (B) per-session factory: tabs, find,
                                    shortcuts, activeCommentId, pendingNew
        liveStore.ts            (B) per-session factory: editor, peers,
                                    suggesting (high-churn signals)
        SessionProvider.tsx     stable context: user, perms, bookId,
                                    collab, toast (component name:
                                    EditorSessionProvider)
        LiveProvider.tsx        live context, hosts liveStore (component
                                    name: EditorLiveProvider)
    comments/store/
        commentsStore.ts        (B) per-session factory: filters, drafts,
                                    composed ops wrapped in doc.transact
    index.tsx                   mounts the providers under key={collab.id}
                                    (exports EditorHost)

editor/tiptap/
    editorContext.ts            (C) ref-cell — synchronous reads from
                                    plugins / DOM handlers only
```

See `docs/refactor-frontend.md` Appendix A for the full session diagram and §2
for the architectural rationale.
