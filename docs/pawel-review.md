# Pawel Review — Editor Feature Plan

Target: Tiptap + Yjs collaborative editor at `frontend/src/editor` and `frontend/src/containers/editor`.
Goal: Unify editor behavior with Google Docs. Each item is a discrete, executable task for a Sonnet subagent.
Conventions: `@/` imports, i18n via `useTranslation`, ADTs with discriminated `kind`, no files >250 lines, enums for related constants.

---

## Status snapshot (current state)

- Autosave: `useAutoSnapshot.ts` already debounces at 1.2 s + max 5 min interval — but writes to **localStorage only**. Manual snapshots hit `POST /api/books/{bookId}/snapshots`. Pawel's complaint about "every character" reflects perceived behavior; reality is that the *snapshot* is debounced fine — it's the **named version save** UX that's missing.
- Compare: `VersionDiffModal.tsx` is a custom modal with `DiffRichView` / `MarkdownDiffView` and inline / side-by-side layout.
- Comments + Suggestions: split across two tabs in `RightPane.tsx` (`RightTab.Comments`, `RightTab.Suggestions`); `CommentsSidebar` and `SuggestionsSidebar`.
- Suggestion strikethrough: `.tc-del { color: var(--track-color); opacity: 0.7 }` — re-colors **the text itself** instead of just the strike line.
- Replace suggestions: paired-insertion-and-deletion logic exists in `SuggestionMode.ts` but is not surfaced as a single "Replace X with Y" UI entry.
- Inline pins: `CommentAnchors.tsx` renders avatar-only buttons — no body preview.
- Auto-marking: `SuggestionMode` Tiptap extension hooks `appendTransaction` and tracks single `ReplaceStep`s, but mishandles many real edits (multi-step ops, paste, formatting toggles, IME, cut/paste-replace).

---

## Feature 1 — Autosave: time-based, not keystroke-based

### Goal
Match Google Docs: autosave runs in background on a cadence, surfaces "Saving…" / "All changes saved in Drive" status, and creates **named version-history entries** at coarser intervals — not on every keystroke.

### Current
`useAutoSnapshot.ts` uses 1.2 s debounce + 5 min max interval, writes only to localStorage.

### Plan
1. **Split into two layers** with clear naming:
   - `useDirtySaveIndicator` — tracks "unsaved changes" status for the topbar. Listens to Yjs `update`. State: `'idle' | 'saving' | 'saved' | 'error'`. Yjs+Hocuspocus already persists every change live → "saving" appears briefly, then "saved".
   - `useAutoSnapshot` — keep file, change cadence: drop the 1.2 s debounce; set `AUTO_INTERVAL_MS = 10 * 60 * 1000` (10 min) and trigger on **idle window** (no Yjs `update` for 30 s) **OR** the 10 min cap, whichever first. Drop `JITTER_CAP_MS`. Persist snapshots to **backend** (`POST /api/books/{bookId}/snapshots` with `label = 'auto:<ISO timestamp>'`), not localStorage.
2. **Add server-side dedup**: if last snapshot's Yjs state is byte-equal to current, skip. Backend already accepts state bytes — extend the route handler in `backend/.../snapshots` to compare hashes.
3. **Topbar status**: new component `EditorSaveStatus` in `containers/editor/topbar/`. Reads dirty indicator. Renders `t('editor.savestatus.saving')` / `t('editor.savestatus.saved')` / `t('editor.savestatus.error')`. Click → opens version history panel.
4. **Manual save shortcut**: keep `Cmd+S` triggering a labeled snapshot via `bookSnapshotCreate({ label })` with a small "Name this version" inline input (Google Docs pattern: `File → Version history → Name current version`).
5. **Constants**: introduce `editor/versions/constants.ts` exporting:
   ```ts
   export const AUTO_SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;
   export const AUTO_SNAPSHOT_IDLE_MS = 30 * 1000;
   export const SAVE_STATUS_DEBOUNCE_MS = 400;
   ```
6. **Remove**: `VERSIONS_PERSIST_DEBOUNCE_MS` localStorage path for autosnapshots (keep for unsaved-draft recovery on accidental close).

### Files to touch
- `frontend/src/containers/editor/versions/hooks/useAutoSnapshot.ts` (rewrite cadence)
- `frontend/src/containers/editor/versions/constants.ts` (new)
- `frontend/src/containers/editor/topbar/EditorSaveStatus.tsx` (new)
- `frontend/src/containers/editor/topbar/index.tsx` (mount status)
- `backend/.../snapshots` route — server-side dedup
- i18n keys: `editor.savestatus.{saving,saved,error,offline}`, `editor.versions.nameVersion`

### Acceptance
- Typing rapidly does not create N snapshots — first save lands ~30 s after last keystroke or after 10 min, whichever first.
- "All changes saved" appears within 1 s of last keystroke (Yjs sync).
- Cmd+S prompts "Name this version" inline; created snapshot appears in history with that label.

---

## Feature 2 — Inline Compare (replace `VersionDiffModal`)

### Goal
Replicate Google Docs' Version History panel: when you open a version, the **main editor** is replaced with a read-only diff view; a right rail lists versions; a top banner shows "You are viewing version X — Restore this version".

### Current
`VersionDiffModal` opens **on top of** the editor.

### Plan
1. **Introduce a discriminated editor `viewMode`** in `paneStore` or new `editorViewStore`:
   ```ts
   type EditorView =
       | { kind: 'live' }
       | { kind: 'versionHistory'; selectedSnapshotId: string; compareWithId?: string };
   ```
2. **Mount logic**: in `containers/editor/EditorShell.tsx` (or wherever the main editor mounts), branch on `viewMode.kind`. When `versionHistory`, render new `VersionHistoryView`:
   - Top banner: snapshot label, author, timestamp, `Restore` and `Close` buttons (Close → `viewMode = { kind: 'live' }`).
   - Main: read-only ProseMirror editor rendering `buildDiffDoc(...)` output (re-use `DiffRichView`). No Yjs collab plugin in this editor — disposable instance.
   - Right rail: replaces `RightPane` with `VersionHistoryRail` listing all snapshots; clicking selects another `selectedSnapshotId`. Shift-click sets `compareWithId` for between-version diff.
3. **Toolbar in banner** (replicate modal toolbar): `[Inline / Side-by-side]` `[Rich / Markdown]` toggles persist in `localStorage` per user.
4. **Side-by-side layout**: when active, render two columns inside the main editor area — older on the left, newer on the right. Both read-only.
5. **Routing**: add `?versionId=<id>` query param so version views are sharable. On mount, hydrate `viewMode` from query.
6. **Delete** `VersionDiffModal.tsx` and its mount point. Keep `DiffRichView` / `MarkdownDiffView` and `buildDiffDoc` — re-used inside `VersionHistoryView`.
7. **Keyboard**: `Esc` closes (returns to live).
8. **Pin/unpin**: while in version history, suggesting-mode toggle and comments tab become disabled (read-only).

### Files
- `frontend/src/containers/editor/versions/VersionHistoryView.tsx` (new, ~150 loc)
- `frontend/src/containers/editor/versions/VersionHistoryRail.tsx` (new, ~120 loc)
- `frontend/src/containers/editor/versions/VersionHistoryBanner.tsx` (new, ~80 loc)
- `frontend/src/containers/editor/session/editorViewStore.ts` (new)
- `frontend/src/containers/editor/EditorShell.tsx` (branch on viewMode)
- delete: `VersionDiffModal.tsx`
- i18n: `editor.versionHistory.{title,restore,close,viewing,restoredAt,compareTo}`

### Acceptance
- Opening version history does not stack a modal; the main editor area swaps content.
- URL has `?versionId=...`; refreshing keeps the view.
- Restore creates a new snapshot of current state before replacing (safety).
- All existing diff layouts (inline / side-by-side / rich / markdown) still work.

---

## Feature 3 — Unified Comments + Suggestions panel

### Goal
Google Docs has **one panel**: every comment, suggestion, reply, and resolved-thread is a card in a chronological/positional list. The user can `@`-mention; suggestions appear as cards that show "Insert / Delete / Replace" with **Accept / Reject** inline; replies thread under both comments and suggestions.

### Current
Two tabs (`Comments` / `Suggestions`) in `RightPane.tsx`, two stores, two sidebars.

### Plan
1. **Unified ADT** in `frontend/src/containers/editor/threads/types.ts` (new domain):
   ```ts
   export enum ThreadKind { Comment = 'comment', Suggestion = 'suggestion' }
   export type Thread =
       | { kind: ThreadKind.Comment; id: string; anchorId: string; quote: string;
           author: Author; createdAt: string; status: ThreadStatus;
           messages: ThreadMessage[]; reactions: Reaction[] }
       | { kind: ThreadKind.Suggestion; id: string; suggestionId: string;
           op: SuggestionOp; author: Author; createdAt: string; status: ThreadStatus;
           messages: ThreadMessage[]; reactions: Reaction[] };
   export type SuggestionOp =
       | { kind: 'insert'; text: string }
       | { kind: 'delete'; text: string }
       | { kind: 'replace'; before: string; after: string };
   ```
2. **Single sidebar** `ThreadsSidebar` replaces both `CommentsSidebar` and `SuggestionsSidebar`. Replaces both tabs in `RightPane.tsx` with one tab "Discussions" (or remove tabs entirely; pane is single-purpose).
3. **Unified card** `ThreadCard`:
   - Header: author avatar+name, relative time, kind badge ("Comment" / "Suggestion").
   - Body: for `comment` → first message; for `suggestion` → "Replace **X** with **Y**" / "Insert **Y**" / "Delete **X**" rendered with the proper colors (see Feature 4).
   - Actions: `Accept` / `Reject` for suggestions; `Resolve` for comments; `Reply` for both.
   - Replies: indented below, collapsible after 3.
   - Mentions: `@` triggers existing `mentionCandidates.ts` candidate list; same component used for both kinds.
4. **Anchoring**: suggestions already have `suggestionId` mark; comments have `CommentMark` with `anchorId`. Both contribute to the **same** position-sorted list. Sort by editor document position (use `getMarkRange` → `pos`).
5. **Filtering**: a single filter bar above the list with chips: `[All] [Open] [Resolved] [Suggestions only] [My threads]`. Replace per-store filter state with one `threadsFilterStore`.
6. **Composing a suggestion comment**: when in suggesting mode, hovering a tracked change in the doc shows the matching card; clicking the card scrolls to and highlights the change in the doc.
7. **Backend**: extend the comments API to accept `kind: 'suggestion'` threads OR add `/api/books/{bookId}/suggestions` mirror. Recommended: **reuse comments API** with `kind` discriminator on the row — fewer endpoints, replies/mentions reuse the same code paths.
8. **Migration**: existing comment threads stay `kind: 'comment'`. Tracked-changes marks already in doc get a paired `SuggestionThread` row created lazily on first reply or on mark creation.

### Files
- `frontend/src/containers/editor/threads/` (new domain — types, store, sidebar, card, composer, filter — split into ≤200 loc files)
- `frontend/src/containers/editor/layout/RightPane.tsx` (collapse two tabs into one panel, or remove tabs)
- `frontend/src/editor/suggestions/SuggestionMode.ts` (on creating a suggestion mark, also create a `Thread{kind:suggestion}` in Yjs map)
- delete: `containers/editor/comments/index.tsx`, `containers/editor/suggestions/index.tsx` (sidebars only — keep stores until migrated)
- backend: extend comments table with `kind`, `suggestion_id` columns; reuse `/api/books/{bookId}/comments` route
- i18n: `editor.threads.*`, `editor.threads.kind.{comment,suggestion}`, `editor.threads.action.{accept,reject,resolve,reply}`

### Acceptance
- One sidebar tab. Filter chip-bar visible.
- Replying to a suggestion works identically to replying to a comment.
- Accepting a suggestion from a card removes/keeps text **and** marks the thread `accepted`.
- Mentioning `@user` works on both kinds.

---

## Feature 4 — Strikethrough color fix on suggestion deletions

### Goal
Match Google Docs: deleted text stays **its original text color** (readable); the strike line itself is the author's color.

### Current
`.tc-del { color: var(--track-color); opacity: 0.7 }` — recolors the text.

### Plan
Replace with:
```css
.tc-del {
    color: inherit;
    text-decoration: line-through;
    text-decoration-color: var(--track-color, var(--suggest));
    text-decoration-thickness: 2px;
    background-color: color-mix(in srgb, var(--track-color, var(--suggest)) 10%, transparent);
}
.tc-ins {
    color: inherit;
    text-decoration: underline;
    text-decoration-color: var(--track-color, var(--suggest));
    text-decoration-thickness: 2px;
    text-underline-offset: 2px;
    background-color: color-mix(in srgb, var(--track-color, var(--suggest)) 10%, transparent);
}
```
Remove `opacity: 0.7` (was the unreadable culprit). The author color now lives on the line and a faint background tint.

Also audit `.diff-page .tc-del` (in `suggestions.css`) — same change there.

### Files
- `frontend/src/editor/suggestions/suggestions.css`

### Acceptance
- Black text on white doc keeps black text in deletions; only the strike + tint show author identity.
- Dark theme: text remains theme foreground; tint visible.

---

## Feature 5 — "Replace X with Y" suggestion grouping

### Goal
When a user (in suggesting mode) selects "old" and types "new", show **one** suggestion entry: `Replace "old" → "new"`, with one Accept / Reject pair.

### Current
`SuggestionMode.ts` already pairs insertion+deletion in the same step with one shared `suggestionId`. The sidebar partly groups them but the UI shows them as two stacked items in many cases.

### Plan
1. **Data model**: extend `SuggestionEntry` (in `containers/editor/suggestions/...` or new threads domain) to be an ADT:
   ```ts
   type SuggestionEntry =
       | { kind: 'insert'; id: string; text: string; ... }
       | { kind: 'delete'; id: string; text: string; ... }
       | { kind: 'replace'; id: string; before: string; after: string; ... };
   ```
2. **Grouping rule**: walk the doc once collecting marks by `suggestionId`. For each id:
   - has both `Insertion` and `Deletion` adjacent (ranges touch or share a position) → `replace`.
   - has only `Insertion` → `insert`.
   - has only `Deletion` → `delete`.
3. **Auto-pairing for non-paste edits**: in `SuggestionMode.appendTransaction`, when a `ReplaceStep` removes >0 chars **and** inserts >0 chars, share `suggestionId` (already done). Also: detect **multi-step replace** (a delete step immediately followed by an insert step within ~500 ms by same author) and merge their `suggestionId`s.
4. **UI**: `SuggestionCard` renders per-kind:
   - `insert`: `+ "<after>"` underlined.
   - `delete`: `– "<before>"` strikethrough.
   - `replace`: `<before>` strikethrough → `<after>` underlined, single Accept / Reject row.
5. **Accept replace**: delete the old span and keep the new span (drop both marks); reject: delete the new span and unmark the old.

### Files
- `frontend/src/editor/suggestions/suggestionOps.ts` (extend ADT, add `acceptReplace` / `rejectReplace`)
- `frontend/src/editor/suggestions/SuggestionMode.ts` (multi-step pairing)
- `frontend/src/containers/editor/suggestions/SuggestionCard.tsx` (or under `threads/`)
- tests: pure-function grouping tests with sample doc JSON

### Acceptance
- Selecting `"foo"` and typing `"bar"` (in suggesting mode) → one card "Replace foo → bar".
- Accept removes `foo`, keeps `bar` plain.
- Reject removes `bar`, restores `foo` plain.

---

## Feature 6 — Inline comments toggle: full content, not just avatars

### Goal
Google Docs: a small popover/sticky-note hovers near each commented span, showing **author, time, body preview, reply count**, and clicking it opens the full thread in the side panel. The sticky-notes can be toggled on/off from the topbar.

### Current
`CommentAnchors.tsx` renders avatar dots only; content lives in sidebar.

### Plan
1. **PinAnchor extended ADT**:
   ```ts
   export type Pin =
       | { kind: 'comment'; id: string; top: number; author: Author;
           preview: string; replies: number; isUnread: boolean }
       | { kind: 'suggestion'; id: string; top: number; author: Author;
           op: SuggestionOp; replies: number };
   ```
2. **Pin component** `InlinePinCard`:
   - Compact card: avatar, author name, relative time, 2-line clamped preview, reply count badge.
   - Hover → expand to ~280 px wide showing more text + Reply input.
   - Click → opens thread in unified sidebar (Feature 3) and scrolls.
3. **Position** anchored to right margin of `.editor-page`. Use existing `useCommentPinPositions` collision logic; widen gap to fit cards (e.g., 12 px → 64 px).
4. **Topbar toggle** `InlinePinsToggle`:
   - Three states: `off | avatars | full` (cycle on click). Persist in `paneStore` or new `pinsStore`.
   - Default: `full` for ≥1280 px viewport, `avatars` below, `off` if user disabled.
5. **Suggestion pins**: same component renders suggestions inline too (replace + green/red strike colored matches Feature 4). Click → highlights doc range and opens thread.
6. **Mobile / narrow viewport**: pins auto-collapse to `avatars` mode regardless of toggle.

### Files
- `frontend/src/containers/editor/comments/components/CommentAnchors.tsx` → rename `InlinePins.tsx`, generalize for both kinds
- `frontend/src/containers/editor/comments/components/InlinePinCard.tsx` (new)
- `frontend/src/containers/editor/comments/hooks/useCommentPinPositions.ts` → `usePinPositions.ts`
- `frontend/src/containers/editor/topbar/InlinePinsToggle.tsx` (new)
- i18n: `editor.pins.{off,avatars,full,reply,openThread}`

### Acceptance
- Toggling cycles off → avatars → full.
- In `full` mode, the right margin shows readable cards aligned to anchor.
- Cards do not overlap (collision logic widens gap).
- Suggestions show their op in the card.

---

## Feature 7 — Suggestion engine handles real-world cases

### Goal
Currently `SuggestionMode.appendTransaction` only catches simple `ReplaceStep`s. Real edits miss many cases. Make it match Google Docs behavior: every user-originated change while in suggesting mode produces a tracked-change entry.

### Current gaps
- **Paste**: a paste step replaces a slice with a slice — should produce one Replace suggestion of `before` → `after`.
- **Cut**: a deletion-only step on a selection — should produce a Delete suggestion.
- **Drag-and-drop reorder**: produces two steps (delete + insert) far apart — should produce a Move (rendered as Delete + Insert pair, paired via a fresh shared `suggestionId`).
- **Block formatting** (bold, italic, heading toggle): currently bypasses tracking. Decide policy:
   - Match Google Docs: **track formatting changes** as "Format: bold" pseudo-suggestions on the affected range. Lightweight: store as a separate `FormatSuggestion` mark with `before`/`after` attribute snapshots.
- **List/Task changes**, **table cell edits**, **image inserts/deletes**: track as block-level suggestions (use `DiffBlockAttr` extension to mark whole nodes as `ins` / `del`).
- **IME composition**: ProseMirror groups composition; ensure the appendTransaction handler treats the final composed text as one insertion (test on Korean / Chinese IME).
- **AddMark / RemoveMark steps**: not handled. Intercept and convert to format suggestions.
- **ReplaceAroundStep** (wrap/unwrap, e.g., bullet list → numbered list): not handled. Track as block format change.
- **Undo/Redo** in suggesting mode: should not create new suggestions — existing suggestions are toggled by the undo. Use `tr.getMeta('addToHistory') === false` and yjs-undo origin to skip.
- **Remote changes** (collab): already skipped via `isChangeOrigin` — keep.
- **Auto-typography / smart-paste replacements**: skip tracking (they're not user content).

### Plan
1. **Refactor** `SuggestionMode.ts` into a proper `appendTransaction` that walks **all step types**:
   ```ts
   for (const step of tr.steps) {
       switch (step.constructor.name) {
           case 'ReplaceStep': handleReplace(step); break;
           case 'ReplaceAroundStep': handleWrap(step); break;
           case 'AddMarkStep':
           case 'RemoveMarkStep': handleFormat(step); break;
           case 'AttrStep':
           case 'DocAttrStep': handleAttr(step); break;
       }
   }
   ```
2. **Format-change mark** `FormatChange` (new Tiptap mark): attrs `{ suggestionId, authorId, marksAdded[], marksRemoved[] }`. Renders as a thin wavy underline in author color.
3. **Block-level changes**: extend existing `DiffBlockAttr` extension to apply to live editing too — when a node attr changes (heading level, list type), set `pendingChange: { kind, before, after, suggestionId }`.
4. **Selection-aware pairing**: when `tr` contains multiple steps within one user action (`tr.getMeta('uiEvent') === 'paste' | 'drop'` or single transaction), merge their `suggestionId`s.
5. **Comprehensive tests** in `frontend/src/editor/suggestions/__tests__/`:
   - typing → 1 insert
   - select+delete → 1 delete
   - select+type → 1 replace
   - paste over selection → 1 replace
   - cut → 1 delete
   - drag reorder → 1 move (paired delete+insert)
   - bold toggle → 1 format change
   - heading change → 1 block format change
   - undo of any of the above → suggestion removed, no new ones added
   - IME composition → 1 insert
6. **Telemetry hook**: add a debug log mode (env-flagged) that prints step kind + decision for development.

### Files
- `frontend/src/editor/suggestions/SuggestionMode.ts` (rewrite)
- `frontend/src/editor/suggestions/trackChangeMarks.ts` (add `FormatChange` mark)
- `frontend/src/editor/suggestions/suggestionOps.ts` (extend ADT, add `acceptFormat`/`rejectFormat`)
- `frontend/src/editor/suggestions/__tests__/*.test.ts` (new — pure ProseMirror unit tests, no React)
- `frontend/src/editor/suggestions/suggestions.css` (style `FormatChange` wavy underline)
- i18n: `editor.suggestions.format.{bold,italic,heading,list,...}`

### Acceptance
- Each item in the list above creates exactly the right number of suggestions.
- Round-trip: accept all → doc equals doc with suggestions accepted naively. Reject all → doc equals pre-edit doc.
- Test suite green; new tests cover every case in the gaps list.

---

## Cross-cutting concerns

- **i18n**: every new visible string must be in `en`, `pl`, `ua` translation files at the listed keys.
- **No file >250 loc** — split components and stores.
- **ADT discriminators** — every new domain type uses `kind` (`ThreadKind`, `SuggestionOp.kind`, `EditorView.kind`, `Pin.kind`).
- **Tests**: each feature lands with at least one unit test for pure logic (diffing, grouping, pairing) and one integration test (sidebar shows expected card given a fixture doc).
- **Migrations** (Feature 3): backend `comments` table — add `kind`, `suggestion_id`. Backfill existing rows with `kind = 'comment'`.
- **Ordering**: do features in this order — 4 (CSS, trivial), 5 (replace grouping, builds on 7's groundwork? but lighter), 1 (autosave UX), 7 (engine rewrite, biggest), 3 (unified panel, depends on 7 finishing), 6 (inline pins, depends on 3 ADT), 2 (version history view, independent — can run in parallel).

---

## Adverse Codex review (self-critique pass)

> Below is a deliberately skeptical review of the plan above. Treat each bullet as a "what could break or be wrong" objection that the implementer must address before shipping.

### Feature 1 — Autosave
- **"Saved" lies if Hocuspocus is offline.** Yjs persists locally and syncs later, but topbar showing "All changes saved" while the WebSocket is dead is misleading. Need an **offline state** (`'offline'`) wired to `provider.status` from `@hocuspocus/provider` — not just `idle/saving/saved/error`.
- **10 min snapshot interval is too coarse for short sessions.** A user who types for 2 min and closes the tab has no named version. Add an "on visibility hidden" / `beforeunload` flush that creates one final snapshot if dirty.
- **Server-side dedup by hash collides with concurrent collaborators.** Two clients producing the same Yjs state still represent different events; cheap dedup based on `lastSnapshotId` rather than content hash is safer. Recommend: dedup only when *no Yjs updates* arrived between attempts — no hash needed.
- **Cmd+S "Name this version" is intrusive.** Google Docs does not prompt on Cmd+S — it saves silently. Reconsider: Cmd+S = silent labeled snapshot with auto-label; "Name version" should be an explicit menu action.

### Feature 2 — Inline Compare
- **Two ProseMirror editors mounted simultaneously is heavy.** Side-by-side diff plus the live editor in another route segment may regress memory on long docs. Tear down the live editor (unmount, not just hide) when entering version history.
- **`?versionId=` URL is shareable but the snapshot may be private.** Authorization: ensure the snapshot endpoint checks per-user access; URL alone must not leak content.
- **Restore overwrites the live Yjs doc — collaborators see content vanish.** Plan says "create snapshot of current state before replacing" but does not describe how. Spell it out: lock collab (`provider.disconnect()`), write new doc state, create pre-restore snapshot, reconnect. All other clients receive the new state via Yjs sync; no client-side conflict resolution.
- **Esc to close fights the comments composer.** Esc is overloaded — clarify priority order (close composer first, version history second).

### Feature 3 — Unified panel
- **Backend "extend comments table with kind" is a lossy migration.** Existing tracked changes in the Yjs doc do not have rows. Plan says "create lazily on reply" but the **first render** then has no thread row, so the card cannot be reacted to. Decision needed: **eagerly create a row at suggestion-mark-creation time** (in `SuggestionMode.appendTransaction`) — but writing to backend from inside a Tiptap transaction is not allowed (sync only). Use a deferred queue: collect new `suggestionId`s, fire `POST` after the transaction.
- **Filter chip "My threads"** is ambiguous — author? assignee? mentioned? Define before building.
- **Suggestions sorted "by document position" + comments sorted "by document position"** breaks for resolved threads with no anchor (anchor stripped on resolve). Need a second-axis sort by `resolvedAt` for resolved tab.
- **"Remove tabs entirely" loses the count badges users rely on for triage.** Keep the chip-filter counts at minimum.

### Feature 4 — Strikethrough color
- **`color-mix` not supported below Safari 16.2 / Chrome 111.** Audit min-supported browsers. If older needed, fallback to a precomputed RGBA via JS in mark `renderHTML`.
- **Background tint stacks** when nested marks (e.g., insertion within a quote) overlap — could become unreadable. Test stacking with bold + insertion + comment-anchor on same range.

### Feature 5 — Replace grouping
- **Multi-step pairing within "500 ms" is fragile.** A slow typist or a pasted glob can cross the boundary. Better: pair by `tr.getMeta('uiEvent')` or by single ProseMirror transaction (which is the natural atomic unit), not wall-clock time.
- **`SuggestionEntry` ADT extension** clashes with existing `SuggestionType` enum (`Insertion | Deletion`). Need a rename + migration of all consumers; plan says "extend" but several call sites assume the two-variant enum.

### Feature 6 — Inline pins
- **64 px gap between pins explodes vertical space** for dense comment docs. Google Docs solves this with stacking + "show N more" collapse. Add a stacking strategy: when pins would overlap, collapse to a numbered cluster avatar that expands on hover.
- **`full` mode side panel is now redundant with cards.** Decide: hide sidebar in `full` mode? Or sidebar shows resolved/filtered? Plan does not say.
- **`pinsStore` / `paneStore` overlap** — risk of two sources of truth for "is the pin layer visible". Pick one store.

### Feature 7 — Engine
- **`step.constructor.name` is brittle under minification.** Use `instanceof ReplaceStep` (imported from `prosemirror-transform`) — name comparison breaks in production builds.
- **Tracking format changes is a big scope creep.** Google Docs *does* track formatting, but the proposed `FormatChange` mark stacked alongside `Insertion` and `Deletion` could explode mark combinations. Consider a `Decoration` plugin instead of a mark — decorations are presentational and don't pollute the doc.
- **AttrStep / DocAttrStep tracking** in collab is messy because attrs change from many sources (cursor, presence). Whitelist which attr changes track (heading level, list kind), don't catch-all.
- **IME composition test on real device** required — JSDOM cannot simulate. Either set up Playwright with a real browser + IME emulation, or accept manual test.
- **Undo detection via `tr.getMeta('addToHistory')`** is unreliable — Yjs's `UndoManager` uses different metadata. Use `origin === yUndoManager` check with the actual Yjs UndoManager singleton; otherwise undo *will* create new suggestions.
- **Drag reorder = "Move"** is a UX claim, not in plan acceptance — should we render it as a single "Moved X" card or two independent ins/del? Decide before implementation.

### Cross-cutting
- **600 loc cap will be violated.** Realistically, the unified threads sidebar + composer + filter + card alone will exceed 600 loc. Plan should explicitly require splitting *and* enforce via ESLint custom rule (`max-lines: [error, 250]`).
- **i18n keys listed are aspirational.** Plan must include a checklist task: "create keys in en/pl/ua and grep for English literals" before merge.
- **Tests directory does not exist** for editor suggestions (`__tests__/` is new). Confirm vitest/jest config picks it up; otherwise the new tests run nowhere.
- **Ordering claim** "do 7 before 3" forces a long-running engine rewrite blocking the user-visible panel work. Reconsider: stub engine improvements first (cover paste + replace pairing), ship Feature 3 against the stub, then complete Feature 7 in the background.

---

## Adverse Codex review — second pass (additional objections)

> The first self-review missed the following. These are *new* objections found by an external skeptical pass.

### 1. Logic / correctness flaws

- **F1 — `useDirtySaveIndicator` on Yjs `update` flips for remote edits.** Yjs `update` fires for both local and remote transactions. Without `transaction.local` filtering (`ydoc.on('afterTransaction', ...)`), a collaborator's edit shows "saving/saved" on *your* topbar even when you did nothing. This is a correctness bug, not UX noise.
- **F1 — idle window starvation.** "30 s idle OR 10 min cap" can starve in a busy shared doc: if cap timer resets on every remote update, autosnapshots may never fire. Cap timer must be local-edit-only.
- **F2 — restore mechanism unspecified.** The plan does not say whether restore applies a Yjs state vector, runs ProseMirror commands to replace content, or overwrites the Yjs doc bytes. Each has different peer-consistency implications. PM replacement on a long doc generates a huge step stream and partial intermediate states peers will see; raw Yjs overwrite has wrong merge semantics. **Pick one and document it.**
- **F3 + F5 — `suggestionId` collisions.** Grouping by `suggestionId` requires global uniqueness across sessions and clients. If IDs are short/random without session entropy, two unrelated edits may share an id and merge into one wrong "Replace" card.
- **F5 — adjacency rule "ranges touch or share position" misclassifies.** A deletion + nearby unrelated insertion (e.g., punctuation cleanup near a word change) gets paired into a fake replace. Pair only by **same transaction** + **same `suggestionId`**, never by spatial adjacency alone.
- **F7 — naive step iteration uses stale positions.** `for (const step of tr.steps)` without mapping through `tr.mapping` operates in pre-step coords; later step extraction of "before text" can be wrong for multi-step transactions.

### 2. Hidden coupling

- **F1 → F2**: `EditorSaveStatus` click opens version history, but F2 changes that route. Doing F1 first wires to a soon-deleted target — rework risk.
- **F6 → F3**: `InlinePinCard` renders `SuggestionOp` previews and reply counts — that contract isn't stable until F3's `Thread` ADT is final.
- **F5 → F3**: F5 edits the old `SuggestionCard.tsx`, which F3 deletes. Building F5 in the old path produces throwaway code or duplicated renderers.
- **F7 → F3**: Format / block / move suggestion kinds need filter chips and card rendering in F3 immediately, or users see unrenderable threads.

**Revised order (supersedes "Cross-cutting → Ordering" above): 4 → 7-stub (paste + replace pairing only) → 5 (build directly in F3 path, not old) → 3 → 1 → 6 → 2 → 7-full.**

### 3. Underestimated scope

- **F2 — keeping two diff pipelines (rich/markdown × inline/side-by-side) consistent in a non-modal shell** is a medium/large UI-state project: keyboard, selection sync, scrolling all need re-plumbing.
- **F3 — "reuse comments API with `kind`"** sounds simple but suggestion threads have accept/reject lifecycle, op payloads, distinct authz, distinct indexing. "Reuse" usually becomes parallel code paths.
- **F6 — variable-height card collision** is a layout engine problem. The existing dot-collision code tuned for fixed-height won't generalize with just a wider gap constant. Plan must specify a stacking / cluster-collapse strategy.
- **F7 — deterministic tests for IME, drag-drop, paste-replace, block attrs, undo/redo** likely need a mixed unit + Playwright harness, not pure JSDOM.

### 4. Missing migration / data concerns

- **F1 — stranded localStorage autosnapshots** for existing users: plan removes the path but no cleanup or import. Recoverable drafts get orphaned.
- **F2 — `VersionDiffModal` deletion** without redirecting any deep links / UI entry points that opened the modal.
- **F3 — DB migration omits constraints**: `suggestion_id` needs uniqueness + nullability policy; otherwise duplicate threads for one mark, split history.
- **F3 — lazy thread creation loses audit trail** if a suggestion is accepted/rejected before any reply. Persist the thread row at mark-creation, not at first reply.
- **F5 — `SuggestionEntry` ADT shape change** with no migration of persisted/cache shapes. Hydration from the old two-kind enum may crash silently or drop entries.

### 5. Better alternatives

- **F1 dedup**: store `lastSavedStateVector` and skip when unchanged. Full byte-hashing every candidate is expensive on large docs.
- **F2 read-only mode**: render precomputed diff HTML or a stripped-down PM view (no plugins) for version history instead of mounting a full editor instance.
- **F3 polymorphic `Thread` union**: separate domain entities with a shared presentation adapter may be cleaner than a forced union — accept/reject lifecycle differs enough that a single ADT creates sprawling conditional logic.
- **F7 `FormatChange`** as Tiptap *mark* requires schema evolution, copy/paste survival, serialization. ProseMirror **decorations** or side-channel metadata are safer for transient review UI.
- **F6 three-state toggle**: viewport-responsive rule + one boolean preference may suffice instead of tri-state cycling.

### 6. Missing acceptance criteria

- **F1** "All changes saved within 1 s" — define the source-of-truth: ack-from-server? local Yjs commit? Hocuspocus `synced` event?
- **F2** "All existing diff layouts still work" — list explicit parity cases: long docs, images, tables, line-wrap in side-by-side.
- **F3** "Replying to suggestion works identically to comment" — define identity across mentions, notifications, permissions, resolved-state behavior.
- **F5** "Select `foo`, type `bar` → one card" is too narrow. Add cases: non-adjacent punctuation edits, IME, concurrent collaborator edits.
- **F6** "Cards do not overlap" — specify minimum spacing, max displaced distance from anchor, cluster-fallback threshold.
- **F7** "Right number of suggestions" — replace with fixture-based expected mark/state oracles, not counts.

### Top 5 must-fix before any implementation

1. **Define F2 restore write-path exactly** (PM replace vs Yjs state application) and its peer-consistency behavior — highest-risk correctness gap.
2. **F1 save-status must be local-only**: filter by `transaction.local` so remote edits don't flip your topbar.
3. **Specify uniqueness model for `suggestionId` and `suggestion_id` DB rows** before F3 / F5.
4. **Reorder F5 to land in the F3 unified-thread UI path**, not the old suggestion sidebar (revised order above).
5. **Upgrade F7 acceptance to fixture-based oracles** (expected serialized marks/state per operation), not qualitative counts.

---

## Implementation hand-off note for Sonnet

- Read this file and the referenced source files end-to-end before touching code.
- Address every objection in BOTH adverse-review sections — either fix in the implementation or document the trade-off in the PR description.
- **Use the revised ordering** under "Hidden coupling" above (4 → 7-stub → 5 → 3 → 1 → 6 → 2 → 7-full), not the original ordering.
- Each PR must include: code, tests, i18n keys for `en` + `pl` + `ua`, screenshot for UI changes, and a "tested manually" checklist.
- For each of the **Top 5 must-fix** items, write a short ADR (decision + alternatives considered) into `docs/decisions/` before opening the corresponding PR.
