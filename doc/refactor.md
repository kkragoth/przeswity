# Frontend Refactor Plan

> **Adverse-review status:** This plan was reviewed by Codex (`codex:rescue`) after the first draft. All 4 BLOCKERs and most MAJORs were addressed inline. Notable patches:
> - Package manager corrected to **`npm`** (root `package-lock.json`, no pnpm lockfile).
> - Comments + Versions tasks now `git mv` files explicitly before rewriting them.
> - `containers/editor/EditorHost.tsx` is imported by full path, not barrel.
> - Coordinator stage/progress mutation state extracted as new Task 6.4a (was silently dropped).
> - `useCommentOps` Yjs boundary made explicit (`getThreadMap(doc)` → `Y.Map.set/delete`).
> - `useCommentDrafts.applyEdit` removed; UI vs Yjs ownership split documented.
> - `lib/dates.daysSince` returns `MISSING_DATE_DAYS = 999` sentinel (not null) to preserve coordinator sort order.
> - `allowedNextStages` keeps `Book['stage']` typed signature.
> - `StatusFilter` becomes `enum CommentStatusFilter` (CLAUDE.md compliance).
> - EditorHost lifecycle requirements (fonts cancel, collab destroy, `key={collab.id}` remount, scoped ToastProvider) listed as a contract Phase 10 must satisfy.
> - Tasks 8.6 and old 9.20 split into smaller dispatches (each ≤ one Sonnet concern).
> - Per-phase Codex checkpoints inserted in Phases 3, 4, 5, 9a, 9b, 9c.
> - All three docx importers (TopBar, FileMenu, ExportMenu) listed in Task 8.3.
> - CSS-import sweep added to Task 8.1.

> **For agentic workers (Opus orchestrator):** This plan is designed to be executed by **Claude Opus dispatching Claude Sonnet subagents** task-by-task. Use the `superpowers:subagent-driven-development` skill. Each task below is one Sonnet dispatch. Tasks are sized so a single Sonnet session can complete them with verification.
>
> **DO NOT** execute tasks yourself in the orchestrator session — you are the planner and reviewer. Dispatch one subagent per task, review the diff, then dispatch the next.

**Goal:** Refactor `frontend/src/` from a route-heavy, god-component layout into a clean `containers/<domain>/{components,hooks}/` layout. Hand off to a team of devs who hate god classes. Each component lives in its own file. Reusable logic lives in hooks/utils.

**Architecture target:**
- `routes/` — TanStack route definitions only. Auth gate, redirect, params, render thin container. Target: every route file ≤ 60 LOC.
- `containers/<domain>/` — page composition + orchestration. `<domain>/components/` for domain-specific UI, `<domain>/hooks/` for domain-specific state.
- `components/` — truly shared, presentational primitives.
- `hooks/` — generic app-wide hooks.
- `lib/` — pure utilities.
- `editor/` — kept for Tiptap engine code (extensions, schema, IO). Orchestration/UI moves to `containers/editor/`.
- All cross-directory imports use `@/` alias (already configured: `tsconfig.json` has `"@/*": ["src/*"]`).

**Tech Stack:** React 18, TypeScript, Vite, TanStack Router/Query, Tiptap 3, Zustand, Radix, Tailwind, i18next.

**Hard rules (project's CLAUDE.md):**
- ≤ 200 LOC per file.
- One component per file.
- Always use `@/` for cross-directory imports — never `../`.
- TS enums (string-valued) for related constants.
- ADTs (discriminated unions) over flag-bag objects.
- All user-facing strings via `t()`; add to `en/`, `pl/`, `ua/` translation files.
- Pure functions with descriptive parameters > closures over ambient state.

---

## Execution Protocol

### How to dispatch each task

1. **Read this doc**, find the next unchecked `- [ ]` task.
2. **Dispatch a Sonnet subagent** via the `Agent` tool (`subagent_type: general-purpose`, `model: sonnet`). Brief prompt:
   - Quote the task heading + the full task body verbatim.
   - State: "You are executing one task from the frontend refactor plan at `doc/refactor.md`. Read the task. Read source files mentioned. Make exact changes. Run verification commands. Commit. Report back: files changed, verification output."
   - Tell it NOT to invent scope.
3. **When subagent reports back**, do these in parallel:
   - Read the diff (`git diff HEAD~1`).
   - Run `cd frontend && pnpm typecheck && pnpm lint && pnpm test --run` yourself.
4. **If green** → mark task `- [x]`, commit the doc update, dispatch next.
5. **If red** → dispatch a Sonnet fixer with the failure log and the original task body. Don't accumulate broken state.

### Codex adverse review checkpoints

After every **phase boundary** (marked `### CHECKPOINT — codex review`), invoke the `codex:rescue` skill against the diff for that phase:
- Skill prompt: "Adverse-review the diff between `<phase-start-sha>..HEAD`. Flag: god classes still present, files >200 LOC, mixed concerns, dead code, broken imports, accidental behavior changes, missing i18n keys, inline math/coordinate comparisons, relative imports, breakages of stated contracts. Be harsh. Do not propose new features."
- Address every concern Codex raises before crossing the checkpoint.

### Verification commands (run from `frontend/`)

> **Package manager: `npm`.** The repo has root `package-lock.json` (no pnpm/yarn lockfile). Use `npm`, not `pnpm`. Pass vitest flags after `--`.

```bash
npm run typecheck       # tsc -b --noEmit
npm run lint            # eslint .
npm test -- --run       # vitest (note the -- to pass --run through)
npm run build           # tsc + vite build
npm run check-locales   # validates en/pl/ua parity
```

Every task ends with **at minimum**: `npm run typecheck && npm run lint`. Tasks that touch logic also run `npm test -- --run`. Tasks that touch i18n run `npm run check-locales`. Phase end runs `npm run build`.

### Commit hygiene

- One commit per completed task. Format: `refactor(<domain>): <what>`.
- Examples: `refactor(auth): extract LoginPage container + useLoginForm hook`.
- Mass moves get prefix `chore(refactor):`.
- Never push without explicit user confirmation. Don't push at all in this plan; user will push at end.

### Subagent prompt template

```
You are executing one task from the frontend refactor plan at `doc/refactor.md`.

TASK (verbatim from the plan):
<<<paste task heading + body>>>

Rules:
- Read the source files referenced before writing.
- Use the `@/` alias for cross-directory imports.
- Keep all files ≤ 200 LOC. If a file you create exceeds that, stop and report.
- Preserve existing behavior exactly. Do not add features. Do not refactor outside the task scope.
- Add new i18n keys to en/, pl/, ua/ if you introduce user-visible strings.
- After changes: run `cd frontend && npm run typecheck && npm run lint`. If they pass, commit.
- Report: files changed, LOC of each new file, verification output, anything weird you saw.
```

---

## Target Directory Layout

```
frontend/src/
├── app/                                # router, queryClient (UNCHANGED)
├── api/                                # generated + interceptors (UNCHANGED)
├── auth/                               # better-auth client (UNCHANGED)
├── i18n/                               # i18next setup (UNCHANGED)
│
├── routes/                             # Thin route shells only
│   ├── __root.tsx
│   ├── _app.tsx
│   ├── _public.tsx
│   ├── _public/login.tsx               # → renders <LoginPage />
│   ├── _app/index.tsx
│   ├── _app/books.index.tsx            # → <BooksListPage />
│   ├── _app/books.$bookId.tsx          # → <BookEditorPage />
│   ├── _app/settings/index.tsx         # → <SettingsPage />
│   ├── _app/admin/index.tsx
│   ├── _app/admin/users.tsx            # → <AdminUsersPage />
│   ├── _app/coordinator/index.tsx      # → <CoordinatorDashboard />
│   └── _app/coordinator/books.new.tsx  # → <NewBookPage />
│
├── containers/                         # Page orchestration
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── components/DevQuickLogin.tsx
│   │   └── hooks/useLoginForm.ts
│   ├── settings/
│   │   ├── SettingsPage.tsx
│   │   └── hooks/useProfileSettings.ts
│   ├── books/
│   │   ├── BooksListPage.tsx
│   │   ├── BookEditorPage.tsx
│   │   ├── components/
│   │   │   ├── BookRow.tsx
│   │   │   └── BookStatusBadge.tsx
│   │   └── hooks/useBookContext.ts
│   ├── coordinator/
│   │   ├── CoordinatorDashboard.tsx
│   │   ├── NewBookPage.tsx
│   │   ├── components/
│   │   │   ├── KpiCard.tsx
│   │   │   ├── BooksList.tsx
│   │   │   ├── BooksTimeline.tsx
│   │   │   ├── FilterChip.tsx
│   │   │   └── CoordinatorStatusBadge.tsx
│   │   └── hooks/
│   │       ├── useBooksDashboard.ts
│   │       └── useNewBookForm.ts
│   ├── admin/
│   │   ├── UsersPage.tsx
│   │   ├── components/
│   │   │   ├── UsersTable.tsx
│   │   │   ├── UserRow.tsx
│   │   │   ├── NewUserDialog.tsx
│   │   │   ├── EditUserDialog.tsx
│   │   │   ├── DeleteUserButton.tsx
│   │   │   └── SystemRoleBadge.tsx
│   │   └── hooks/useUserForm.ts
│   └── editor/
│       ├── EditorHost.tsx                  # session wiring only
│       ├── EditorLayout.tsx                # pane layout JSX only
│       ├── components/
│       │   ├── TopBar.tsx
│       │   ├── StatusBar.tsx
│       │   ├── LeftPane.tsx
│       │   ├── RightPane.tsx
│       │   ├── BlockMenu.tsx
│       │   ├── BookTitleMenu.tsx
│       │   ├── UserMenu.tsx
│       │   ├── EmptyState.tsx              # editor's empty state (was app/EmptyState.tsx)
│       │   ├── comments/
│       │   │   ├── CommentsSidebar.tsx
│       │   │   ├── CommentThreadCard.tsx
│       │   │   ├── CommentThreadForm.tsx
│       │   │   ├── CommentReply.tsx
│       │   │   ├── CommentFilters.tsx
│       │   │   ├── CommentAnchors.tsx
│       │   │   ├── MentionTextarea.tsx
│       │   │   └── Reactions.tsx
│       │   ├── versions/
│       │   │   ├── VersionsPanel.tsx
│       │   │   ├── VersionsList.tsx
│       │   │   ├── VersionSnapshot.tsx
│       │   │   └── VersionDiffModal.tsx
│       │   ├── suggestions/
│       │   │   └── SuggestionsSidebar.tsx
│       │   ├── outline/
│       │   │   └── OutlineSidebar.tsx
│       │   ├── glossary/
│       │   │   └── GlossaryPanel.tsx
│       │   ├── meta/
│       │   │   └── MetaPanel.tsx
│       │   └── workflow/
│       │       ├── ShortcutsModal.tsx
│       │       └── TemplatesMenu.tsx
│       └── hooks/
│           ├── useFontsReady.ts
│           ├── useEditorInit.ts
│           ├── useBlockMenu.ts
│           ├── useCommentOps.ts
│           ├── useCommentThreads.ts
│           ├── useCommentDrafts.ts
│           ├── useVersions.ts
│           ├── useAutoSnapshot.ts
│           ├── useDocumentImport.ts
│           ├── useDocumentExport.ts
│           ├── usePaneState.ts
│           ├── usePeers.ts
│           ├── useConnectionStatus.ts
│           ├── useTargetWords.ts
│           ├── useReadingStats.ts
│           ├── useSuggestingMode.ts
│           └── useDocumentKeyDown.ts       # was useGlobalShortcuts
│
├── components/                         # Shared presentational
│   ├── ui/                             # shadcn primitives (UNCHANGED)
│   ├── layout/
│   │   ├── AppTopBar.tsx
│   │   └── PageLayout.tsx
│   ├── forms/
│   │   └── ReadOnlyField.tsx
│   ├── tables/
│   │   └── DataTable.tsx
│   ├── feedback/
│   │   ├── ConfirmDialog.tsx
│   │   ├── EmptyState.tsx
│   │   └── PresenceDot.tsx
│   ├── badges/
│   │   └── RoleBadge.tsx
│   └── people/
│       ├── PeoplePicker.tsx
│       ├── AssignmentList.tsx
│       └── hooks/usePeoplePickerState.ts
│
├── hooks/                              # Generic
│   ├── useFormDialog.ts
│   └── useListWithCreate.ts
│
├── lib/
│   ├── utils.ts                        # cn() (UNCHANGED)
│   ├── status.ts                       # book status enums + helpers
│   ├── user.ts                         # userInitials, name helpers
│   ├── routes.ts                       # isImmersiveRoute
│   └── dates.ts                        # daysSince, formatActivity
│
└── editor/                             # Tiptap engine (renamed from src/editor/editor/*)
    ├── tiptap/
    │   ├── EditorView.tsx
    │   ├── extensions.ts
    │   ├── Toolbar.tsx
    │   ├── ToolbarPrimitives.tsx
    │   ├── BubbleToolbar.tsx
    │   ├── HeaderFooterBar.tsx
    │   ├── FileMenu.tsx
    │   ├── StyleDropdown.tsx
    │   ├── contextItems.ts
    │   ├── blocks/
    │   ├── slash/
    │   ├── formatting/
    │   ├── find/
    │   └── hooks/
    │       ├── useHeaderFooterSync.ts
    │       ├── useBlockHover.ts
    │       ├── useBlockDragDrop.ts
    │       ├── useEditorContextMenu.ts
    │       └── useCommentScrollPulse.ts
    ├── io/
    │   ├── docx/
    │   │   ├── index.ts                # exports docxFromJson()
    │   │   ├── blocks.ts
    │   │   ├── inlines.ts
    │   │   ├── headerFooter.ts
    │   │   └── fonts.ts
    │   ├── markdown.ts
    │   ├── typography.ts
    │   └── typography-css.ts
    ├── collab/yDoc.ts
    ├── identity/{storage.ts,types.ts}
    ├── ai/aiOps.ts
    ├── workflow/templates.ts
    ├── suggestions/{TrackChange.ts,SuggestionMode.ts,suggestionOps.ts,types.ts}
    ├── glossary/GlossaryHighlight.ts
    ├── versions/{diffDoc.ts,types.ts}
    ├── comments/{Comment.ts,color.ts,threadOps.ts,types.ts,useThreads.ts}
    ├── shell/{Avatar.tsx,Toast.tsx,ContextMenu.tsx}
    ├── types.ts                        # shared JSONNode, etc.
    └── utils.ts                        # makeId, sharedish helpers
```

> **Naming conflict alert:** the current `src/editor/editor/` (Tiptap engine) collides with `src/editor/` (entire feature). After phase 10, the engine moves to `src/editor/tiptap/` and orchestration moves to `src/containers/editor/`.

---

## Phase 0 — Baseline & Scaffold

### CHECKPOINT — capture green baseline

- [ ] **Task 0.1: Capture baseline**
  - **Action:** Run all verification. Save output.
  - **Files touched:** none.
  - **Steps:**
    1. `cd frontend && npm install`
    2. Run: `npm run typecheck > /tmp/baseline-typecheck.log 2>&1; npm run lint > /tmp/baseline-lint.log 2>&1; npm test -- --run > /tmp/baseline-test.log 2>&1; npm run build > /tmp/baseline-build.log 2>&1`
    3. Append exit codes + summaries to `doc/refactor-baseline.md`.
    4. Commit: `chore(refactor): capture baseline`.
  - **Verification:** all four logs end with success or document known existing failures.

- [ ] **Task 0.2: Create empty target directories**
  - **Action:** Create directory tree (with `.gitkeep` placeholders) for the target layout above.
  - **Files to create:** `containers/{auth,settings,books,coordinator,admin,editor}/{components,hooks}/.gitkeep` (and editor sub-trees), `components/{layout,forms,tables,feedback,badges}/.gitkeep`, `hooks/.gitkeep`, `lib/.gitkeep`.
  - **Verification:** `find frontend/src/containers frontend/src/hooks -type d | sort`.
  - **Commit:** `chore(refactor): scaffold target dirs`.

---

## Phase 1 — Shared Lib & Types

Pure utilities first. Nothing depends on UI yet.

- [ ] **Task 1.1: Create `lib/dates.ts`**
  - **Source of truth:** existing `daysSince()` and `formatActivity()` in `routes/_app/coordinator/index.tsx` + `routes/_app/books.index.tsx`.
  - **Exports:** `daysSince(dateLike: string | Date | null | undefined): number`, `formatActivity(date: string | Date | null | undefined, t: TFunction): string`, `MISSING_DATE_DAYS = 999` (exported sentinel).
  - **Behavior preservation:** `daysSince` MUST return `MISSING_DATE_DAYS` for nullish input — current coordinator sort relies on missing dates being "very old". Do NOT return `null`. Codex flagged this; honoring it preserves sort order.
  - **Constraints:** pure functions, no React. Make `now: () => Date = () => new Date()` an injectable parameter for testability.
  - **Test:** `lib/dates.test.ts` — daysSince(yesterday) === 1, undefined → 999, formatActivity over 30d → "X days ago".
  - **Verification:** `npm test -- --run lib/dates`.
  - **Commit:** `refactor(lib): extract date helpers`.

- [ ] **Task 1.2: Create `lib/status.ts`**
  - **Purpose:** Centralize book-status, attention, recency, and stage logic.
  - **Exports (preserve existing types — do NOT widen):**
    - `enum BookAttention { Stale = 'stale', Active = 'active', Normal = 'normal' }`
    - `isAttentionBook(book: BookSummary): boolean`
    - `isRecentBook(book: BookSummary): boolean`
    - `isStaleDays(days: number): boolean`
    - `bookAttention(book: BookSummary): BookAttention`
    - `allowedNextStages(stage: Book['stage']): Book['stage'][]` — keep the existing `Book['stage']` typed signature from `routes/_app/coordinator/index.tsx:336`. The transition map MUST keep its `Record<Book['stage'], Book['stage'][]>` type. Do not weaken to `string`.
  - **Source:** routes/_app/coordinator/index.tsx, routes/_app/books.index.tsx.
  - **Test:** unit-test each predicate boundary.
  - **Commit:** `refactor(lib): centralize book status helpers`.

- [ ] **Task 1.3: Create `lib/user.ts`**
  - **Exports:** `userInitials(name: string | undefined, fallback?: string): string`, `displayName(user: { name?: string; email?: string }): string`.
  - **Source:** existing `userInitials` in `components/AppTopBar.tsx`.
  - **Test:** initials of "Anna Nowak" → "AN", empty → fallback or "??".
  - **Commit:** `refactor(lib): extract user display helpers`.

- [ ] **Task 1.4: Create `lib/routes.ts`**
  - **Exports:** `isImmersiveRoute(pathname: string): boolean`.
  - **Source:** logic currently in `routes/_app.tsx`.
  - **Test:** book editor URL → true, dashboard → false.
  - **Commit:** `refactor(lib): extract immersive route predicate`.

- [ ] **Task 1.5: Create `editor/types.ts`**
  - **Exports:** `JSONNode`, `JSONDoc`, `JSONInline` — extracted from inline copies in `editor/io/docx.ts`, `editor/io/markdown.ts`, `editor/versions/diffDoc.ts`.
  - **Action:** Update three callers to import from `@/editor/types`.
  - **Verification:** `npm run typecheck && npm run lint`.
  - **Commit:** `refactor(editor): unify JSONNode type`.

- [ ] **Task 1.6: Create `editor/utils.ts`**
  - **Exports:** `makeId(): string` (existing duplicate copies in `editor/editor/EditorView.tsx`, `editor/editor/contextItems.ts`, `editor/editor/Toolbar.tsx`).
  - **Action:** Replace all inline `makeId` definitions with import.
  - **Verification:** `npm run typecheck && npm run lint`. Grep `function makeId` → 0 hits in `src/`.
  - **Commit:** `refactor(editor): unify makeId helper`.

### CHECKPOINT — codex review of Phase 1

Run `codex:rescue` on Phase-1 diff. Confirm: no behavior change, all helpers pure, tests cover boundaries.

---

## Phase 2 — Generic Hooks & Shared UI Primitives

- [ ] **Task 2.1: Move `components/ConfirmDialog.tsx` → `components/feedback/ConfirmDialog.tsx`**
  - **Action:** `git mv` then update all importers (grep for `'@/components/ConfirmDialog'`).
  - **Commit:** `refactor(components): regroup feedback primitives`.

- [ ] **Task 2.2: Move `components/EmptyState.tsx`, `PresenceDot.tsx`** under `components/feedback/`. Update importers.

- [ ] **Task 2.3: Move `components/RoleBadge.tsx` → `components/badges/RoleBadge.tsx`. Update importers.

- [ ] **Task 2.4: Move `components/AppTopBar.tsx` → `components/layout/AppTopBar.tsx`. Replace `userInitials` inline with import from `@/lib/user`. Update importers.

- [ ] **Task 2.5: Create `components/forms/ReadOnlyField.tsx`**
  - **Source:** definition in `routes/_app/settings/index.tsx`.
  - **Props:** `{ label: string; value: string; help?: string }`.
  - **Commit:** `refactor(forms): extract ReadOnlyField`.

- [ ] **Task 2.6: Create `components/layout/PageLayout.tsx`**
  - **Purpose:** consistent header + filter bar + content slot used by coordinator/admin/books pages.
  - **Props:** `{ title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; filters?: ReactNode; children: ReactNode }`.
  - **NB:** do NOT migrate pages onto it yet — that happens during each container task. This task only ships the component + a vitest snapshot.
  - **Commit:** `feat(layout): add PageLayout slot wrapper`.

- [ ] **Task 2.7: Create `components/tables/DataTable.tsx`**
  - **Purpose:** simple `<thead>/<tbody>` wrapper with column config. NOT a third-party table — keep dependency-free.
  - **Props:** `{ columns: Array<{ key: string; header: ReactNode; cell: (row: T) => ReactNode; width?: string }>; rows: T[]; getRowKey: (row: T) => string; empty?: ReactNode }`.
  - **Constraint:** ≤ 100 LOC. No sorting/pagination yet (YAGNI).
  - **Test:** renders columns, renders empty, getRowKey used.
  - **Commit:** `feat(tables): add DataTable primitive`.

- [ ] **Task 2.8: Create `hooks/useFormDialog.ts`**
  - **Purpose:** open/close + reset state pattern reused across PeoplePicker / NewUserDialog / EditUserDialog.
  - **Signature:** `useFormDialog<T>(initial: T): { open: boolean; values: T; setValues: Dispatch<SetStateAction<T>>; openWith: (v?: Partial<T>) => void; close: () => void; reset: () => void }`.
  - **Test:** open with overrides, close resets to initial.
  - **Commit:** `feat(hooks): add useFormDialog`.

- [ ] **Task 2.9: Move `components/people/*` keeping the existing `components/people/` location**
  - **Action:** Extract `dedupe()` + draft management out of `PeoplePicker.tsx` into `components/people/hooks/usePeoplePickerState.ts`.
  - **Constraint:** PeoplePicker.tsx must drop to ≤ 130 LOC after extraction.
  - **Commit:** `refactor(people): extract usePeoplePickerState`.

### CHECKPOINT — codex review of Phase 2

Run `codex:rescue` on Phase-2 diff. Verify no orphaned imports, no removed-but-still-referenced files.

---

## Phase 3 — Auth Container

- [ ] **Task 3.1: Create `containers/auth/components/DevQuickLogin.tsx`**
  - **Source:** the dev-only `DevQuickLogin` block currently inline in `routes/_public/login.tsx`.
  - **Constraint:** keep `import.meta.env.DEV` gate — do not always render.
  - **Commit:** `refactor(auth): extract DevQuickLogin`.

- [ ] **Task 3.2: Create `containers/auth/hooks/useLoginForm.ts`**
  - **Purpose:** form state, validation, submit handler with error mapping. Returns `{ values, errors, setField, submit, isSubmitting }`.
  - **Source:** form logic in `routes/_public/login.tsx`.
  - **Constraint:** no JSX. Pure hook. Use `react-hook-form` if it's already used in `frontend/package.json` (it is).
  - **Commit:** `refactor(auth): extract useLoginForm`.

- [ ] **Task 3.3: Create `containers/auth/LoginPage.tsx`**
  - **Action:** assemble form + DevQuickLogin + i18n strings using `useLoginForm`.
  - **Constraint:** ≤ 120 LOC.
  - **Commit:** `refactor(auth): add LoginPage container`.

- [ ] **Task 3.4: Slim `routes/_public/login.tsx`**
  - **Final form:** route definition + `component: () => <LoginPage />`. ≤ 30 LOC.
  - **Verification:** `pnpm typecheck && pnpm test --run && pnpm dev` (manual: open `/login`, attempt login).
  - **Commit:** `refactor(auth): slim login route`.

---

## Phase 4 — Settings Container

- [ ] **Task 4.1: Create `containers/settings/hooks/useProfileSettings.ts`**
  - **Purpose:** form state synced to current session, mutation, error handling. Replace existing `useEffect` eslint-disable with `useEffect` keyed on `session.user.id`.
  - **Returns:** `{ values, setField, save, isSaving, isDirty }`.
  - **Source:** logic in `routes/_app/settings/index.tsx`.
  - **Commit:** `refactor(settings): extract useProfileSettings`.

- [ ] **Task 4.2: Create `containers/settings/SettingsPage.tsx`**
  - **Composition:** profile tab using `ReadOnlyField`, language switcher, password placeholder. ≤ 130 LOC.
  - **Commit:** `refactor(settings): add SettingsPage container`.

- [ ] **Task 4.3: Slim `routes/_app/settings/index.tsx`**
  - **Final form:** route + `<SettingsPage />`. ≤ 30 LOC.
  - **Verification:** dev server smoke (`/settings`).
  - **Commit:** `refactor(settings): slim settings route`.

---

## Phase 5 — Books List Container

- [ ] **Task 5.1: Create `containers/books/components/BookStatusBadge.tsx`**
  - **Props:** `{ book: BookSummary }`. Internally calls `bookAttention(book)` from `@/lib/status`.
  - **Source:** inline `StatusBadge` in `routes/_app/books.index.tsx`.
  - **Commit:** `refactor(books): extract BookStatusBadge`.

- [ ] **Task 5.2: Create `containers/books/components/BookRow.tsx`**
  - **Props:** `{ book: BookSummary; me: SessionUser }`.
  - **Source:** inline `BookRow` in `routes/_app/books.index.tsx`. Use `daysSince`/`formatActivity` from `@/lib/dates`.
  - **Commit:** `refactor(books): extract BookRow`.

- [ ] **Task 5.3: Create `containers/books/hooks/useBookContext.ts`**
  - **Purpose:** derive `{ user, book, assignments, role }` from route context + assignments query. Used by BookEditorPage and possibly book row.
  - **Returns:** `{ book: Book; me: SessionUser; assignments: Assignment[]; myRoles: Role[]; primaryRole: Role | null; isLoading: boolean }`.
  - **Test:** snapshot on a fixture.
  - **Commit:** `refactor(books): add useBookContext`.

- [ ] **Task 5.4: Create `containers/books/BooksListPage.tsx`**
  - Uses `PageLayout`, lists `BookRow` rows.
  - **Constraint:** ≤ 120 LOC.
  - **Commit:** `refactor(books): add BooksListPage container`.

- [ ] **Task 5.5: Slim `routes/_app/books.index.tsx`**
  - **Final form:** route + `<BooksListPage />`. ≤ 30 LOC.

- [ ] **Task 5.6: Create `containers/books/BookEditorPage.tsx`**
  - **Composition:** uses `useBookContext`, renders `<EditorHost {...} />` (will be moved in Phase 10 — for now still imports from `@/editor/EditorHost`).
  - **Commit:** `refactor(books): add BookEditorPage container`.

- [ ] **Task 5.7: Slim `routes/_app/books.$bookId.tsx`** to render `<BookEditorPage />`. ≤ 35 LOC.

### CHECKPOINT — codex review after Phase 3

Run codex on the Phase-3 diff before starting Phase 4. Auth flow is small but security-relevant — review separately.

### CHECKPOINT — codex review after Phase 4

### CHECKPOINT — codex review after Phase 5

---

## Phase 6 — Coordinator Container

- [ ] **Task 6.1: Create `containers/coordinator/components/KpiCard.tsx`** — extracted from `routes/_app/coordinator/index.tsx`. ≤ 60 LOC.

- [ ] **Task 6.2: Create `containers/coordinator/components/FilterChip.tsx`** — extracted toggleable chip. ≤ 40 LOC.

- [ ] **Task 6.3: Create `containers/coordinator/components/CoordinatorStatusBadge.tsx`** — local variant; uses `@/lib/status` predicates. ≤ 50 LOC.

- [ ] **Task 6.4a: Create `containers/coordinator/hooks/useBookActions.ts`**
  - **Purpose:** Extract stage-transition + progress-edit mutation logic currently inline in `BooksList` at `routes/_app/coordinator/index.tsx:164,170,177` (`bookPatchStage`, `bookPatchProgress`, draft state per row).
  - **Returns:** `{ stageDraft: Record<string, Book['stage']>; setStageDraft; commitStage(bookId): Promise<void>; progressDraft: Record<string, number>; setProgressDraft; commitProgress(bookId): Promise<void>; isPending(bookId): boolean }`.
  - **Constraint:** must use `useMutation` and invalidate `['books']` query on success; preserve current optimistic behavior.
  - **Test:** unit-test that committing nullish-or-equal-to-current draft is a no-op (current behavior).
  - **Commit:** `refactor(coordinator): extract useBookActions for stage/progress edits`.

- [ ] **Task 6.4b: Create `containers/coordinator/components/BooksList.tsx`**
  - **Props:** `{ books: BookSummary[]; me: SessionUser }`. Internally calls `useBookActions()` for the row controls. Iterates rows. ≤ 120 LOC.

- [ ] **Task 6.5: Create `containers/coordinator/components/BooksTimeline.tsx`** — timeline view. ≤ 120 LOC.

- [ ] **Task 6.6: Create `containers/coordinator/hooks/useBooksDashboard.ts`**
  - **Purpose:** load books, compute scoping, filtering, KPI aggregates.
  - **Returns:** `{ books, visible, kpis, filters: { showOnlyMine, view, quickFilter, roleFilter }, setFilter, isLoading, roleOptions }`.
  - **Constraints:** all derived state via `useMemo`. Pure selectors live in `containers/coordinator/hooks/booksDashboardSelectors.ts` (also create this file) for unit-testing.
  - **Test:** unit-test selectors against fixture.
  - **Commit:** `refactor(coordinator): extract useBooksDashboard + selectors`.

- [ ] **Task 6.7: Create `containers/coordinator/CoordinatorDashboard.tsx`** — composes the above. ≤ 140 LOC.

- [ ] **Task 6.8: Slim `routes/_app/coordinator/index.tsx`** to render `<CoordinatorDashboard />`. ≤ 35 LOC.

- [ ] **Task 6.9: Create `containers/coordinator/hooks/useNewBookForm.ts`** — form state + create mutation.

- [ ] **Task 6.10: Create `containers/coordinator/NewBookPage.tsx`** — assemble form. ≤ 120 LOC.

- [ ] **Task 6.11: Slim `routes/_app/coordinator/books.new.tsx`** to render `<NewBookPage />`. ≤ 30 LOC.

### CHECKPOINT — codex review of Phase 6

---

## Phase 7 — Admin Container

- [ ] **Task 7.1: Create `containers/admin/components/SystemRoleBadge.tsx`** — extracted `systemRoleBadge` from `users.tsx`. ≤ 30 LOC.

- [ ] **Task 7.2: Create `containers/admin/hooks/useUserForm.ts`**
  - **Purpose:** `UserFormState`, `emptyForm()`, `fromUser(user)`, validation, submit.
  - **Returns:** `{ values, setField, errors, submit, reset }`.
  - **Commit:** `refactor(admin): extract useUserForm`.

- [ ] **Task 7.3: Create `containers/admin/components/NewUserDialog.tsx`** — uses `useUserForm` + `useFormDialog`. ≤ 130 LOC.

- [ ] **Task 7.4: Create `containers/admin/components/EditUserDialog.tsx`** — same shape, edit mode. ≤ 130 LOC.

- [ ] **Task 7.5: Create `containers/admin/components/DeleteUserButton.tsx`** — wraps `ConfirmDialog`. ≤ 50 LOC.

- [ ] **Task 7.6: Create `containers/admin/components/UserRow.tsx`** — table row. ≤ 80 LOC.

- [ ] **Task 7.7: Create `containers/admin/components/UsersTable.tsx`** — uses `DataTable`. ≤ 80 LOC.

- [ ] **Task 7.8: Create `containers/admin/UsersPage.tsx`** — composes table + dialogs. ≤ 130 LOC.

- [ ] **Task 7.9: Slim `routes/_app/admin/users.tsx`** to render `<UsersPage />`. ≤ 30 LOC.

### CHECKPOINT — codex review of Phase 7

---

## Phase 8 — Editor: Engine relocation (rename only, no behavior change)

> This phase is purely structural. It enables Phase 9 and 10 by separating engine code from orchestration code without touching either's logic.

- [ ] **Task 8.1: Move Tiptap engine into `editor/tiptap/`**
  - **Action:** `git mv frontend/src/editor/editor frontend/src/editor/tiptap`.
  - **Action:** Update every `from '@/editor/editor/...'` and every relative import to `from '@/editor/tiptap/...'`. Run these greps and confirm 0 matches after:
    - `grep -rn "from '@/editor/editor" frontend/src`
    - `grep -rn "from '\.\./editor/" frontend/src/editor`
    - `grep -rn "from './editor/" frontend/src/editor`
  - **Also update CSS imports** (Codex finding 16): grep `frontend/src` for `\.css'` strings inside the moved files; rewrite any relative CSS imports to `@/editor/tiptap/...`. Confirmed targets include `editor/EditorHost.tsx:10` (`./styles.css` — stays relative since file does not move yet) and `editor/editor/HeaderFooterBar.tsx:3`.
  - **Verification:** `npm run typecheck && npm run lint && npm run build`.
  - **Commit:** `chore(refactor): rename editor/editor → editor/tiptap`.

- [ ] **Task 8.2: Move Tiptap-internal hooks under `editor/tiptap/hooks/`**
  - **Action:** `git mv` `useHeaderFooterSync.ts`, `useBlockHover.ts`, `useBlockDragDrop.ts`, `useEditorContextMenu.ts`, `useCommentScrollPulse.ts` from `editor/tiptap/` into `editor/tiptap/hooks/`. Update imports.
  - **Commit:** `chore(refactor): regroup tiptap-internal hooks`.

- [ ] **Task 8.3: Split `editor/io/docx.ts` (233 LOC) into 4 files in `editor/io/docx/`**
  - **Files:** `index.ts` (re-exports public `editorToDocxBlob` and `ExportOptions`), `blocks.ts`, `inlines.ts`, `headerFooter.ts`, `fonts.ts`.
  - **Constraint:** each ≤ 100 LOC.
  - **Action:** `editor/io/docx.ts` deleted. **All three current importers must be updated** (Codex finding 15):
    1. `frontend/src/editor/io/ExportMenu.tsx:6,7`
    2. `frontend/src/editor/editor/FileMenu.tsx:17` (will become `editor/tiptap/FileMenu.tsx` after Task 8.1)
    3. `frontend/src/editor/app/TopBar.tsx:16` (will move in Task 9.20)
  - **Verification:** export a doc from dev server, diff binary bytes vs. baseline export — must match. Grep `from '@/editor/io/docx'` returns 0 references to the old singular file.
  - **Commit:** `refactor(editor): split docx into focused modules`.

- [ ] **Task 8.4: Split `editor/suggestions/SuggestionMode.ts` (305 LOC)**
  - **Files:**
    - `editor/suggestions/SuggestionMode.ts` — Tiptap extension shell (≤ 120 LOC).
    - `editor/suggestions/suggestionKeyHandlers.ts` — backspace/forwardDelete handlers.
    - `editor/suggestions/suggestionMarkUtils.ts` — `makeMarkAttrs`, `stripInsertionFlood`.
  - **Comment requirement:** `stripInsertionFlood` MUST get a 1–2 line `// why: ...` comment explaining the flood heuristic.
  - **Verification:** Tiptap unit tests if any; manual: type-then-delete cycle in suggesting mode behaves identically.
  - **Commit:** `refactor(suggestions): split mode handlers + utils`.

- [ ] **Task 8.5: Split `editor/tiptap/contextItems.ts` (362 LOC)**
  - **Files:**
    - `editor/tiptap/contextItems/index.ts` — public `buildContextItems(ctx)`.
    - `editor/tiptap/contextItems/clipboardItems.ts`
    - `editor/tiptap/contextItems/suggestionItems.ts`
    - `editor/tiptap/contextItems/commentItems.ts`
    - `editor/tiptap/contextItems/formattingItems.ts`
  - **Constraint:** each ≤ 100 LOC.
  - **Action:** Reuse `makeId` from `@/editor/utils`. Eliminate duplication with EditorView's `addCommentFromBubble`.
  - **Commit:** `refactor(editor): split contextItems factories`.

> **Note (Codex finding 12):** Task 8.6 was originally one dispatch; split into 8.6a/8.6b/8.6c so each Sonnet run has a single concern + verification.

- [ ] **Task 8.6a: Extract `editor/tiptap/hooks/useEditorInit.ts`**
  - **Purpose:** Tiptap editor instance + extensions wiring + onUpdate/onSelectionUpdate handlers.
  - **Signature:** `useEditorInit(props: { collab: CollabBundle; user: User; placeholder: string; onUpdate?: (e: Editor) => void; onSelection?: (e: Editor) => void }): { editor: Editor | null; ready: boolean }`.
  - **Constraint:** the extensions array MUST be `useMemo`'d on stable inputs — no recreation on every render. Effect cleanup must call `editor.destroy()`. Preserve existing `editorRef` pattern inside `EditorView` for now (do not lift to Host until Phase 10).
  - **Verification:** `npm run typecheck && npm run lint`; manual smoke: editor mounts, types, undo/redo work.
  - **Commit:** `refactor(editor): extract useEditorInit`.

- [ ] **Task 8.6b: Extract `editor/tiptap/hooks/useBlockMenu.ts` + `editor/tiptap/BlockMenu.tsx`**
  - **Hook returns:** `{ openAt: { pos: number; rect: DOMRect } | null; openFor(rect, pos): void; close(): void; isOpen: boolean }`.
  - **Component props:** `{ state: ReturnType<typeof useBlockMenu>; editor: Editor; t: TFunction }`.
  - **Constraint:** keep all positioning math inside the hook — component is pure render.
  - **Verification:** manual smoke — drag handle / block menu opens at correct position, closes on outside click.
  - **Commit:** `refactor(editor): extract useBlockMenu + BlockMenu component`.

- [ ] **Task 8.6c: Slim `editor/tiptap/EditorView.tsx`**
  - **Action:** consume the two extracted units; delete inline duplicates.
  - **Result:** `EditorView.tsx` ≤ 150 LOC.
  - **Verification:** dev server smoke — open editor, type, slash menu, drag-drop block, comment from bubble — all unchanged. Run full test suite.
  - **Commit:** `refactor(editor): slim EditorView via extracted hooks`.

- [ ] **Task 8.7: Split `editor/tiptap/slash/SlashMenu.tsx` (283 LOC)**
  - **Action:** Extract command list to `editor/tiptap/slash/slashCommandList.ts`. Keep render/keyboard logic in `SlashMenu.tsx`. Each ≤ 150 LOC.
  - **Commit:** `refactor(editor): split slash menu data and view`.

### CHECKPOINT — codex review of Phase 8 + manual smoke test

Smoke test list (each via dev server):
- Open editor → types correctly.
- Slash menu opens, all commands listed.
- Block menu drag handle works.
- Right-click context menu shows expected items per role.
- Suggesting mode toggle inserts insertion marks.
- Comment-from-bubble creates a thread.
- Find/Replace bar opens and replaces.
- Export DOCX downloads, bytes match baseline.

---

## Phase 9 — Editor: Orchestration → containers/editor/

This is where the big god-components break apart.

### 9a. Comments

> **Boundary contract (Codex findings 6, 7):** comment data lives in a Yjs map accessed via `getThreadMap(doc: Y.Doc)` → `Y.Map<Thread>` (see `editor/comments/threadOps.ts` and `editor/comments/useThreads.ts`). `useCommentOps` owns Yjs writes (`map.set`, `map.delete`); `useCommentDrafts` owns React UI state only. Crossing edits flow as: form `onSubmit` calls `applyEdit(draftValue)` (UI clears) THEN calls `useCommentOps.editReply(...)` (Yjs writes). Do not let `useCommentDrafts.applyEdit` touch the Yjs doc.

- [ ] **Task 9.1: Create `containers/editor/hooks/useCommentDrafts.ts`**
  - **Purpose:** UI-only draft state — `draft`, `replyDrafts: Record<threadId, string>`, `editBuffer: { kind: 'thread'; threadId: string } | { kind: 'reply'; threadId: string; replyId: string } | null` (ADT discriminated by `kind` per CLAUDE.md).
  - **Returns:** `{ draft, setDraft, replyDrafts, setReplyDraft, clearReplyDraft, editBuffer, beginEdit, cancelEdit }`. **No `applyEdit`** — that is the caller's responsibility (form onSubmit calls `cancelEdit()` after `useCommentOps.editReply()` resolves).
  - **Constraint:** zero Yjs imports in this file.
  - **Commit:** `refactor(comments): extract useCommentDrafts`.

- [ ] **Task 9.2: Create `containers/editor/hooks/useCommentOps.ts`**
  - **Purpose:** Yjs-mutating thread operations.
  - **Signature:** `useCommentOps(doc: Y.Doc, currentUser: User): { resolve(threadId): void; reopen(threadId): void; remove(threadId): void; addReaction(threadId, emoji): void; removeReaction(threadId, emoji): void; addReply(threadId, body): string /* replyId */; editReply(threadId, replyId, body): void; createThread(anchor, body): string /* threadId */ }`.
  - **Internals:** call `getThreadMap(doc)` once per op; mutate via `map.set` / `map.delete`. No React state. No UI side effects.
  - **Test:** unit-test against a fresh `new Y.Doc()` fixture. Each op asserted by reading the map back.
  - **Commit:** `refactor(comments): extract useCommentOps`.

- [ ] **Task 9.3: Create `containers/editor/hooks/useCommentThreads.ts`**
  - **Purpose:** filtering + sorting derivation. Returns `{ visible, filter, setFilter }`.
  - **Constraint (CLAUDE.md):** the filter type must be a TS enum with string values, not a string union — replace the existing `StatusFilter` string union (`editor/comments/CommentsSidebar.tsx:30`) with `enum CommentStatusFilter { All='all', Open='open', Resolved='resolved', Mine='mine' }` (use the actual values from source).
  - **Commit:** `refactor(comments): extract useCommentThreads with status enum`.

- [ ] **Task 9.4: Create `containers/editor/components/comments/CommentFilters.tsx`** — filter chips. ≤ 80 LOC.

- [ ] **Task 9.5: Create `containers/editor/components/comments/CommentReply.tsx`** — single reply card with edit-in-place. ≤ 120 LOC.

- [ ] **Task 9.6: Create `containers/editor/components/comments/CommentThreadForm.tsx`** — compose / edit form (used inside thread card). ≤ 100 LOC.

- [ ] **Task 9.7: Create `containers/editor/components/comments/CommentThreadCard.tsx`** — closed/expanded thread card. ≤ 150 LOC.

- [ ] **Task 9.8: Move comment UI files** `editor/comments/{CommentAnchors,MentionTextarea,Reactions,CommentsSidebar}.tsx` → `containers/editor/components/comments/` via `git mv` (Codex finding 2: must move sidebar before rewriting it). Update all importers. (Keep `Comment.ts`, `color.ts`, `threadOps.ts`, `useThreads.ts`, `types.ts` in `editor/comments/` — they're domain logic, not UI.)
  - **Verification:** `npm run typecheck && npm run lint` — green even though sidebar still uses old code.
  - **Commit:** `chore(refactor): regroup comment UI under containers/editor`.

- [ ] **Task 9.9: Rewrite `containers/editor/components/comments/CommentsSidebar.tsx`** as a thin orchestrator using the four hooks (`useCommentDrafts`, `useCommentOps`, `useCommentThreads`, plus the existing `useThreads`) and the sub-components from 9.4–9.7. ≤ 120 LOC. The 641-LOC implementation that came in via `git mv` in 9.8 is replaced.
  - **Verification:** dev server — full thread lifecycle works (create, reply, edit reply, react, resolve, reopen, delete).
  - **Commit:** `refactor(comments): split sidebar into thread/reply/filter components`.

### 9b. Versions

- [ ] **Task 9.10: Create `containers/editor/hooks/useVersions.ts`**
  - **Purpose:** load/save snapshots, create/remove/rename, persistence to localStorage.
  - **Returns:** `{ versions, current, save, restore, remove, rename }`.

- [ ] **Task 9.11: Create `containers/editor/hooks/useAutoSnapshot.ts`**
  - **Purpose:** debounced auto-snapshot. Replace fragile `pending timeout` with a proper debounced hook.
  - **Constraint:** internal use of a pure `lib/debounce.ts` if you need to add it (≤ 30 LOC).

- [ ] **Task 9.12: Create `containers/editor/components/versions/VersionSnapshot.tsx`** — single row. ≤ 90 LOC.

- [ ] **Task 9.13: Create `containers/editor/components/versions/VersionsList.tsx`** — list rendering. ≤ 80 LOC.

- [ ] **Task 9.14: Move `editor/versions/{VersionsPanel,VersionDiffModal}.tsx`** to `containers/editor/components/versions/` via `git mv` (Codex finding 3: must move before rewriting). Update all importers. Diff state will be lifted into the modal in 9.15. Keep `editor/versions/{diffDoc,types}.ts` as domain code — do not move them.
  - **Verification:** `npm run typecheck && npm run lint` — green using existing implementations.
  - **Commit:** `chore(refactor): regroup versions UI under containers/editor`.

- [ ] **Task 9.15: Rewrite `containers/editor/components/versions/VersionsPanel.tsx`** as orchestrator using `useVersions`, `useAutoSnapshot`, and the sub-components. ≤ 120 LOC. The 272-LOC implementation that came in via 9.14 is replaced. Lift diff state from panel into `VersionDiffModal.tsx` (modal owns its own state).
  - **Verification:** dev server — snapshot, restore, diff, rename, delete all work.
  - **Commit:** `refactor(versions): split panel into list/snapshot/modal`.

### 9c. TopBar / panes / status / shortcuts / suggesting / etc.

> **Note (Codex finding 13):** the old "Task 9.20" combined 5 concerns. Split into 9.16 → 9.20a/b/c.

- [ ] **Task 9.16: Create `containers/editor/hooks/useDocumentImport.ts`** — import file picker + parser dispatch. Source: TopBar's import logic. Returns `{ open(): void; isImporting: boolean }` and a hidden `<input type="file">` ref helper. Pure hook, no JSX.

- [ ] **Task 9.17: Create `containers/editor/hooks/useDocumentExport.ts`** — export dispatch. Source: TopBar's export logic. Returns `{ exportDocx(opts): Promise<void>; exportMarkdown(): void; exportJson(): void; isExporting: boolean }`. Code-splits docx via dynamic import (see Phase 11.7) — but for now keep it static; Phase 11.7 swaps to dynamic.

- [ ] **Task 9.18: Create `containers/editor/components/BookTitleMenu.tsx`** — book title dropdown including File submenu. Wires `useDocumentImport` + `useDocumentExport`. ≤ 130 LOC.

- [ ] **Task 9.19: Create `containers/editor/components/UserMenu.tsx`** — user/role/avatar menu. ≤ 80 LOC.

- [ ] **Task 9.20a: Move dead Mammoth style map**
  - **Action:** Inspect `editor/app/TopBar.tsx` for `MAMMOTH_STYLE_MAP`. If still referenced by import logic, move to `editor/io/markdown.ts`. If unreferenced after 9.16/9.17, delete it. Single concern, easy to verify with grep.
  - **Commit:** `chore(editor): retire MAMMOTH_STYLE_MAP from TopBar`.

- [ ] **Task 9.20b: `git mv editor/app/TopBar.tsx → containers/editor/components/TopBar.tsx`**
  - **Action:** physical move + import-path updates only. No structural changes.
  - **Verification:** `npm run typecheck && npm run lint`.
  - **Commit:** `chore(refactor): move TopBar to containers/editor`.

- [ ] **Task 9.20c: Slim `containers/editor/components/TopBar.tsx`**
  - **Action:** replace inline menus with `<BookTitleMenu />` + `<UserMenu />`. ≤ 90 LOC.
  - **Verification:** dev server — file menu actions, user menu, language switch all work.
  - **Commit:** `refactor(topbar): compose from BookTitleMenu + UserMenu`.

- [ ] **Task 9.21: Move panes** `editor/app/{LeftPane,RightPane,StatusBar,EmptyState}.tsx` → `containers/editor/components/`. No content change.
  - **Sub-extract:** in LeftPane, extract `useHasHeadings()` to `containers/editor/hooks/useHasHeadings.ts`. Move `OutlineGhostIcon` to `containers/editor/components/OutlineGhostIcon.tsx`.
  - **Commit:** `chore(refactor): regroup editor panes under containers/editor`.

- [ ] **Task 9.22: Move all editor app hooks** `editor/app/{useGlobalShortcuts,usePaneState,usePeers,useConnectionStatus,useTargetWords,useReadingStats,useSuggestingMode}.ts` → `containers/editor/hooks/`. Rename `useGlobalShortcuts` → `useDocumentKeyDown`. Update importers.
  - **Commit:** `chore(refactor): regroup editor hooks; rename to useDocumentKeyDown`.

- [ ] **Task 9.23: Move panel UIs** to `containers/editor/components/`:
  - `editor/suggestions/SuggestionsSidebar.tsx`
  - `editor/outline/OutlineSidebar.tsx`
  - `editor/glossary/GlossaryPanel.tsx`
  - `editor/meta/MetaPanel.tsx`
  - `editor/workflow/{ShortcutsModal,TemplatesMenu}.tsx`
  Keep domain logic (`SuggestionMode.ts`, `GlossaryHighlight.ts`, `templates.ts`, `aiOps.ts`) in `editor/`. Update importers.
  - **Commit:** `chore(refactor): regroup editor panel UIs`.

### CHECKPOINT — codex review after Phase 9a (comments)

Run after Task 9.9 lands. Verify Yjs boundary respected, no UI state leaking into hooks, draft / ops separation clean.

### CHECKPOINT — codex review after Phase 9b (versions)

Run after Task 9.15. Verify auto-snapshot debounce works and no duplicate snapshots on rapid edits.

### CHECKPOINT — codex review after Phase 9c (topbar/panes/hooks) + full smoke test

---

## Phase 10 — EditorHost split

> **Lifecycle preservation contract (Codex finding 11).** The current `editor/EditorHost.tsx` has these load-bearing behaviors. The Phase-10 refactor MUST preserve all of them. Cite each in the relevant task's commit body.
> - `EditorHost.tsx:225,231,233` — fonts.ready cancellation: `let cancelled = false; ... return () => { cancelled = true }`. The new `useFontsReady` MUST use the same cancel-on-unmount pattern; do not write to state after unmount.
> - `EditorHost.tsx:240–242` — collab destroy cleanup: `bundle.provider.destroy(); bundle.persistence.destroy(); bundle.doc.destroy()`. Must run on unmount AND on collab swap.
> - `EditorHost.tsx:263` — `<EditorSession key={collab.id} />` remount-on-collab-change. The replacement must also force a remount (or equivalent reset) when `collab.id` changes; do not collapse this away.
> - `EditorHost.tsx:274` — `<ToastProvider>` wraps the session subtree. The replacement must keep the provider scoped to the editor surface (so toasts dismiss when leaving the editor).

- [ ] **Task 10.1: Create `containers/editor/hooks/useFontsReady.ts`**
  - **Purpose:** fonts.ready promise + typography CSS init.
  - **Signature:** `useFontsReady(fonts: FontVariant[]): boolean`.
  - **Constraint:** preserve `let cancelled = false` cancellation pattern from `EditorHost.tsx:225–233` exactly. Test: unmount during fonts.ready does not call setState (use `act` + `unmount`).
  - **Commit:** `refactor(editor): extract useFontsReady (preserves cancellation)`.

- [ ] **Task 10.2: Create `containers/editor/hooks/useCollabSession.ts`** *(new — addresses Codex finding 11)*
  - **Purpose:** own collab bundle lifecycle. `useCollabSession({ bookId, user })` → `{ collab: CollabBundle | null }`. Internally calls `createCollab(...)` and on cleanup runs `provider.destroy(); persistence.destroy(); doc.destroy()` exactly as `EditorHost.tsx:240–242`.
  - **Constraint:** unit test that swapping bookId destroys the previous bundle before constructing the new one.
  - **Commit:** `refactor(editor): extract useCollabSession with destroy cleanup`.

- [ ] **Task 10.3: Create `containers/editor/EditorLayout.tsx`**
  - **Props:** `{ topBar, leftPane, content, rightPane, statusBar, paneState }`. Pane classes computed inside. ≤ 120 LOC. Pure JSX.
  - **Commit:** `refactor(editor): extract EditorLayout`.

- [ ] **Task 10.4: Rewrite `containers/editor/EditorHost.tsx`**
  - **Action:** session wiring only. ≤ 150 LOC.
  - **Structure:** outer `EditorHost` consumes `useCollabSession`; inner `EditorSession` is keyed on `collab.id` and consumes `useFontsReady`, `usePaneState`, `useDocumentKeyDown`, `useSuggestingMode`. The `<ToastProvider>` wraps `<EditorSession>`. Two-component split is intentional — preserves the `key={collab.id}` remount semantics from `EditorHost.tsx:263`. Do NOT collapse to one component.
  - **Imports:** all `@/`-prefixed; tiptap from `@/editor/tiptap`; pane components from `@/containers/editor/components/...`.
  - **Verification:** dev server smoke — open book, switch books (router transition), close tab — no console errors, no leaked Yjs providers (check Network panel for orphan websocket).
  - **Commit:** `refactor(editor): rewrite EditorHost as thin session orchestrator`.

- [ ] **Task 10.5: Update `containers/books/BookEditorPage.tsx`**
  - **Import path:** use the explicit file `import { EditorHost } from '@/containers/editor/EditorHost'` (no barrel). The plan does NOT create a `containers/editor/index.ts` (Codex finding 4).
  - **Action:** delete `frontend/src/editor/EditorHost.tsx` and its `styles.css` if duplicated; ensure `styles.css` is imported from the new EditorHost location instead.
  - **Verification:** grep `from '@/editor/EditorHost'` returns 0 hits. `npm run build` succeeds.
  - **Commit:** `chore(refactor): retire editor/EditorHost.tsx`.

### CHECKPOINT — codex review of Phase 10 + full smoke test (everything)

Run end-to-end smoke (dev server):
- Login → Books list → Open a book → Type → Slash → Block menu → Comment → Reply → Resolve → Reopen → React → Suggest → Find/Replace → Snapshot → Diff → Export DOCX → Settings → Coordinator → New book → Admin users → Logout.

---

## Phase 11 — Performance Pass

Only after structural refactor is green. Each item is independently dispatchable.

- [ ] **Task 11.1: Lazy-load editor route**
  - **Action:** Convert `routes/_app/books.$bookId.tsx` to `lazy()` for `BookEditorPage`. Add `<Suspense fallback={<EditorSkeleton />}>`.
  - **Verification:** Network tab — editor bundle deferred until route opens. Log initial bundle size before/after.
  - **Commit:** `perf(editor): lazy-load editor route`.

- [ ] **Task 11.2: Memoize coordinator selectors**
  - **Action:** Wrap `BooksList`, `BooksTimeline` rows with `React.memo`. Confirm `useBooksDashboard` returns stable references via `useMemo` keyed on `books` array identity.
  - **Verification:** React DevTools profiler — typing in filter does not re-render unrelated rows.
  - **Commit:** `perf(coordinator): memoize list rows + dashboard selectors`.

- [ ] **Task 11.3: Memoize CommentThreadCard**
  - **Action:** `React.memo(CommentThreadCard, (a,b) => a.thread === b.thread && a.editing === b.editing)`.
  - **Commit:** `perf(comments): memoize ThreadCard`.

- [ ] **Task 11.4: Stabilize Tiptap extensions array**
  - **Action:** Audit `useEditorInit` — extensions array must be `useMemo`'d, not recreated each render. Confirm with `console.count` smoke.
  - **Commit:** `perf(editor): stabilize extensions array`.

- [ ] **Task 11.5: Debounce auto-snapshot**
  - **Action:** Confirm `useAutoSnapshot` from Phase 9b uses real debounce. Add jitter cap.
  - **Commit:** `perf(versions): debounce auto-snapshot`.

- [ ] **Task 11.6: Tree-shake `lucide-react` imports**
  - **Action:** Verify only named imports (no `import * as Icons`). `pnpm build` and inspect chunk sizes.
  - **Commit:** `perf: confirm icon tree-shake`.

- [ ] **Task 11.7: Code-split heavy IO**
  - **Action:** Dynamic-import `editor/io/docx/*` and `mammoth` only when import/export menu opens. The TopBar export handlers become `async () => (await import('@/editor/io/docx')).docxFromJson(...)`.
  - **Verification:** main bundle drops; export still works.
  - **Commit:** `perf(io): code-split docx + mammoth`.

### CHECKPOINT — codex review of Phase 11

---

## Phase 12 — Final Sweep

- [ ] **Task 12.1: File-size audit**
  - **Action:** Run `find frontend/src -name '*.ts' -o -name '*.tsx' ! -path '*/generated/*' -exec wc -l {} + | sort -rn | head -30`. Any file > 200 LOC must be justified in a 1-line comment at top OR split.
  - **Commit:** `refactor: enforce 200-LOC ceiling`.

- [ ] **Task 12.2: Import path audit**
  - **Action:** `grep -rn "from '\.\./" frontend/src --include='*.ts' --include='*.tsx'` — must return 0.
  - **Commit:** `refactor: enforce @/ alias`.

- [ ] **Task 12.3: Inline-math audit**
  - **Action:** Look for raw arithmetic comparisons in hooks/components (e.g., `daysSince(x) > 14`). Replace with helpers from `@/lib/status`.
  - **Commit:** `refactor: replace inline math with named predicates`.

- [ ] **Task 12.4: i18n parity**
  - **Action:** `pnpm check-locales`. Fix all gaps in `pl/`, `ua/`. No hardcoded strings in JSX.
  - **Commit:** `i18n: fill translation gaps from refactor`.

- [ ] **Task 12.5: Dead-code sweep**
  - **Action:** `npx ts-prune` (install dev-dep if absent). Remove unreferenced exports.
  - **Commit:** `chore: remove dead exports`.

- [ ] **Task 12.6: Final build + bundle size report**
  - **Action:** `pnpm build`. Compare bundle vs baseline. Append result to `doc/refactor-baseline.md`.
  - **Commit:** `chore(refactor): final bundle size report`.

### CHECKPOINT — final codex adverse review

- Skill: `codex:rescue`.
- Prompt: "Review the entire diff `<phase-0-sha>..HEAD` against `doc/refactor.md` and `CLAUDE.md`. Verify every claimed file is in the right place, every god-class is gone, every route file is thin, every hook is reusable or single-purpose, every file ≤200 LOC. Flag any backsliding."

After Codex sign-off, present diff summary to user. Do not push.

---

## Self-review checklist (orchestrator runs after every phase)

1. Every file ≤ 200 LOC unless explicitly waived in this plan.
2. No `../` imports introduced.
3. No god classes — each component does one thing.
4. Hooks have single responsibility; if they return more than 6 keys, split.
5. No regressions in dev-server smoke (golden path: login → books → editor → comment → save → export).
6. `pnpm typecheck && pnpm lint && pnpm test --run && pnpm build` all pass.
7. `pnpm check-locales` passes.
8. New tests added wherever pure logic was extracted.
9. Commits are atomic per task.

---

## Appendix A — i18n keys policy

When extracting hardcoded strings during this refactor, use the existing namespace structure (`coordinator`, `admin`, `comments`, etc.). New keys go to **all three** locale files: `frontend/public/locales/{en,pl,ua}/translation.json`. Run `pnpm check-locales` after every phase that adds keys.

## Appendix B — Subagent directive (paste-ready)

> You are executing one task from `doc/refactor.md`. Strict scope. Read source first. Use `@/` alias. ≤ 200 LOC per file. Don't add features. After changes, run `cd frontend && npm run typecheck && npm run lint`; if changes touch logic, also `npm test -- --run`. Commit with the message format the task specifies. Report files changed, LOC of new files, verification log tail, and anything surprising.

## Appendix C — How to invoke Codex adverse review

At each `### CHECKPOINT` section, the orchestrator runs:

```
Skill: codex:rescue
Prompt: "Adverse-review the diff <last-phase-checkpoint-sha>..HEAD.
Flag: god classes still present, files >200 LOC, mixed concerns,
dead code, broken imports, accidental behavior changes, missing
i18n keys, inline math/coordinate comparisons, relative imports,
backslides on contracts in doc/refactor.md. Be harsh. No new features."
```

Address every concern before crossing the checkpoint.
