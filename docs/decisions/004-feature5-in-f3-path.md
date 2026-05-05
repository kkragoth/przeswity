# ADR 004 — Replace grouping (F5) built in the unified-thread UI path

## Decision

The "Replace X with Y" suggestion grouping (Feature 5) is implemented in the `useUnifiedThreads` hook under `containers/editor/threads/`, not in the legacy `SuggestionsSidebar`. The old sidebar is kept for backward compat but no longer receives new grouping logic.

## Context

The original plan ordered Feature 5 before Feature 3 (unified panel). That order would have required:
- Building the grouping logic in `SuggestionsSidebar` (old path)
- Then migrating it to the new `ThreadsSidebar` when Feature 3 landed
- Leading to duplicate code and a throwaway migration

The revised plan (from the second adverse review) reordered: do Feature 5 directly in the Feature 3 unified-thread path.

## Consequence

`SuggestionsSidebar` no longer groups suggestions into Replace entries. Any consumer of `SuggestionsSidebar` that was relying on grouping needs to migrate to `ThreadsSidebar`. The `useUnifiedThreads` hook is now the single source of truth for the `SuggestionEntryKind.Replace` classification.

## Rejected alternative

Building in the old path and migrating later — rejected because it doubles the implementation work with no user-visible benefit between F5 and F3 landing.
