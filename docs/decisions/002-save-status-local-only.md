# ADR 002 — Save status indicator filters local-only Yjs updates

## Decision

`useDirtySaveIndicator` listens to `doc.on('update', handler)` and checks `origin === null || origin === undefined` before flipping to "Saving". Remote updates (which carry the provider instance as origin) are ignored.

## Context

Yjs fires `doc.on('update', handler, origin)` for every update — both local edits and remote changes relayed by Hocuspocus. Without origin filtering, a collaborator's keystroke would flip *your* topbar to "Saving…" and then "Saved" even though you did nothing, misleading the user about their own save state.

## Rejected alternatives

- **`doc.on('afterTransaction', ...)`** — exposes the YJS transaction object and its `.local` flag, which is cleaner but is an internal API that isn't stable across Yjs versions.
- **Ignoring the problem** — unacceptable; the bug surfaces in every collab session.

## Implementation

```ts
const onUpdate = (_update: Uint8Array, origin: unknown) => {
  if (origin !== null && origin !== undefined) return; // remote — skip
  setStatus(SaveStatus.Saving);
  // debounce → SaveStatus.Saved
};
doc.on('update', onUpdate);
```

The cap-timer in `useAutoSnapshot` uses the same guard so only local edits trigger auto-snapshots.
