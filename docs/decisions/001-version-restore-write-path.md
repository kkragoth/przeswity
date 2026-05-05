# ADR 001 — Version restore: ProseMirror setContent over Yjs state overwrite

## Decision

Restore a version snapshot by calling `editor.commands.setContent(olderJson, { emitUpdate: true })` (ProseMirror content replacement) rather than overwriting Yjs doc bytes directly.

Before restoring, create a labeled pre-restore snapshot (`pre-restore:<ISO>`) so the current state is recoverable.

## Context

Two mechanisms exist for restoring a snapshot:

1. **Raw Yjs state overwrite** — apply the saved Yjs state vector bytes directly to the live Y.Doc. Full fidelity, but forces a hard disconnect/reconnect cycle; all connected peers see a momentary blank document as their local state diverges and resynchronises.

2. **ProseMirror `setContent`** — convert the snapshot to ProseMirror JSON (via `yDocToProsemirrorJSON`), then replace editor content. The change flows through the normal Yjs update pipeline as a series of ProseMirror steps, so peers see it as an incremental edit — no blank flash.

## Rejected alternative

Raw Yjs overwrite (option 1) was rejected because it requires calling `provider.disconnect()` before writing and `provider.reconnect()` after. During that window collaborators see a broken state. The implementation complexity (lock, write, flush pending awareness updates, reconnect) is disproportionate to the benefit (byte-perfect Yjs history) for a text editing use case where the semantic content is what matters.

## Trade-offs

- `setContent` loses Yjs-level history (undo stack resets), which is acceptable for an explicit "Restore" action.
- The generated Yjs diff can be large for long documents; Hocuspocus handles this without issue.
- Collab peers see the restore as a large edit — their awareness cursors reset but no data is lost.
