# ADR 005 — Feature 7 acceptance: fixture-based mark oracles, not qualitative counts

## Decision

Feature 7 (SuggestionMode engine) tests assert the **exact serialized mark state** of the document after each operation, not just "N suggestions exist." Each test fixture contains:

1. `before` — ProseMirror JSON of the document before the edit
2. `operation` — a function that dispatches one ProseMirror transaction (simulating the edit)
3. `expected` — ProseMirror JSON of the expected document after `appendTransaction` runs, including mark attributes

## Context

The original acceptance said "each item in the list creates exactly the right number of suggestions." This is too weak:

- A test checking `suggestionCount === 1` passes even if the suggestion marks the wrong range, attributes the wrong author, or uses the wrong suggestionId.
- Real bugs (wrong position mapping, marks on wrong nodes) are invisible to count-based assertions.

## Implementation

Tests in `editor/suggestions/__tests__/suggestionMode.test.ts` use a headless Tiptap editor (no DOM). Each test:
1. Creates an editor with the full extension set including `SuggestionMode` in enabled state.
2. Dispatches the target transaction.
3. Checks `editor.getJSON()` against the expected snapshot (marks included).
4. For undo tests, also dispatches `editor.commands.undo()` and checks the doc returns to `before`.

## Trade-offs

- Fixture snapshots are verbose but brittle — any schema change requires updating them. This is acceptable because schema changes are infrequent and the verbosity is offset by the precision of the assertion.
- IME and drag-drop require Playwright for full fidelity; JSDOM tests cover the step-level logic (same steps are generated) but not the user interaction pathway.
