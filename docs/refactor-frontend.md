# Frontend Refactor Plan

Audience: a developer picking this codebase up cold for hand-off. Goal: ship a clean, readable, internally-consistent frontend with minimal behavioral risk. Each phase is independently mergeable, reviewable, ends with a green CI, and is small enough to land in one PR.

Scope: `frontend/src/` — excluding `api/generated/*` and `routeTree.gen.ts` (regenerated artefacts).

## Conventions

- All paths are relative to `frontend/src/` unless otherwise stated.
- "FILE:LINE" anchors reference current state at the time of writing — they will drift; verify before editing.
- Translations live at `src/locales/{pl,en,ua}/{namespace}.json` where namespaces are `common, auth, admin, coordinator, editor, errors`. Polish (`pl`) is the source-of-truth that `npm run check-locales` enforces parity against.
- Cross-directory imports must use `@/`. No `./` or `../` outside a single directory.
- Related string constants must be `enum` (TS string-enum), not literal unions.
- State machines / focus / draft kinds are discriminated unions on `kind` with exhaustive `switch`.
- No file in `containers/` or `editor/` should exceed ~200 LOC unless its file header documents why.
- Every phase ends green: `npm run typecheck && npm run lint && npm run test && npm run check-locales`.
- Phases can be picked up by different developers. Each phase below names its dependencies.

## Quick navigation

- **0–4**: Tooling & baseline.
- **5–24**: i18n violations (one phase per offender).
- **25–35**: Magic numbers, ADTs, enum migration.
- **36–43**: Hardening helpers (storage, dialogs, toast, role gates).
- **44–58**: Editor refactors (ambient-state refs, god-files, hook dedupe).
- **59–66**: Comments / suggestions / versions / mentions / glossary / meta surgery.
- **67–73**: API, routing, types.
- **74–80**: Tests & docs hand-off.

---

# Tooling & baseline

## Phase 0 — Capture baseline

No code changes.
1. Record `npm run typecheck` / `lint` / `test` / `check-locales` / `build` results in `docs/refactor-frontend-baseline.md`. Capture per-chunk gzipped bundle size.
2. Delete `frontend/openapi-ts-error-*.log`. Add `openapi-ts-error-*.log` to `.gitignore` if not already.
3. Verify `package.json` scripts; ensure a `test:watch` script if missing.

## Phase 1 — ESLint: warn on dangerous patterns (no autofix)

Add three rules to `eslint.config.js`. Land as warn first, raise to error after Phase 5–73 sweeps.
- `'@typescript-eslint/no-floating-promises': 'warn'`
- `'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]`
- `'no-console': ['warn', { allow: ['warn', 'error'] }]` — `console.log` in `editor/shell/Toast.tsx:46` and elsewhere will surface.

## Phase 2 — ESLint: ban relative cross-directory imports

Add to `eslint.config.js`:
```js
'no-restricted-syntax': [
  'error',
  {
    selector: "ImportDeclaration[source.value=/^\\.\\.\\//]",
    message: 'Use @/ alias instead of ../ for cross-directory imports.',
  },
],
```
Then sweep & rewrite. Today there are ~39 hits, including:
- `editor/tiptap/EditorView.tsx:8-14` — `./hooks/useBlockHover` etc.
- `editor/tiptap/extensions.ts:22-29` — `./formatting/SmartPaste`, `./find/FindReplace`, `./blocks/Footnote`, etc.
- `editor/tiptap/Toolbar.tsx:10-12` — `./formatting/SpecialCharsMenu`, `./StyleDropdown`, `./ToolbarPrimitives`.
- `editor/tiptap/find/FindReplaceBar.tsx`, `editor/tiptap/slash/SlashMenu.tsx`, `editor/tiptap/ToolbarPrimitives.tsx`.
- `i18n/LanguageSwitcher.tsx`, `editor/identity/storage.ts`, `editor/comments/useThreads.ts`, `editor/comments/threadOps.ts`, `editor/io/typography.test.ts`.

Mechanical rewrite. One PR.

## Phase 3 — ESLint: warn on hardcoded JSX text

Add a custom rule (or `eslint-plugin-i18next`) that warns on JSX text matching `/[A-Z][a-z]+ /`. Tracked, set to `warn`. The phases 5–24 below will close every one.

## Phase 4 — Strengthen `check-locales` script

`scripts/check-locales.ts` already enforces key-set parity with `pl` as canonical. Add:
- Detect *empty values* (e.g. `"foo": ""`) and fail.
- Detect duplicate keys via JSON-stable serialization.
- Allow a `--write-stub` flag that fills missing keys in `en` / `ua` with the Polish text and a `// TODO translate` marker, so contributors don't have to handcraft empty placeholders.

---

# i18n violations — one phase per offender

Each phase below adds keys under the named namespace, mirrors them across all three locale files, and removes the literal strings. Acceptance: `npm run check-locales` passes, manual sweep with the language detector shows correct rendering.

## Phase 5 — i18n: `editor/glossary/GlossaryPanel.tsx`

`containers/editor/components/glossary/GlossaryPanel.tsx` is fully untranslated:
- `<div className="sidebar-title">Glossary</div>` (line 86)
- `placeholder="Term (matched in document)"` (90), `"Translation / canonical form"` (99), `"Notes (optional)"` (108)
- Buttons: `Save` / `Add` (122), `Cancel` (132), `Edit` (150), `Delete` (153)
- Empty state: `"No glossary entries. Add a term above to highlight it in the document."` (138)

Add keys under `editor.glossary.*`. Use `useTranslation('editor')`.

## Phase 6 — i18n: `editor/meta/MetaPanel.tsx`

`containers/editor/components/meta/MetaPanel.tsx` is fully untranslated:
- `<div className="sidebar-title">Document</div>` (48)
- Field labels: `Title` (51), `ISBN` (60), `Target words` (69), `Deadline` (82), `Stage` (90), `Notes` (103)
- Placeholders: `"Untitled document"` (55), `"978-…"` (64), `"50000"` (74), `"Coordinator notes…"` (106)

Add keys under `editor.meta.*`. (See Phase 28 for the divergent `STATUS_OPTIONS` enum issue.)

## Phase 7 — i18n: `editor/outline/OutlineSidebar.tsx`

- `<div className="sidebar-title">Outline</div>` (74)
- Empty state `"No headings yet. Use the style dropdown to add one."` (77)
- `<em>(empty heading)</em>` (89) — also rendered inline; key `editor.outline.emptyHeading`.

## Phase 8 — i18n: `editor/workflow/ShortcutsModal.tsx`

96-line component with **zero** `t()` calls. ~30 strings:
- Modal title `"Keyboard shortcuts"` (63), close button `"Close"` (67)
- Group titles: `Document`, `Format`, `Comments & suggestions`, `Navigation`
- Every `label` field in the four `GROUPS` (e.g. `"Find & replace"`, `"Bold"`, `"Italic"`, `"Insert link"`, `"This shortcut sheet"`, `"Save snapshot"`, `"Add comment to selection"`, `"In Suggesting mode: marks instead of deletes"`, etc.)

Keep platform prefixes (`⌘`/`Ctrl`/`⌥`/`Alt`) as data; only labels translate. Keys under `editor.shortcuts.*`.

## Phase 9 — i18n: `editor/suggestions/SuggestionsSidebar.tsx`

- `<div className="sidebar-title">Suggestions ({entries.length})</div>` (89) — needs `count`
- `"No pending suggestions."` (91)
- `"Accept all"` (97), `"Reject all"` (100), `"Accept"` (132), `"Reject"` (141)
- `e.type === 'insertion' ? 'inserted' : 'deleted'` (116) — split into two keys.

(See Phase 31 for the literal-union → enum migration of `'insertion' | 'deletion'`.)

## Phase 10 — i18n: editor toolbar `aria-label` and link prompt

- `editor/tiptap/Toolbar.tsx:70` — `aria-label="Editor toolbar"`. Use `t('toolbar.ariaLabel')`.
- `editor/tiptap/Toolbar.tsx:62` — `window.prompt(t('fileMenu.linkPrompt'), prev ?? 'https://')` — hardcoded default URL `'https://'` is OK but the prompt itself should be replaced (Phase 41).
- `editor/tiptap/BubbleToolbar.tsx:36` — `title="Add comment"`.
- `editor/tiptap/ToolbarPrimitives.tsx:135` — `title="Remove highlight"`.

## Phase 11 — i18n: drag handle, special chars, find/replace controls

- `editor/tiptap/blocks/DragHandle.tsx:58` — `title="Drag to move · click for menu"`.
- `editor/tiptap/formatting/SpecialCharsMenu.tsx:106` — `title="Insert special character"`.
- `editor/tiptap/find/FindReplaceBar.tsx`:
  - line 84 `title="Previous (Shift+Enter)"`, 87 `title="Next (Enter)"`, 102 `title="Toggle replace"`, 106 `title="Close (Esc)"`
  - line 114 `placeholder="Replace with"`

## Phase 12 — i18n: comment pin tooltip plurals

`containers/editor/components/comments/CommentAnchors.tsx:97`:
```ts
title={`${p.authorName}${p.replies > 0 ? ` · ${p.replies} repl${p.replies === 1 ? 'y' : 'ies'}` : ''}`}
```
Use `t('comments.repliesCount', { count: p.replies })` — i18next handles plurals natively. Replace the hand-rolled `repl${...}` string.

## Phase 13 — i18n: reactions tooltip

`containers/editor/components/comments/Reactions.tsx:36` — `title="Add reaction"` → `t('comments.addReaction')`.

## Phase 14 — i18n: `containers/admin/components/SystemRoleBadge.tsx`

```tsx
if (systemRole === 'admin') return <Badge>Admin</Badge>;
if (systemRole === 'project_manager') return <Badge variant="secondary">Project Manager</Badge>;
```
Use `t(roleI18nKey(systemRole))` from `lib/roleI18n.ts`. Also: replace `'admin'` / `'project_manager'` literal comparisons with `SystemRole` enum imports (see Phase 30).

## Phase 15 — i18n: `containers/auth/components/DevQuickLogin.tsx`

- Lines 64–65: `<Badge>Admin</Badge>`, `<Badge variant="secondary">PM</Badge>` → `t('roles.admin')`, `t('roles.projectManagerShort')` (add a short variant in `common.json`).
- Line 69: `'...'` busy spinner — fine, but make it consistent with `tc('states.saving')` in other dialogs.
- Line 11: `systemRole: 'admin' | 'project_manager' | null` → import `SystemRole`.

## Phase 16 — i18n: people picker raw role names

`components/people/PeoplePickerFields.tsx:46` renders `{r}` directly. Replace with `<RoleBadge role={r} />` (or `t(roleI18nKey(r))`). Same file also redeclares `type Role = (typeof ROLE_KEYS)[number]` (line 7), which duplicates `Role` from `editor/identity/types.ts`. Pick the canonical source (Phase 32).

## Phase 17 — i18n: `containers/coordinator/components/BooksList.tsx` raw role badges

Line 62: `book.myRoles.map((role) => <Badge>{role}</Badge>)` → `<RoleBadge role={role} />`. Same fix in `BooksTimeline.tsx`.

## Phase 18 — i18n: `useDocumentImport` hardcoded confirms & toasts

`containers/editor/hooks/useDocumentImport.ts`:
- line 31 `window.confirm('Importing "${file.name}" will replace…\nProceed?')`
- line 34 `'Importing…'`, line 44 `'Imported ${file.name}'`, line 46 `'Import failed: ${error.message}'`

This whole hook duplicates `editor/tiptap/FileMenu.tsx` (Phase 50 deletes one). For now: pipe through `t('fileMenu.*')` keys that already exist in `editor.json` (`fileMenu.confirmReplaceImport`, `fileMenu.importing`, `fileMenu.imported`, `fileMenu.importFailed`).

## Phase 19 — i18n: `editor/tiptap/contextItems/formattingItems.ts` link prompt

Lines 16, 28: `window.prompt('Link URL', href)` — hardcoded. Replace prompt entirely (Phase 41) and add key `editor.toolbar.linkPromptTitle`.

## Phase 20 — i18n: `editor/glossary/GlossaryHighlight.ts` tooltip separators

Line 52–54 builds a tooltip `${entry.term} → ${entry.translation}${entry.notes ? ' · ' + entry.notes : ''}`. The arrows / dots are presentation, but the assembly should at least live in a named function `formatGlossaryTooltip(entry, t)` in `editor/glossary/format.ts` so it can localize "→ "/" · " if needed and stay testable.

## Phase 21 — i18n: `editor/ai/aiOps.ts` user-facing strings

Hardcoded: `'Select some text first.'`, `'Selection is empty.'`, `'AI returned no changes.'`, `'Select a sentence first.'`, `'Track-change marks not configured.'`, `'AI suggestion ready — accept or reject in the Suggestions panel.'`, plus `DEFAULT_AI.name = 'AI Assistant'`.

Move these to `editor.ai.*` keys. The function returns `AiResult { ok, message }` — since the message is i18n, change the contract to `AiResult { ok: true } | { ok: false, key: AiErrorKey }` (ADT, see Phase 33) so consumers can choose how to render it.

## Phase 22 — i18n: book stages — single source of truth

`containers/books/components/BookRow.tsx:13-22` hardcodes a `STAGES` array. The names already live in `common.json` under `books.stages.*`. Plan:
1. Drop the hardcoded `STAGES`. Derive from `Book['stage']` via a generated array — e.g. add a `BOOK_STAGES_ORDER: BookStage[]` const in `lib/stage.ts` (Phase 30 introduces `BookStage` enum).
2. Render via `t(\`books.stages.${stage}\`)`. The keys already exist.

## Phase 23 — i18n: `MetaPanel` divergent status options

`containers/editor/components/meta/MetaPanel.tsx:17`:
```ts
const STATUS_OPTIONS = ['draft', 'in-translation', 'in-edit', 'in-proof', 'composed', 'finalized'];
```
This is a different vocabulary from `Book.stage`. Decide:
- **Drop it** (preferred — book stage lives on the API row, not in the document Yjs map). Migration: deleting the field on read leaves the value in the Yjs map but it's unused — harmless.
- **Or unify** with `BookStage` (Phase 30) — delete `STATUS_OPTIONS` and use `BOOK_STAGES_ORDER`.

Either path: zero hardcoded labels in `MetaPanel.tsx` after this phase.

## Phase 24 — i18n: untranslated string scan + lock

After Phases 5–23 land, run a final grep: `grep -rEn '>[A-Z][a-z]+ ' src --include='*.tsx' | grep -v "{t("`. Should return zero. Promote the Phase 3 ESLint rule from `warn` to `error`.

---

# Magic numbers, ADTs, enums

## Phase 25 — `lib/constants.ts` — extract app-level magic numbers

Create the file. Move:
- `STALE_THRESHOLD_DAYS = 14` (`lib/status.ts:11`)
- `RECENT_THRESHOLD_DAYS = 2` (`lib/status.ts:19`)
- `TIMELINE_HORIZON_DAYS = 21` (`containers/coordinator/components/BooksTimeline.tsx:32`)
- `ACTIVE_WEEK_DAYS = 7` (`hooks/api/useBooksDashboard.ts:28`)
- `MISSING_DATE_DAYS = 999` (already exported from `lib/dates.ts:3`; move to `constants.ts` and re-export to avoid breaking imports).

## Phase 26 — `editor/constants.ts` — extract editor-level magic numbers

- `RECONNECT_RETRY_INTERVAL_MS = 3000` (`containers/editor/hooks/useConnectionStatus.ts:91`)
- `AWARENESS_ACTIVITY_THROTTLE_MS = 250` (`editor/tiptap/EditorView.tsx:119`)
- `VERSIONS_AUTO_KEEP = 8` (`containers/editor/hooks/useVersions.ts:11`)
- `VERSIONS_PERSIST_DEBOUNCE_MS = 250` (`containers/editor/hooks/useVersions.ts:46`)
- `HEADING_PULSE_MS = 1400` (`containers/editor/components/outline/OutlineSidebar.tsx:69`)
- `BLOCK_DROP_MIDPOINT_RATIO = 0.5` (in `editor/tiptap/hooks/useBlockDragDrop.ts`)
- `COMMENT_PIN_GAP_PX = 36` (`containers/editor/components/comments/CommentAnchors.tsx:23`)
- `PAGE_NAV_ACTIVE_LINE_RATIO = 0.30`, `PAGE_NAV_TOP_OFFSET_PX = 16` (`containers/editor/hooks/usePageNavigation.ts:11-12`)
- `TOAST_DURATION_MS = 3000` (`editor/shell/Toast.tsx:26`)
- A4 page constants in `editor/tiptap/extensions.ts:40-47` and the page-gap colors at lines 37–38.

## Phase 27 — `editor/io/typography/units.ts` — DPI / point math constants

Move the unit-conversion math out of `editor/io/typography.ts:54-68`:
```ts
export const DPI = 96;
export const PT_PER_INCH = 72;
export const TWIPS_PER_PT = 20;
export const HALF_POINTS_PER_PT = 2;
export const LINE_HEIGHT_240THS = 240;

export const ptToPx        = (pt: number) => Math.round((pt * DPI) / PT_PER_INCH);
export const ptToTwips     = (pt: number) => Math.round(pt * TWIPS_PER_PT);
export const ptToHalfPoints = (pt: number) => Math.round(pt * HALF_POINTS_PER_PT);
export const lineHeightTo240ths = (m: number) => Math.round(m * LINE_HEIGHT_240THS);
```
Currently the conversion ratios are bare integers in formulas with no symbolic name.

## Phase 28 — extract drag-drop predicate

`editor/tiptap/hooks/useBlockDragDrop.ts` has inline `clientY < blockRect.top + blockRect.height / 2`. Extract:
```ts
const isDropAbove = (clientY: number, rect: DOMRect): boolean =>
    clientY < rect.top + rect.height * BLOCK_DROP_MIDPOINT_RATIO;
```

## Phase 29 — `enum CommentStatus`

`editor/comments/types.ts` `status: 'open' | 'resolved'` → `enum CommentStatus { Open = 'open', Resolved = 'resolved' }`. Update consumers:
- `editor/comments/threadOps.ts`, `editor/comments/useThreads.ts`
- `containers/editor/hooks/useCommentOps.ts:20, 25, 103`
- `containers/editor/hooks/useCommentThreads.ts`
- `containers/editor/components/comments/CommentsSidebar.tsx:43`
- `containers/editor/components/comments/CommentAnchors.tsx:46` (`if (t.status !== 'open')`)

## Phase 30 — `enum BookStage` + `BOOK_STAGES_ORDER`

The API generates `Book['stage']` as a string-literal union. Centralize in `lib/stage.ts`:
```ts
export enum BookStage {
    Translation = 'translation',
    Editing = 'editing',
    Authorization = 'authorization',
    Proofreading = 'proofreading',
    ApplyingChanges = 'applying_changes',
    Typesetting = 'typesetting',
    PostTypesetProof = 'post_typeset_proof',
    Finalization = 'finalization',
}
export const BOOK_STAGES_ORDER: BookStage[] = [...];
```
Move `allowedNextStages` into this file. Update consumers in `containers/books/components/BookRow.tsx`, `containers/coordinator/components/BooksList.tsx:65`, `useBookActions.ts`, `lib/status.ts:28`.

## Phase 31 — `enum SuggestionType`

`'insertion' | 'deletion'` literal union appears in:
- `containers/editor/components/suggestions/SuggestionsSidebar.tsx:8, 38, 116`
- `editor/suggestions/suggestionOps.ts`, `editor/suggestions/TrackChange.ts`

Promote to `enum SuggestionType { Insertion = 'insertion', Deletion = 'deletion' }`.

## Phase 32 — Single canonical `Role` enum

Today there are two role lists:
- `editor/identity/types.ts` — `Role` literal union (7 values, includes `admin`)
- `components/badges/RoleBadge.tsx` — `ROLE_KEYS = ['editor','proofreader','translator','author','typesetter','coordinator']` (6 values, no `admin`)

Pick one. Recommended:
1. Promote `Role` to `enum Role { ... }` in `editor/identity/types.ts`.
2. Export `ALL_ROLES = Object.values(Role)` and `MENTIONABLE_ROLES` (excludes `Admin`).
3. Delete `ROLE_KEYS` from `RoleBadge.tsx`; have it import `Role` and `ALL_ROLES`.
4. Delete the duplicate `ROLES` const inside `containers/editor/components/comments/MentionTextarea.tsx:16-24`.

## Phase 33 — ADT for `AiResult`

`editor/ai/aiOps.ts` returns `{ ok: boolean; message: string }` where `message` is hardcoded English. Convert to:
```ts
type AiResult =
    | { kind: 'success' }
    | { kind: 'no-selection' }
    | { kind: 'empty-selection' }
    | { kind: 'no-changes' }
    | { kind: 'unsupported-schema' };
```
Caller renders via `t(\`editor.ai.results.\${result.kind}\`)`. Pairs with Phase 21.

## Phase 34 — ADT for `MentionKind`

`containers/editor/hooks/useMentionDetection.ts` `kind: 'user' | 'role'` → `enum MentionKind { User = 'user', Role = 'role' }`. Same touch in `MentionTextarea.tsx:33-35, 47, 132`.

## Phase 35 — Exhaustive switches over discriminators

Add `assertNever(x: never): never` in `lib/assert.ts`. Replace `if/else if` chains over `kind` discriminators with `switch (x.kind) { ... default: return assertNever(x) }` at:
- `containers/editor/components/comments/CommentsSidebar.tsx:64-70` (editTarget)
- `containers/editor/hooks/useCommentOps.ts:31-55` (reaction target — also see Phase 60 for dedupe)
- `containers/coordinator/components/CoordinatorStatusBadge.tsx` — switch on `BookAttention`
- `containers/books/components/BookStatusBadge.tsx` — same

---

# Hardening helpers

## Phase 36 — Drop `useCallback` around `useState` setters

`useState` setters are already stable. The wrappers in `containers/editor/hooks/usePaneState.ts:43-55` (`setState`, `cycle`, `expand`, `rail`, `hide`) and `hooks/api/useBooksDashboard.ts:13-16, 32-37` add no value. Replace with the raw setter; delete the `useMemo` for `setFilter`.

## Phase 37 — `usePaneState` — drop redundant boolean flags

`containers/editor/hooks/usePaneState.ts:30-32` returns `state` plus `isExpanded`, `isRail`, `isHidden`. Either keep flags or enum, not both. Recommendation: keep `state: PaneState`, expose one helper `paneClass(state): string`. Update `containers/editor/EditorHost.tsx:81, 122-123, 165` to read `state` directly.

## Phase 38 — `usePaneState` — inline `readInitial`

`containers/editor/hooks/usePaneState.ts:19-21` is a one-line wrapper around `readPaneState`. Inline.

## Phase 39 — `useLocalStorageState` hook (consolidation)

Extract a single typed helper:
```ts
// utils/storage/useLocalStorageState.ts
export function useLocalStorageState<T>(
    key: string,
    initial: T,
    opts?: { debounceMs?: number; serialize?: (v: T) => string; deserialize?: (s: string) => T },
): [T, Dispatch<SetStateAction<T>>]
```
Migrate three call sites:
- `containers/editor/hooks/usePaneState.ts:14, 40`
- `containers/editor/hooks/useVersions.ts:19, 45`
- `editor/identity/storage.ts:10, 22, 27`

`i18n/LanguageSwitcher.tsx:8` is a single line — leave as-is.

## Phase 40 — Replace internal `Toast` with Sonner (single source)

`editor/shell/Toast.tsx` re-implements toasts with `setTimeout` plus a dedicated `<div className="toast-host">`. The project already depends on `sonner`. Two systems = two failure modes.

Plan:
1. Mount `<Toaster />` from sonner once at app root (`main.tsx` or `routes/__root.tsx`).
2. Replace `useToast().show(msg, kind)` with `toast.success(msg)` / `toast.error(msg)` / `toast.info(msg)` calls.
3. Delete `editor/shell/Toast.tsx`.
4. The `console.log('[toast]', m)` fallback (line 46) goes away.

## Phase 41 — Replace `window.confirm` / `window.prompt` with shadcn dialogs

Eight `window.confirm` / `window.prompt` calls block the browser, can't be styled or tested:
- `containers/editor/components/BookTitleMenu.tsx:35`
- `containers/editor/components/comments/ResolvedThreadCard.tsx:41`
- `containers/editor/components/versions/VersionsPanel.tsx:47`
- `containers/editor/components/comments/thread/ThreadReplyCompose.tsx:44`
- `containers/editor/hooks/useDocumentImport.ts:31`
- `editor/tiptap/Toolbar.tsx:62` (prompt for link)
- `editor/tiptap/FileMenu.tsx:55, 76` (confirms)
- `editor/tiptap/contextItems/formattingItems.ts:16, 28` (link prompts)

Use `ConfirmDialog` (already exists at `components/feedback/ConfirmDialog.tsx`) for confirms. Build a small `<LinkPromptDialog>` for the link prompts. Delete `window.prompt`/`window.confirm` from this codebase.

## Phase 42 — `useFormDialog` migrations

Three admin dialogs and the people picker re-implement `open + form + mutation + reset`:
- `containers/admin/components/NewUserDialog.tsx`
- `containers/admin/components/EditUserDialog.tsx`
- `containers/admin/components/DeleteUserButton.tsx` (becomes `useConfirmDialog`, a thin wrapper)
- `components/people/PeoplePicker.tsx` (mounts on top of `useFormDialog` for the dialog lifecycle; keeps picker draft state in `usePeoplePickerState`)

Acceptance: each dialog file shrinks; reset-on-close behavior comes from one place.

## Phase 43 — Toast policy via `useFormDialog`

Extend `useFormDialog` with optional `successKey` / `errorKey`. Defaults to `common.messages.success` / `common.messages.error`. After Phase 40 (sonner), every mutation surfaces a toast. Add the default keys.

---

# Centralization & dedupes

## Phase 44 — Centralize role/permission predicates

Create `lib/auth.ts`:
```ts
export const isAdmin            = (u: SessionUser) => u.systemRole === SystemRole.Admin;
export const isProjectManager   = (u: SessionUser) => u.systemRole === SystemRole.ProjectManager;
export const canAccessCoordinator = (u: SessionUser) => isAdmin(u) || isProjectManager(u);
export const canAccessAdmin       = isAdmin;
export const canCreateBooks       = canAccessCoordinator;
```
Replace inline checks at `components/layout/AppTopBar.tsx:80-85`, `containers/books/BooksListPage.tsx`, `routes/_app/admin/*.tsx`, `routes/_app/coordinator/*.tsx`.

## Phase 45 — Per-resource cache invalidation hooks

Today many sites manually call `qc.invalidateQueries({ queryKey: usersListQueryKey() })` etc. Inconsistencies are likely.

Create `hooks/api/cache/`:
- `useInvalidateUsers.ts`
- `useInvalidateBooks.ts`
- `useInvalidateBookAssignments.ts`
- `useInvalidateMe.ts`

Each is 4–6 LOC. Replace every callsite.

## Phase 46 — Dedupe `formatLastActivity`

`containers/coordinator/components/BooksList.tsx:15-21` and `containers/coordinator/components/BooksTimeline.tsx:8-14` define an identical `formatLastActivity(activityAt, t, tc)`. Meanwhile `lib/dates.ts:31-41` already has `formatActivity(date, t)` with the same shape. Delete the two duplicates and use `formatActivity`. Add tests for the dashboard-specific keys (`dashboard.activity.today` etc.) if the keys differ — they do; harmonize so both use the same `books.card.activity*` keys (already in `common.json`).

## Phase 47 — Dedupe `MAMMOTH_STYLE_MAP`

`MAMMOTH_STYLE_MAP` is exported from `editor/io/markdown.ts:4-16` and redeclared inline in `editor/tiptap/FileMenu.tsx:21-31`. Delete the duplicate; `FileMenu.tsx` imports the one from `editor/io/markdown.ts`.

## Phase 48 — Single avatar implementation

Three avatar implementations exist:
- `editor/shell/Avatar.tsx` — initials + colored bg + ring + badge
- `components/ui/avatar.tsx` — shadcn primitive
- `lib/user.ts` `userInitials` — divergent fallback handling

Pick `editor/shell/Avatar.tsx` as the canonical one (it's the most-used). Move it to `components/Avatar.tsx`. Delete `lib/user.ts` `userInitials` (its callers move to the component). Keep `components/ui/avatar.tsx` only as a low-level shadcn primitive used internally by the canonical Avatar.

## Phase 49 — Dedupe diff-walking logic

`editor/diff/buildDiffDocument.ts` has `buildInlineLines` (54-99) and `buildSbsRows` (101-150) with identical hunk-walking logic, only the emitter differs. Extract:
```ts
function walkHunks<T>(
    older: string,
    newer: string,
    emit: (h: Emission) => T[],
): T[]
```
Both functions become 6-line wrappers. Add tests for the shared walker.

## Phase 50 — Dedupe document import: `useDocumentImport` vs `FileMenu`

`containers/editor/hooks/useDocumentImport.ts` and `editor/tiptap/FileMenu.tsx:51-71`'s `onFile` are the same flow with different copy. Keep the hook; have `FileMenu.tsx` use it. After this phase: one import code path; one set of i18n keys (Phase 18 already harmonized them); `setTimeout(() => fileRef.current?.click(), 0)` lives in one place with a comment explaining why (Safari needs the click to be in a separate task to honor `accept`).

## Phase 51 — `getProviderSyncStatus` — extract from `useConnectionStatus`

`containers/editor/hooks/useConnectionStatus.ts:11-20` defines `readStatus(provider)`. `containers/editor/hooks/usePaneState.ts` references the same logic via separate code. Extract to `editor/collab/syncStatus.ts`:
```ts
export const getProviderSyncStatus = (provider: HocuspocusProvider): SyncStatus => ...
```
Add tests with a mocked provider.

## Phase 52 — `useEditorBootstrap` — combine sequenced gates

`containers/editor/EditorHost.tsx:183-193` chains `useCollabSession` → `useFontsReady` → `useInitialSync` and renders a skeleton until all three are ready. Combine:
```ts
// containers/editor/hooks/useEditorBootstrap.ts
export function useEditorBootstrap({ bookId }: { bookId: string }) {
    const { collab } = useCollabSession({ bookId });
    const fontsReady = useFontsReady(FONT_VARIANTS);
    const syncDone = useInitialSync(collab);
    return { collab, ready: Boolean(collab) && fontsReady && syncDone };
}
```
`EditorHostInner` shrinks to ~5 lines.

---

# Editor refactors — high-impact

## Phase 53 — `EditorView` ambient refs → `EditorContext` (highest risk)

`editor/tiptap/EditorView.tsx:37-42, 50-59` holds **five** mutable refs whose only purpose is to dodge stale-closure bugs in TipTap extensions:
```
userRef, suggestingRef, glossaryRef, onHeaderClickRef, onFooterClickRef
```
These are mutated mid-render. Maintenance hazard.

Plan:
1. Introduce one cell:
   ```ts
   type EditorCtx = {
       user: User;
       suggesting: SuggestingMode;
       glossary: GlossaryEntry[];
       onHeaderClick?: (e: HeaderClickEvent) => void;
       onFooterClick?: (e: FooterClickEvent) => void;
   };
   const createEditorContext = () => {
       let snap: EditorCtx | null = null;
       return { update(n: EditorCtx) { snap = n; }, get(): EditorCtx { if (!snap) throw new Error('ctx not initialized'); return snap; } };
   };
   ```
2. Pass `ctx` into `useEditorInit` once. Extensions read `ctx.get()` at event time.
3. The component does `useLayoutEffect(() => ctx.update({ user, suggesting, glossary, ... }))` per render.
4. Delete all five refs from `EditorView.tsx`.

Manual smoke test before merge: open editor, type, drag block, header/footer click, glossary highlight refresh, suggesting mode toggle, awareness presence, find & replace, comment add. Do this in two browsers.

## Phase 54 — `useAwarenessSync` — extract awareness effect

`editor/tiptap/EditorView.tsx:102-137` hand-rolls awareness state + activity throttle. Move to `editor/tiptap/hooks/useAwarenessSync.ts(editor, provider, user)`. With Phase 26 done, `AWARENESS_ACTIVITY_THROTTLE_MS` lives in `editor/constants.ts`.

## Phase 55 — Drag state → single hook return

`editor/tiptap/EditorView.tsx:50-55` holds `dragStateRef`, `dropTop` state, `resetDrag`. The shape forces `EditorCanvas` to take a ref and a setter. Refactor into one hook:
```ts
const { dragState, dropTop, beginDrag, endDrag } = useBlockDrag(editor);
```
Encapsulate the `INITIAL_DRAG_STATE` defaulting and `setDropTop(null)` reset.

## Phase 56 — `useHeaderFooterSync` — drop click-callback ref pattern

`editor/tiptap/hooks/useHeaderFooterSync.ts:37-52` updates `onHeaderClickRef.current` / `onFooterClickRef.current` outside `useEffect`. After Phase 53, the click callbacks live on `EditorContext` — delete the refs entirely.

## Phase 57 — Split `editor/tiptap/find/FindReplace.ts` (195 LOC)

Extract:
- `find/state.ts` — `FRState` type, default, reducer-style merger.
- `find/matching.ts` — pure `computeMatches(doc, query, caseSensitive)`. Add unit tests (no PM dep).
- `find/plugin.ts` — the ProseMirror plugin glue + commands.

The current `reapply()` function (line 54) duplicates apply-time logic — fold into the reducer.

## Phase 58 — Split `editor/io/typography.ts` (173 LOC)

Already partly addressed by Phase 27. Final layout:
```
editor/io/typography/constants.ts   ← FONT_FAMILIES, TYPOGRAPHY, PAGE, FONT_VARIANTS, BlockKind, BlockTypography
editor/io/typography/units.ts        ← Phase 27
editor/io/typography/docxStyles.ts   ← buildDocxStyles, paragraphStyleFromBlock, buildDocxPageProperties
editor/io/typography/index.ts        ← re-exports for back-compat
```
The constant `TYPOGRAPHY` should rename to `BLOCK_TYPOGRAPHY_PRESETS` (Phase 64).

## Phase 59 — Split `editor/tiptap/Toolbar.tsx` (140 LOC)

Extract `<TextFormattingZone>`, `<BlockFormattingZone>`, `<InsertZone>`, `<PaneToggleZone>`. Toolbar.tsx becomes the orchestrator (~50 LOC). Also: the `onToast: _onToast` prop (line 50) is unused — remove it from the props (and from `EditorHost.tsx:117` callsite).

## Phase 60 — `toggleEmojiPresence` — extract pure helper

`containers/editor/hooks/useCommentOps.ts:30-55` has the same 9-line membership-toggle logic in both branches of `toggleReaction`. Extract:
```ts
// editor/comments/reactions.ts
export const toggleEmojiPresence = (
    reactions: Record<string, string[]> | undefined,
    emoji: string,
    userId: string,
): Record<string, string[]> => { ... };
```
Both branches collapse to one call. Tests: add to empty, remove last, toggle while others present.

## Phase 61 — Split `containers/editor/components/comments/CommentsSidebar.tsx` (207 LOC)

Extract:
```
hooks/useCommentCallbacks.ts      ← all 12 callbacks; returns { callbacksMap, handleClose, handleEditSubmit }
components/comments/OpenCommentList.tsx
components/comments/ResolvedCommentList.tsx
CommentsSidebar.tsx               ← shell: header + filters + lists, ~80 LOC
```
The eslint-disable for `exhaustive-deps` (line 131) goes away because dep tracking is explicit.

Add a unit test for `useCommentCallbacks`.

## Phase 62 — Split `containers/editor/components/comments/CommentThreadCard.tsx` (173 LOC)

Extract `<ThreadHeader>` (lines 62–86), `<ThreadEditor>` (the compose-form wrapping at 89–114), `<ThreadReplies>` (133–155). Card body becomes ~60 LOC.

## Phase 63 — Split `containers/editor/components/versions/VersionDiffModal.tsx` (184 LOC)

Extract `<DiffRichView>` (the rich + sbs branch lines 147–167) and `<DiffMarkdownView>` (168–179). Move `READ_ONLY_EXTENSIONS` to `editor/versions/readOnlyExtensions.ts`. Modal shell becomes ~80 LOC.

## Phase 64 — Rename ambiguous editor APIs

| Old | New | Why |
|---|---|---|
| `usePaneState.rail()` | `usePaneState.collapseToRail()` | "rail" alone is ambiguous |
| `usePaneState.cycle()` | OK; add JSDoc documenting cycle order | currently undocumented |
| `readStatus(provider)` | `getProviderSyncStatus(provider)` (Phase 51) | doesn't read as side-effect-free |
| `DragState` (in `useBlockDragDrop`) | `BlockDragState` | overly generic |
| `TYPOGRAPHY` | `BLOCK_TYPOGRAPHY_PRESETS` | overly generic |
| `useGlossary` (returns entries) inside `GlossaryPanel.tsx` | `useGlossaryEntries` | matches return shape |
| `colorFromName` (Avatar) | `paletteColorForName` | calling convention |

## Phase 65 — `CommentAnchors` — fix recompute dep tracking

`containers/editor/components/comments/CommentAnchors.tsx:80` uses an eslint-disable + a stringified `threadKey` to dodge dep checking. The compute closure reads `threads` directly. Replace:
1. Use `useMemo` to derive a stable input.
2. Pass `threads` (array) explicitly into compute.
3. Drop the eslint-disable.

## Phase 66 — `GlossaryHighlight` — fix unsafe casts in `refreshGlossaryDecorations`

`editor/glossary/GlossaryHighlight.ts:102-106` performs nested `as unknown as` casts on the editor view. Replace by using `EditorView` types from `@tiptap/pm/view` directly:
```ts
export function refreshGlossaryDecorations(view: EditorView) {
    view.dispatch(view.state.tr.setMeta(REFRESH_META, true));
}
```

---

# Domain panels: glossary, meta, mentions, versions

## Phase 67 — Glossary: container/presenter + typed Yjs map

`containers/editor/components/glossary/GlossaryPanel.tsx` mixes hook (`useGlossary`), presenter (`<GlossaryPanel>`), and Yjs map ops.

1. Move `useGlossary` to `editor/glossary/useGlossaryEntries.ts` (Phase 64 rename).
2. Move map operations (`save`, `remove`, `startEdit`) into `editor/glossary/glossaryOps.ts`: pure `addEntry(map, draft)`, `updateEntry(map, id, patch)`, `deleteEntry(map, id)`. Each takes the `Y.Map<StoredEntry>` as a parameter.
3. `GlossaryPanel.tsx` becomes presentational only.
4. Add tests for `glossaryOps.ts`.

## Phase 68 — Meta: container/presenter

After Phase 23 (status field decision), do the same separation for `MetaPanel.tsx`:
1. Move `useMeta(doc)` and `set()` to `editor/meta/useDocumentMeta.ts` returning `{ meta, setMetaField }`.
2. Validate `targetWords ≥ 0` inside `setMetaField`.
3. The component becomes a layout-only file.

## Phase 69 — Mentions: ADT + pure helpers

`containers/editor/components/comments/MentionTextarea.tsx`:
1. After Phase 32, the local `ROLES` array (lines 16–24) goes away.
2. Extract `buildCandidates`, `renderBodyWithMentions` to `editor/comments/mentions.ts` — they are pure.
3. After Phase 34, `MentionKind` is used in candidate types.
4. Add tests: dedup by name, role-vs-user classification of `@editor` vs `@unknownuser`.

## Phase 70 — Versions: explicit storage schema versioning

`containers/editor/hooks/useVersions.ts` persists snapshots in `localStorage` keyed by `przeswity.versions:<bookId>`. No schema version → silent corruption on field rename. Two issues:
1. Add `SCHEMA_VERSION = 1` field on the persisted payload. On read mismatch: bail to empty + log.
2. Catch `QuotaExceededError` on write — surface a toast and stop persisting until next reload. Today the `try/catch` (line 22) only guards reads.
3. Cap total bytes (e.g. 2 MB); evict oldest auto if exceeded.

(Long-term, snapshots should move to backend — out of scope here, documented in Phase 79's editor README.)

## Phase 71 — `useBookActions` → discriminated `BookDraft` ADT

`hooks/api/useBookActions.ts` carries parallel `stageDraft` and `progressDraft` records plus `isPending(bookId)` ORing four signals. Refactor:
```ts
type BookDraft =
    | { kind: 'stage'; stage: BookStage }
    | { kind: 'progress'; progress: number };

const [drafts, setDrafts] = useState<Record<string, BookDraft>>({});
```
Commit dispatches on `kind`. Update `containers/coordinator/components/BooksList.tsx:65-71` consumers — replace the inline `actions.setStageDraft((p) => ({ ...p, [book.id]: ... }))` with `actions.setStageDraft(book.id, value)`.

## Phase 72 — `BooksList`/`BooksTimeline` — projected `BookCardModel`

`BooksList.tsx` and `BooksTimeline.tsx` independently compute "label for last activity", "attention class", "unassigned dot", "progress %". Extract a projection in `containers/coordinator/hooks/booksDashboardSelectors.ts`:
```ts
export interface BookCardModel {
    id: string;
    title: string;
    attention: BookAttention;
    lastActivityKey: 'none' | 'today' | 'yesterday' | 'daysAgo'; // localized at view layer
    daysAgo: number;
    isUnassigned: boolean;
    progressPct: number;
}
export const toBookCardModel = (book: BookSummary): BookCardModel => ...
```
Both views iterate the projected models. Tests in `booksDashboardSelectors.test.ts`.

## Phase 73 — `BooksList` row memo: simplify or remove

`containers/coordinator/components/BooksList.tsx:75-80` writes a custom memo comparator that pokes inside `actions.stageDraft[book.id]`. Fragile — if `actions` shape changes, the comparator silently misses updates. Either:
- Pass only the per-row slice of `actions` (`{ stageDraft, progressDraft }`) so default memo works, **or**
- Drop the memo entirely (the rows aren't expensive enough to warrant fragile manual diffing).

---

# API, routing, types

## Phase 74 — Routing: `requireRole` helper + role-gated route blocks

After Phase 44, gate admin/coordinator routes via:
```ts
// app/router.ts
export const requireRole = (predicate: (u: SessionUser) => boolean) =>
    async ({ context }: { context: RouterContext }) => {
        if (!context.user || !predicate(context.user)) throw redirect({ to: '/' });
    };
```
Use in `routes/_app/admin/*.tsx`, `routes/_app/coordinator/*.tsx`. One line per route.

## Phase 75 — API interceptor hardening

`api/interceptors.ts`:
1. The `__retried` boolean lives as a property on the `Request` object — works because `Request` is reused across fetches, but undocumented. Add a one-line comment explaining the contract.
2. Replace `RetryableRequest` augmentation with a `WeakSet<Request>` of attempted requests; safer and doesn't mutate inputs.
3. Extract `buildLoginRedirectUrl(currentPath, currentSearch): { to: string; search: { next: string } }` — used both in interceptor and `routes/_app.tsx:13, 19-22`.
4. Add a unit test exercising 401 → refresh OK → retry, and 401 → refresh fail → redirect.

## Phase 76 — Strip `as never` casts on router search params

`routes/_app.tsx:13, 21`, `components/layout/AppTopBar.tsx:21`, `containers/editor/components/UserMenu.tsx:19`, `api/interceptors.ts:31` all do `search: {} as never`. Fix the router type for `/login`'s search schema (`{ next?: string; reason?: string }`) so the casts go away.

## Phase 77 — Strip `as unknown as` casts on Hocuspocus runtime

`containers/editor/hooks/useConnectionStatus.ts:12, 32` casts `provider as unknown as HocuspocusProviderRuntime` because the public types don't expose private fields. After Phase 51, the cast lives in one place: `editor/collab/syncStatus.ts`. Document why (private SDK fields) and add a guard so a future SDK upgrade can't silently break.

---

# Tests & docs hand-off

## Phase 78 — Targeted tests for newly-extracted helpers

| Helper | Phase | Test file |
|---|---|---|
| `toggleEmojiPresence` | 60 | `editor/comments/reactions.test.ts` |
| `useCommentCallbacks` | 61 | `containers/editor/hooks/useCommentCallbacks.test.tsx` |
| `useBookActions` (ADT) | 71 | extend `containers/coordinator/hooks/useBookActions.test.ts` |
| `getProviderSyncStatus` | 51 | `editor/collab/syncStatus.test.ts` |
| `toBookCardModel` | 72 | `containers/coordinator/hooks/booksDashboardSelectors.test.ts` |
| `buildCandidates`, `renderBodyWithMentions` | 69 | `editor/comments/mentions.test.ts` |
| `addEntry`, `updateEntry`, `deleteEntry` | 67 | `editor/glossary/glossaryOps.test.ts` |
| `walkHunks` (diff) | 49 | `editor/diff/buildDiffDocument.test.ts` |
| `requireRole` | 74 | `app/router.test.ts` |
| `useFormDialog` toast | 43 | extend `hooks/useFormDialog.test.tsx` |
| `BookStage` / `allowedNextStages` | 30 | `lib/stage.test.ts` |
| `useLocalStorageState` | 39 | `utils/storage/useLocalStorageState.test.ts` |

Snapshot-test exports of `lib/status.ts`, `lib/dates.ts`, `lib/auth.ts`, `lib/user.ts` so future drift surfaces.

## Phase 79 — `frontend/README.md`

Cover:
- Directory layout: `containers/` (route-bound, business-aware), `components/` (route-agnostic, dumb), `editor/` (TipTap/Yjs internals — never imports from `containers/`), `hooks/api/` (React-Query wrappers), `lib/` (pure helpers).
- i18n workflow: add to `pl` first, mirror to `en`/`ua`, run `check-locales`. Namespace map.
- Forms pattern: `useFormDialog`. Toast policy via Sonner.
- Cache invalidation: per-resource hooks. Resource → query-key map.
- Role/permission matrix: `SystemRole` (org-wide) vs `Role` (per-document). When to use each.
- Constants: `lib/constants.ts` for app, `editor/constants.ts` for editor.
- How to add a new route, dialog, editor pane.

## Phase 80 — `containers/editor/README.md` + ADRs

`containers/editor/README.md`:
- Data flow diagram: `useCollabSession` → Yjs doc → TipTap editor (via `useEditorInit`) → panes & sidebars (via `EditorContext`).
- Why `EditorContext` exists (decision record link).
- Where state lives: which Yjs maps own what (`comments`, `glossary`, `meta`), which pieces live in localStorage (versions, pane state).
- How to add a new TipTap extension.
- Versions: the v0 localStorage scheme + planned v1 backend migration (Phase 70).

`docs/adr/`:
- `001-editor-context-vs-refs.md` (Phase 53)
- `002-yjs-vs-api-ownership.md` (Phase 23)
- `003-form-dialog-pattern.md` (Phase 42)
- `004-localstorage-scheme.md` (Phases 39, 70)
- `005-sonner-vs-internal-toast.md` (Phase 40)

---

# Phase ordering & dependencies

| # | Phase | Risk | Depends on |
|---|---|---|---|
| 0 | Baseline | – | – |
| 1 | ESLint warns | low | – |
| 2 | Ban relative imports | low | – |
| 3 | i18n hardcoded-text rule (warn) | low | – |
| 4 | check-locales hardening | low | – |
| 5–13 | i18n: editor panels & toolbar attrs | low | – |
| 14–17 | i18n: roles & badges | low | 32 (or co-merge) |
| 18 | i18n: useDocumentImport | low | – |
| 19 | i18n: link prompt strings | low | 41 |
| 20 | i18n: glossary tooltip | low | – |
| 21 | i18n: AI ops | low | 33 |
| 22 | i18n: book stages SSOT | low | 30 |
| 23 | i18n: MetaPanel status decision | med | – |
| 24 | Lock i18n via ESLint | low | 5–23 |
| 25 | App constants | low | – |
| 26 | Editor constants | low | – |
| 27 | Typography units | low | – |
| 28 | Drag predicate | low | 26 |
| 29 | CommentStatus enum | low | – |
| 30 | BookStage enum | low | – |
| 31 | SuggestionType enum | low | – |
| 32 | Single Role enum | low | – |
| 33 | AiResult ADT | low | – |
| 34 | MentionKind enum | low | – |
| 35 | Exhaustive switches | low | 29–34 |
| 36 | Drop redundant useCallback | low | – |
| 37 | usePaneState flags | low | – |
| 38 | usePaneState inline | low | – |
| 39 | useLocalStorageState | low | – |
| 40 | Sonner consolidation | med | – |
| 41 | Replace window.confirm/prompt | med | 40 |
| 42 | useFormDialog migrations | med | 44 |
| 43 | Toast policy | low | 40, 42 |
| 44 | lib/auth.ts | low | – |
| 45 | Cache hooks | low | – |
| 46 | Dedupe formatLastActivity | low | – |
| 47 | Dedupe MAMMOTH_STYLE_MAP | low | – |
| 48 | Single Avatar | low | – |
| 49 | Diff walker dedupe | low | – |
| 50 | Import dedupe | low | 18, 41 |
| 51 | getProviderSyncStatus | low | – |
| 52 | useEditorBootstrap | low | – |
| 53 | EditorContext (ambient refs) | high | 26, 32 |
| 54 | useAwarenessSync | low | 26, 53 |
| 55 | Drag state hook | low | 53 |
| 56 | Drop click-callback refs | low | 53 |
| 57 | Split FindReplace | low | 26 |
| 58 | Split typography | low | 27 |
| 59 | Split Toolbar | low | – |
| 60 | toggleEmojiPresence | low | 29 |
| 61 | Split CommentsSidebar | med | 60, 35 |
| 62 | Split CommentThreadCard | low | 61 |
| 63 | Split VersionDiffModal | low | – |
| 64 | Renames | low | 51, 67 |
| 65 | CommentAnchors deps | low | 29 |
| 66 | Glossary unsafe casts | low | – |
| 67 | Glossary container/presenter | low | 5, 66 |
| 68 | Meta container/presenter | low | 6, 23 |
| 69 | Mentions helpers | low | 32, 34 |
| 70 | Versions schema | low | 39 |
| 71 | useBookActions ADT | med | 30 |
| 72 | BookCardModel | low | – |
| 73 | BooksList memo | low | 71 |
| 74 | requireRole | low | 44 |
| 75 | Interceptor hardening | low | – |
| 76 | Strip as-never casts | low | 75 |
| 77 | Strip Hocuspocus casts | low | 51 |
| 78 | Targeted tests | low | 5–77 |
| 79 | frontend README | low | all |
| 80 | editor README + ADRs | low | all |

---

# Out of scope (consciously deferred)

- React 19 / TanStack Router 2.x upgrades.
- Tailwind / shadcn token migration; replacement of native `<input>`/`<button>` in editor with shadcn primitives. Do once; out of scope here.
- Replacing `better-auth` or moving auth cookies.
- `api/generated/*` regeneration handling.
- Performance work (virtualization, route-level code splitting beyond Vite defaults). File a `docs/perf-followups.md` if profiling shows hotspots.
- Replacing `editor/ai/aiOps.ts` mocks with real backend (`fakeRephrase`, `fakeFactCheck`). Track in `docs/ai-followups.md`.

---

# Definition of done

- All 80 phases merged.
- `npm run typecheck && npm run lint && npm run test && npm run check-locales && npm run build` green.
- ESLint blocks new relative cross-directory imports (Phase 2) and hardcoded JSX text (Phase 24).
- No file in `containers/` or `editor/` exceeds 200 LOC unless its file header documents why.
- No `useRef` exists purely to dodge stale closures; ambient state flows through one explicit `EditorContext`.
- No string-literal unions for related constants; every related constant set is a TS string enum.
- No hardcoded user-visible English strings: every JSX text and every `title=`/`placeholder=`/`aria-label=` goes through `t()`. `npm run check-locales` enforces parity.
- No `window.confirm` / `window.prompt` / `window.alert` calls.
- Single toast system (Sonner). Single Avatar implementation. Single MAMMOTH style map. Single document-import code path.
- Dialogs across the app share `useFormDialog`; cache invalidations share per-resource hooks; toast policy is consistent.
- A new developer can read `frontend/README.md` and `containers/editor/README.md` and add a new editor pane in under an hour.
