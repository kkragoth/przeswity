# ADR 001: Editor Context Handle

- Status: Accepted
- Date: 2026-05-02

## Context

Tiptap extensions run inside ProseMirror's synchronous event loop. They need
access to runtime state — the current user, suggesting mode, glossary entries,
and header/footer click callbacks — at the moment a key press or plugin
transaction fires, not when React last rendered.

The initial approach threaded these values as props through `EditorView` →
`EditorCanvas` → `useEditorInit` → each extension factory, five or more layers
deep. Adding a new extension-visible datum meant touching every layer.
Alternatives considered:

- **Zustand/global store** — would work but introduces a global singleton
  visible to the whole app, not scoped to one editor session.
- **React context** — context reads are React-scheduled; inside a ProseMirror
  plugin callback `useContext` is unavailable.
- **Mutable ref passed as a prop** — equivalent to the chosen solution but
  with no type contract.

## Decision

`@/editor/tiptap/editorContext.ts` exports `EditorContextHandle`, a typed
imperative handle:

    export interface EditorContextHandle {
        update(next: EditorCtx): void;
        get(): EditorCtx;
    }

`EditorSession` (in `EditorHost.tsx`) creates one handle per session and calls
`ctx.update(next)` whenever React state changes. Extensions call `ctx.get()`
synchronously at event time. The handle is passed as a single prop into
`useEditorInit`, which forwards it to `buildExtensions`.

React children that only need rendered values (e.g. toolbar state) continue
to use local state and hooks; they do not read the context handle directly.

## Consequences

**Positive:**
- No prop-drilling for extension-visible state. Adding a new datum only
  requires updating `EditorCtx` and one `ctx.update(...)` call site.
- Extensions always read the freshest value synchronously — no stale-closure
  problem.
- Scoped per session; destroyed when `EditorSession` unmounts.

**Negative / Trade-offs:**
- The handle is imperative, not reactive. React components cannot subscribe to
  it; they must use separate hooks for their own rendering.
- Callers must remember to call `ctx.update()` when relevant React state
  changes (currently done in `EditorSession` via `useMemo`/`useEffect`).
