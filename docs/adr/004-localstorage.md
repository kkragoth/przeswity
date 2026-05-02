# ADR 004: useLocalStorageState for Client-Side Persistence

- Status: Accepted
- Date: 2026-05-02

## Context

Two editor features need to survive page reloads without a server round-trip:

- **Pane state** — which of the left/right panes is expanded, railed, or
  hidden (`editor.pane.left`, `editor.pane.right`).
- **Version snapshots** — the list of `VersionSnapshot[]` for a given book
  (`przeswity.versions:<bookId>`).

Options considered:

- **Zustand with localStorage persistence** — adds a global store for
  ephemeral per-user UI preferences. Unnecessary overhead.
- **Custom hooks per feature** — each feature implements its own
  `useState` + `useEffect` + `localStorage` boilerplate. DRY violation.
- **A single thin hook** — one implementation, reused wherever
  `localStorage` persistence is needed.

## Decision

`@/utils/storage/useLocalStorageState<T>(key, initial, opts?)` wraps
`useState` with a `useEffect` that writes to `localStorage` after an optional
debounce:

    const [value, setValue] = useLocalStorageState<T>(key, initial, {
        debounceMs: 250,           // batch rapid writes
        serialize: customFn,       // optional; defaults to JSON.stringify
        deserialize: customFn,     // optional; defaults to JSON.parse
    });

- Reads are synchronous (inside `useState` initializer).
- Parse errors on read (schema corruption) fall through silently to `initial`.
- Write errors (`QuotaExceededError`, private-browsing restrictions) are
  swallowed silently.
- The `PaneState` deserializer validates enum membership and throws on unknown
  values; the hook catches that and falls back to `initial`.

## Consequences

**Positive:**
- No global store required for these ephemeral preferences.
- Per-key isolation: pane state and version lists cannot interfere.
- Debounced writes prevent storage thrashing during rapid state updates
  (e.g. version list growing during an editing session).
- Custom serialize/deserialize hooks enable compact or versioned encodings
  without changing the hook's interface.

**Negative / Trade-offs:**
- `localStorage` is synchronous on the main thread; very large payloads
  (many version snapshots) will block briefly on write. The debounce
  mitigates frequency but not payload size.
- `localStorage` is per-origin and not synced across devices or browser
  profiles. Users who switch machines lose their local version history.
- SSR environments must guard against `window` being undefined (the hook
  initializer checks `localStorage` directly; tests mock it).
