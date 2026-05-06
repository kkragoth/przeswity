# Editor Improvements — Comments, Suggestions, Diff

Implementation-ready plan for the three collaborative review features: **comments** (annotation threads), **suggestions** (track changes), **versions/diff** (snapshots + comparison). All file:line refs and premises were verified against the source on 2026-05-05; corrections from adverse review are folded in.

---

## 0. Verified Architecture Facts (read before implementing)

- **Comments storage**: threads live in a Y.Map named `comments` on the *same* Y.Doc as the prose content (`frontend/src/editor/comments/threadOps.ts:4-5`). They are *not* a separate document.
- **Snapshots are full Y.Doc updates**: stored as binary on the backend, applied via `Y.applyUpdate` (`VersionHistoryView.tsx:31-37`). This means snapshots **already contain** comment threads, suggestion replies, settings — anything in the Y.Doc.
- **Restore is content-only**: `editor.commands.setContent(leftJson, { emitUpdate: true })` (`VersionHistoryView.tsx:106`) replaces ProseMirror JSON only. The Y.Map sub-stores (`comments`, `suggestionReplies`, `__settings__`) are NOT rewound.
- **Two diff surfaces** exist with different feature sets:
  - `VersionDiffModal.tsx` — has stats legend (`:84-90`), SBS toggle (`:64-73`), markdown view toggle.
  - `VersionHistoryView.tsx` — hardcodes `useSbs={false}` (`:133`), no stats banner, no SBS, no markdown.
- **Diff does word-level inline marks already**: `buildDiffDoc` walks the changeset and applies `insertion`/`deletion` marks at character ranges (`diffDoc.ts:47-66`). `diffBlock` attribute is *only* added when a block is wholly insertion or wholly deletion (`diffDoc.ts:103-110`); mixed blocks are intentionally untagged.
- **`unsetComment` is removal by id across whole doc** (`CommentMark.ts:58-77`). Implicit text deletion never calls it — the mark vanishes with the text via standard ProseMirror semantics.
- **Comment thread filter uses author *name***, suggestion marks carry `authorId` (`commentsStore.ts:27-31` vs `trackChangeMarks.ts:19-24`). Identity normalization is required for any unified filter.

---

## 1. Cross-Feature Integration Map

| Producer ↓ / Visible in → | Editor | Suggestions Sidebar | Diff Modal | Diff History View | Restore |
|---|---|---|---|---|---|
| Comment threads | ✅ pins | ✅ unified threads | ❌ ghost spans | ❌ ghost spans | ⚠️ Y.Map preserved by snapshot, lost by `setContent` |
| Insertion / Deletion marks | ✅ inline + bubble | ✅ cards | ✅ (synthetic) | ✅ (synthetic) | n/a |
| FormatChange marks | ✅ underline only | ❌ **invisible** | ❌ stripped | ❌ stripped | n/a |
| Suggestion replies | ✅ thread cards | ✅ thread cards | n/a | n/a | ⚠️ same as comments |
| Snapshots | n/a | n/a | ✅ | ✅ | ✅ content only |

---

## 2. Tier 1 — Implementation Specs

### T1.1  FormatChange in suggestions sidebar
**Premise verified**: collector at `containers/editor/suggestions/index.tsx:37-91` matches only `Insertion`/`Deletion`. Mark + ops exist (`trackChangeMarks.ts:95-129`, `suggestionOps.ts:76-122`).

**Contract**:
```ts
// extend SuggestionEntry ADT
type SuggestionEntry =
  | { kind: 'insert'; suggestionId; range; author; timestamp; text }
  | { kind: 'delete'; suggestionId; range; author; timestamp; text }
  | { kind: 'replace'; suggestionId; insertRange; deleteRange; author; timestamp; insertText; deleteText }
  | { kind: 'format'; suggestionId; range; author; timestamp; summary: FormatSummary }

type FormatSummary =
  | { kind: 'mark-add'; markName: string; attrs?: Record<string,unknown> }
  | { kind: 'mark-remove'; markName: string }
  | { kind: 'node-attr'; attr: 'level' | 'listType' | 'type'; from: unknown; to: unknown }
  | { kind: 'multi'; count: number }  // when one suggestionId carries >1 atomic format change
```

**Implementation steps**:
1. Add `collectFormatChanges(doc)` parallel to `collectSuggestions`. Walk descendants; for each `formatChange` mark, `JSON.parse` the `marksAdded`/`marksRemoved`/`nodeAttr` attrs (with try/catch — fall back to `{kind:'multi', count: 0}` on malformed JSON, log once).
2. Group ranges by `suggestionId` (a single format edit may produce contiguous ranges across siblings). Merge contiguous ranges; for each suggestionId emit one entry.
3. Add `<FormatChangeCard>` reusing the existing card chrome; body renders i18n string per `FormatSummary.kind`. Strings: `suggestions.format.markAdded`, `markRemoved`, `nodeAttrChanged` (with interpolated values).
4. Wire `acceptFormatChange` / `rejectFormatChange` to the new card buttons.
5. Bulk Accept/Reject must include format entries.

**Edge cases**:
- Mixed-author selections within one `suggestionId` (shouldn't happen, but log warn and pick first author).
- A `suggestionId` shared between insertion+deletion *and* formatChange → render as `replace` with a "format also changed" sub-line (do not double-emit).

**Tests**:
- Unit: `collectFormatChanges` over fixture docs covering bold add, heading level change, list type swap, malformed JSON.
- Integration: accept/reject via card removes mark; bulk-accept includes format entries.

**Effort**: S–M. ~120 LOC in sidebar + card.

---

### T1.2  History-view diff: stats banner + hunk navigation
**Premise corrected**: stats banner already exists in modal (`VersionDiffModal.tsx:84-90`). Missing only in `VersionHistoryView.tsx`. Hunk navigation absent in both surfaces.

**Scope**: `VersionHistoryView` only (modal stays as-is to avoid re-layout).

**Contract**:
```ts
interface DiffHunk {
  kind: 'block-ins' | 'block-del' | 'inline-ins' | 'inline-del'
  fromPos: number   // ProseMirror pos in the diff doc
  toPos: number
  index: number     // 0-based ordinal across the document
}

function useDiffHunks(editor: Editor | null): DiffHunk[]
```

**Implementation steps**:
1. Add `<DiffStatsBanner>` above `<DiffRichView>` in `VersionHistoryView` (`:127`). Reuse `diffStats(diffJson)` — already imported elsewhere; render same chrome as modal banner. Also show `9 changed blocks` count derived from `diffBlock` attr scan.
2. New hook `useDiffHunks(editor)` walks the read-only editor's doc on each `editor.view.state.doc` change; collects hunk positions in document order. Memoize on doc identity.
3. Floating prev/next buttons in bottom-right of `vh-main`; arrow keys (j/k or ↑/↓ with modifier) when diff scroll container has focus. Active hunk index in `useState`; on advance, scroll the hunk into view via `editor.view.coordsAtPos(fromPos)` + container `scrollTo`.
4. Right-edge mini-map (`<DiffMinimap hunks={...} active={...} />`): absolute-positioned div, height 100% of scroll container, child ticks at `top: (fromPos / docSize) * 100%`. Click → jump.

**Edge cases**:
- Empty diff → hide all controls.
- Doc resize / zoom → recompute pixel positions on `ResizeObserver` of scroll container.
- Active hunk on scroll: track via `IntersectionObserver` on each tick element, not on every scroll event.

**Tests**:
- Unit: `collectDiffHunks(json)` returns hunks in order for fixture diffs.
- Manual: prev/next from start/end wraps correctly; minimap clicks land on the right block.

**Effort**: M. ~250 LOC across hook + 3 components + i18n.

---

### T1.3  Restore preserves comments (and other Y.Doc maps)
**Premise corrected**: snapshots already contain the full Y.Doc. The bug is in restore: `setContent(leftJson)` overwrites prose only, leaving comments referencing text that no longer exists (or worse, anchored to wrong content).

**Decision required before coding**: which Y.Doc maps does restore replace?
- **Option A (recommended)**: full Y.Doc rewind. Disconnect provider, replace doc state with snapshot bytes via `Y.applyUpdate` against a fresh doc, reconnect.
- **Option B**: only `prose` + `comments` + `suggestionReplies`. Preserves `__settings__` and any other ambient state. More surgical, more brittle.

**Contract** (Option A):
```ts
async function restoreSnapshot(opts: {
  bookId: string,
  snapshotId: string,
  ydoc: Y.Doc,
  provider: HocuspocusProvider,   // or whatever the codebase uses
  editor: Editor,
}): Promise<{ preRestoreSnapshotId: string }>
```

**Implementation steps**:
1. Inspect provider lifecycle in the codebase (`grep -r 'HocuspocusProvider\|y-websocket\|new Y.Doc' frontend/src`). Confirm the doc reset pattern other operations use.
2. Create pre-restore snapshot first (already done, `VersionHistoryView.tsx:102-105`).
3. Disconnect provider awareness/sync.
4. Compute diff update: `Y.encodeStateAsUpdate(targetDoc) - Y.encodeStateAsUpdate(currentDoc)` is wrong (Yjs is monotonic). Instead: clear all top-level maps + replace XmlFragment, OR replace doc reference entirely and remount the editor binding.
5. Reconnect; broadcast new state.
6. Toast success/failure with rollback hint.

**Risks (must address in design)**:
- **CRDT monotonicity**: you cannot "restore" a Y.Doc to an older state in-place. The accepted pattern is "open a fresh doc seeded with the snapshot bytes, swap the editor binding, broadcast." All collaborators see a doc reset.
- **Concurrent collaborators**: must show a confirmation modal naming who is currently editing (from awareness) before restore.
- **History stack**: `setContent` clears the local undo stack today; full doc swap will too. Document this in the toast.

**Migration**: existing snapshots already contain Y.Map data (no migration). Audit one production snapshot to confirm `comments` map serializes as expected (`Y.applyUpdate` to fresh doc, log `doc.getMap('comments').size`).

**Tests**:
- Unit: serialize+restore round-trip preserves `comments` map keys, statuses, replies.
- Integration: restore with two browsers connected — one initiates, the other sees the swap and is shown a "doc was restored by X" toast (requires backend broadcast).

**Effort**: L. Touches provider lifecycle. **Do a 1-day spike first** to confirm the doc-swap mechanism before committing to the full task. If swap is infeasible in this provider, fall back to Option B with explicit map-by-map replay.

---

### T1.4  Orphaned-comment recovery
**Premise corrected**: detection cannot live in `CommentMark.unsetComment` because implicit deletion never calls it. Detection requires a ProseMirror plugin observing transactions.

**Contract**:
```ts
type CommentThreadStatus = 'open' | 'resolved' | 'orphan'

interface OrphanMetadata {
  orphanedAt: number       // ms
  lastKnownQuote: string   // text before deletion
  lastKnownAuthorId: string
}

// Thread shape extension (additive, backward-compatible):
//   thread.status: 'open' | 'resolved' | 'orphan'
//   thread.orphan?: OrphanMetadata
```

**Detection plugin**:
1. Add `commentOrphanWatcher` plugin to TipTap extensions.
2. On every transaction with `docChanged`: compute `marksBefore = commentIdsInDoc(prevState.doc)` and `marksAfter = commentIdsInDoc(newState.doc)`. The set difference is "vanished comment ids".
3. For each vanished id whose thread has `status === 'open'`: in a microtask (avoid mid-tx writes), call `markOrphan(threadId, { lastKnownQuote: thread.quote, ...})`.
4. Skip when transaction was triggered by explicit `unsetComment` — tag those tx with a meta flag: `tr.setMeta('comment:explicit-unset', true)` inside the `unsetComment` command.
5. Skip when origin is remote (Y.js sync) — only the *local* user's edit can orphan; remote edits already settled.

**Re-anchor flow**:
- Sidebar adds 4th tab "Orphaned" (filter ADT extends to include `kind:'orphan'`).
- Card shows last-known quote and "Re-attach" button. Click: enter selection mode (cursor + escape to cancel). User selects new range → `setComment(threadId)` over selection, flip status back to `open`, clear `orphan` metadata.
- "Dismiss" button: hard-deletes the thread (with toast undo).

**Edge cases**:
- Two open comments on overlapping ranges; user deletes the overlap → both vanish in same tx → both orphan, both re-attachable independently.
- User undoes the deletion → orphan plugin sees the comment id reappear → flip status back to `open` automatically.
- User closes the tab before re-attaching → orphan persists in Y.Map across sessions (correct behavior).

**Migration**: existing `'open'|'resolved'` statuses unchanged. New `orphan` status is additive. Selectors/filters get a third branch with `assertNever`.

**Tests**:
- Plugin unit: simulate delete-of-marked-text tx → expect `markOrphan` call.
- Plugin unit: explicit `unsetComment` tx → no orphan call.
- Plugin unit: undo of deletion → orphan auto-cleared.

**Effort**: M. Plugin is the bulk; UI re-attach flow is small.

---

### T1.5  Inline author attribution on suggestion bubble
**Premise verified**: marks carry `authorName`, `authorColor`, `timestamp` (`trackChangeMarks.ts:19-48`). Bubble shows only Accept/Reject (`SuggestionBubble.tsx:62-89`).

**Contract**:
```ts
interface BubbleAuthorInfo {
  kind: 'single' | 'multiple'
  primary: { name: string; color: string }
  count?: number  // when kind = 'multiple'
  timestamp: number  // most recent across overlapping marks
}

function authorInfoAt(state: EditorState, pos: number): BubbleAuthorInfo | null
```

**Implementation steps**:
1. New helper `authorInfoAt(state, pos)`: collect all suggestion marks at `pos`, group by `authorId`. If one author → `single`. If multiple → `multiple` with count.
2. Bubble header (above the existing button row): `<div class="bubble-attr">{primaryName} · {relativeTime(timestamp)}</div>`. If `kind === 'multiple'`, append `+N others`.
3. Color the underline using `authorColor` via inline `style={{ '--suggestion-color': color }}` on the bubble; CSS already supports this pattern (verify in `suggestions.css`).
4. Null-safe: if `authorName` is empty/null → fallback to i18n `suggestions.unknownAuthor`.

**Tests**:
- Unit: `authorInfoAt` over fixture state with single/multi-author overlap, with null fields.
- Manual: hover; tooltip text matches expectations.

**Effort**: S. ~80 LOC.

---

## 3. Tier 2 — Implementation Specs

### T2.1  Comments visible in diff view (no T1.3 dependency)
**Premise corrected**: T2.1 does *not* require T1.3. The diff view loads `Comment` mark already (`readOnlyExtensions.ts:32`) — interactivity can be wired without changing snapshot semantics.

**Decision**: which thread store does the diff comment layer read from?
- For the *current* side: live `getThreadMap(editor.options.ydoc)` — same as the editor.
- For a *snapshot* side: derive an ephemeral thread map by applying snapshot bytes to a throwaway Y.Doc and reading `getMap('comments')`. Cache by snapshot id.

**Contract**:
```ts
interface DiffCommentSource {
  side: 'left' | 'right'
  threads: ReadonlyMap<string, CommentThread>  // ephemeral, read-only
  isLive: boolean   // true for "current"; controls whether reactions/replies are allowed
}

function useDiffCommentSources(left: DiffSide, right: DiffSide): {
  left: DiffCommentSource | null
  right: DiffCommentSource | null
}
```

**Implementation steps**:
1. Build `useDiffCommentSources` returning the two read-only thread maps.
2. New `<DiffCommentLayer source side />` mounts on top of the diff editor. Reuses `useCommentPinPositions` (it only needs an editor + threads).
3. Pin click → opens `<DiffThreadPopover>` (read-only thread view). For `isLive=true` side, allow replies; for snapshot side, replies disabled with tooltip "Read-only snapshot".
4. Pins for orphaned comments (post-T1.4) shown with a dashed outline and "(orphaned at this version)" sub-text.
5. Comment marks present in the diff JSON but with no thread record (e.g., comment created on the live side, snapshot doesn't have it) → render as muted span only, no pin.

**Edge cases**:
- The diff doc fuses content from both sides via `buildDiffDoc`. Comment marks from deleted text (now wrapped in `<del>`) should NOT show pins (they're not addressable). Strip `comment` marks from inside `deletion`-marked ranges in `buildDiffDoc`, OR filter at the layer level.
- A comment exists on both sides with same `commentId` but different ranges → use the right side as canonical; surface a "(range changed)" hint.

**Tests**:
- Unit: `useDiffCommentSources` returns expected maps for snapshot vs current.
- Integration: pin counts visible in diff match thread counts in sidebar for the same side.

**Effort**: M. ~300 LOC including the popover.

---

### T2.2  Block-level vs inline diff polish
**Premise corrected**: word-level inline diff already works (`diffDoc.ts:47-66`). The real defect is `diffBlock` annotation: when most of a block changes but one word survives, `blockChangeKind` returns `Mixed` → block stays untagged but is visually noisy.

**Reframed scope**: tune the threshold for "wholly changed".

**Contract**:
```ts
function blockChangeKind(node: JSONNode, threshold = 0.85): BlockKind
// If insertion-marked chars / total chars >= threshold → Ins
// If deletion-marked chars / total chars >= threshold → Del
// Else → Mixed (untagged)
```

**Implementation steps**:
1. Re-implement `blockChangeKind` (`diffDoc.ts:82-101`) to compute a ratio rather than the all-or-nothing rule.
2. Threshold default 0.85; expose as parameter.
3. Add a new `BlockKind.MostlyIns` / `MostlyDel` if we want a third visual treatment (lighter background); otherwise reuse `Ins`/`Del`.

**Open question (decide before coding)**: do we *want* to mark "mostly-changed" blocks differently? If the answer is "mixed paragraphs are fine as-is", **drop this item**. Suggested validation: collect 5 real diffs from the team and tag visual issues; only ship if pattern is real.

**Tests**:
- Unit: ratio calculation across fixture docs.
- Visual regression: snapshot tests on diff CSS.

**Effort**: S — but **gated on visual validation**. Do not ship without examples.

---

### T2.3  History view: enable inline/SBS toggle
**Premise corrected**: SBS works in modal (`VersionDiffModal.tsx:64-73`). History view hardcodes `useSbs={false}` (`VersionHistoryView.tsx:133`).

**Implementation steps**:
1. Lift the modal's `LayoutMode` enum + toggle UI into a shared `<DiffLayoutToggle>` component.
2. In `VersionHistoryView`, add toggle to `VersionComparePicker` (or its own bar). State synced to URL via `?layout=inline|sbs`.
3. Replace hardcoded `useSbs={false}` with state value.
4. Persist user preference in `localStorage` per book (key: `versionDiffLayout:${bookId}`).
5. SBS scroll sync: deferred — modal currently does not sync, so no regression. Track as separate task.

**Edge cases**:
- SBS disabled when one side is unresolved (loading) — match modal logic at `VersionDiffModal.tsx:40` (`sbsAvailable = !!olderJson && !!newerJson`).

**Tests**:
- Manual: toggle persists across page reload via URL; localStorage default applied on fresh load.

**Effort**: S. ~80 LOC.

---

### T2.4  Per-author filter (suggestions + comments)
**Premise verified, with caveat**: comments filter on author *name*, suggestions store author *id*.

**Implementation steps**:
1. **Identity normalization**: introduce `Participant = { id; name; color }` derived once per session from `useEditorSession().peers + currentUser`. Use `id` as the canonical key everywhere.
2. **Migrate comment filter** (`commentsStore.ts:27-31`) from `authorFilter: string` (name) → `authorIds: Set<string>`. Selectors switch from name comparison to id lookup. Existing in-memory state is per-session; no persistence migration needed.
3. **Add suggestion sidebar filter**: same `authorIds: Set<string>`. Hoist to a shared `useReviewFilters()` hook backed by Zustand if both panels share state, or independent stores if not (decide based on UX — does toggling "Alice" in comments filter also hide her suggestions? Recommend: independent toggles, shared chip strip presentation).
4. **Chip row component** at top of each sidebar: chips show `<colorDot> <name>` for each participant; click toggles. "All" chip clears filter.
5. **Empty state**: when filter selects an author with no matching items, show "No items from {name}" with a Clear button.

**Edge cases**:
- Author has authored comments but no suggestions → chip shows in comments panel only.
- Anonymous / system author → bucket under a `system` chip (id `'system'`).
- A participant leaves the doc — chip stays visible while their items remain.

**Tests**:
- Unit: selector returns only items matching the filter set.
- Unit: empty filter set means "show all" (not "show none").

**Effort**: M. ~180 LOC across store + chip component + selector updates.

---

### T2.5  Cherry-pick restore — **DESIGN SPIKE FIRST, NOT IMPLEMENTATION-READY**
**Risk summary**: Yjs CRDT is monotonic; you cannot "remove a hunk" by rewinding. Hunk → ProseMirror transaction is non-trivial:
- Positions in the diff doc are *not* positions in the live doc (diff doc fuses both sides).
- Concurrent edits on the live doc shift target positions during the user's deliberation.
- Format changes and structural inserts straddle node boundaries unpredictably.
- The existing `try/catch` at `diffDoc.ts:62-64` already hints at slice-replay fragility.

**Required before coding** (1–2 day spike):
1. Document a transaction contract: given a `DiffHunk` and a current `EditorState`, produce a `Transaction` with explicit preconditions (target text matches, no conflicting marks). State the failure modes in user-visible language.
2. Define position-remap strategy: re-locate the hunk's anchor by content match (not by position) immediately before applying.
3. Decide UX for partial application: "Some hunks could not be applied because the document changed. {N} applied, {M} skipped."
4. Decide collaboration semantics: cherry-pick is a *normal local edit* (origin = local user) — collaborators see it as if the user typed it. Don't tag with diff origin.

**Until the spike concludes, this item is NOT in the implementation backlog.** Bumped from Tier 2.

---

## 3.6  New plugin in the plan: `commentOrphanWatcher` (T1.4)

The orphan plugin is the only *new* TipTap/ProseMirror plugin added by Tier 1. Spec:

```ts
// frontend/src/editor/comments/commentOrphanWatcher.ts
import { Plugin, PluginKey } from 'prosemirror-state';
import * as Y from 'yjs';

export const commentOrphanWatcherKey = new PluginKey('commentOrphanWatcher');

interface Options {
  ydoc: Y.Doc;
  isLocalOrigin: (tr: Transaction) => boolean;  // skip remote sync tx
  markOrphan: (threadId: string, lastQuote: string, author: string) => void;
}

export function commentOrphanWatcher(opts: Options): Plugin {
  return new Plugin({
    key: commentOrphanWatcherKey,
    appendTransaction: (trs, oldState, newState) => {
      if (!trs.some((tr) => tr.docChanged)) return null;
      if (trs.some((tr) => tr.getMeta('comment:explicit-unset'))) return null;
      if (!trs.some((tr) => opts.isLocalOrigin(tr))) return null;

      const before = collectCommentIds(oldState.doc);
      const after = collectCommentIds(newState.doc);
      const vanished = [...before].filter((id) => !after.has(id));
      if (vanished.length === 0) return null;

      // Defer Y.Map writes — never write inside appendTransaction.
      queueMicrotask(() => {
        const threads = opts.ydoc.getMap('comments');
        for (const id of vanished) {
          const thread = threads.get(id) as CommentThread | undefined;
          if (!thread || thread.status !== 'open') continue;
          opts.markOrphan(id, extractQuote(oldState.doc, id), thread.authorName);
        }
      });
      return null;
    },
  });
}
```

Wired in `extensions.ts` after `Comment` extension:

```ts
Comment.configure({ onCommentClick: config.onCommentClick }),
Extension.create({
  name: 'commentOrphanWatcher',
  addProseMirrorPlugins() {
    return [commentOrphanWatcher({
      ydoc: collab.doc,
      isLocalOrigin: (tr) => !tr.getMeta('y-sync$') && !tr.getMeta('y-prosemirror$'),
      markOrphan: (id, quote, author) =>
        config.onCommentOrphan(id, { lastKnownQuote: quote, lastKnownAuthorId: author }),
    })];
  },
}),
```

Tag explicit unset in `CommentMark.unsetComment`:
```ts
tr.setMeta('comment:explicit-unset', true);
```

---

## 4. Other Plugins Worth Adding (gap analysis vs current stack)

Current loaded extensions (`extensions.ts:63-134`): StarterKit, CharacterCount, TextAlign, TaskList/Item, Collaboration + custom cursor, Comment, Insertion/Deletion/FormatChange, DiffBlockAttr, SmartPaste, FindReplace, Footnote, Image, Table\*, SmartTypography, Highlight, TableOfContents, SlashCommand, GlossaryHighlight, SuggestionMode, PaginationPlus.

This is a long-form book authoring tool (A4 pagination, footnotes, glossary, ToC). Recommendations target that use case + i18n languages (pl/ua/ro/en).

### High-value additions

**P1. `UniqueId` (block-level stable ids)** — *enables several features below*
- Adds an `id` attribute to every block node, persisted across edits and collab.
- **Why**: cross-references, deep links (`#block-{id}`), stable comment anchoring across reorders, hunk-restore (T2.5) targeting by id rather than position.
- **Impl**: TipTap has `@tiptap/extension-unique-id` (Pro) or roll a small one (~80 LOC) using `uuidv4` and `addGlobalAttributes`.
- **Migration**: backfill ids on doc load for existing books in a one-time tx (origin = system).

**P2. `Mention` as marks (T3.3 promoted)**
- Replace text-based `@name` in comments + doc body with first-class mark `mention { userId, displayName }`.
- **Why**: notifications, mentions-of-me filter, accurate user references that survive renames.
- Use `@tiptap/extension-mention` with custom suggestion popover (already have one for slash commands — reuse pattern).
- **Cross-impact**: `MentionTextarea.tsx` becomes a thin wrapper; `MentionPopover.tsx` reusable.

**P3. `LanguageTool` spellcheck/grammar plugin**
- High-leverage for pl/ua/ro authors (browser native spellcheck is weak for these).
- **Impl**: ProseMirror plugin posting paragraph-debounced text to LanguageTool API (self-hosted via Docker image). Decorations underline issues; popover with suggestions.
- **Privacy**: must self-host given collab/book content sensitivity. Add to `docker-compose.deploy.yml`.
- **Effort**: M-L. ~400 LOC plugin + popover + settings.

**P4. `DragHandle` for block reordering**
- `@tiptap/extension-drag-handle` (Pro) or community equivalent.
- **Why**: book authors frequently reorder paragraphs/sections. Currently only via cut+paste.
- **Caveat**: must coexist with PaginationPlus (verify drag preview clears page-break overlays).

**P5. `Mathematics` / KaTeX**
- If academic/technical books are in scope. `@tiptap/extension-mathematics` renders inline + block LaTeX.
- **Why**: footnotes already suggest scholarly use. No equation support today.
- **Decision needed**: confirm with users before adding (adds bundle weight).

**P6. `CodeBlockLowlight`**
- Replace StarterKit's plain code block with syntax-highlighted version via lowlight.
- **Why**: even non-technical books cite code samples; current rendering is plain.
- **Effort**: S. Drop-in replacement.

**P7. `Placeholder`**
- Empty-doc and empty-heading hints. Very small addition that polishes new-book UX.
- `@tiptap/extension-placeholder`. ~10 LOC config.

### Mid-value additions

**P8. `CrossReference` (custom)**
- Internal links: "see Chapter 3", "Figure 2.1". Depends on **P1 (UniqueId)**.
- Mark with `targetId`; renderer resolves to current heading number / figure caption.
- **Effort**: M. ~250 LOC. Builds on TableOfContents data.

**P9. `FocusMode` / typewriter mode**
- Custom plugin: dim non-active paragraphs; keep cursor centered vertically.
- **Why**: long-form drafting ergonomics.
- **Effort**: S–M. ~150 LOC.

**P10. `WordCountGoals`**
- Per-session and per-document targets; progress ring in StatusBar.
- **Why**: writing-productivity feature; book authors track daily word counts.
- Builds on existing `CharacterCount`. ~120 LOC + StatusBar UI.

**P11. `Autolink`** (URL detection)
- StarterKit's `Link` opens-on-click is disabled; auto-link-on-paste is via `SmartPaste`. Missing: auto-detect URLs typed inline. `@tiptap/extension-link` with `autolink: true` covers it.
- **Effort**: XS. Config tweak.

**P12. `Sidenote` / margin annotations**
- Distinct from comments: *published* margin content (Tufte-style). Renders in the page margin via PaginationPlus header/footer slots or custom decoration.
- **Why**: book-style annotation distinct from review comments.
- **Effort**: M. ~300 LOC.

**P13. `Citation` / bibliography manager**
- Inline citation marks (`[cite:bibKey]`); end-of-chapter or end-of-book bibliography rendered from a Y.Map of references.
- **Why**: academic authoring. Pairs well with footnotes.
- **Effort**: L. Sizeable feature; defer unless requested.

### Low-value / situational

**P14. `Emoji` picker** — `:smile:` autocomplete via slash command extension (already have SlashCommand pattern).
**P15. `Embeds`** — YouTube/Vimeo blocks. Probably out-of-scope for books.
**P16. `Backlinks`** — wiki-style `[[link]]`. Useful only if multi-doc linking is on roadmap.
**P17. `RevisionLock`** — read-only ranges per role. Pairs with Proofreader-forced suggesting; could enforce "Authors can't edit accepted-final ranges."

### Sequencing — plugin work

Order favors infrastructure first:

1. **P1 (UniqueId)** — unblocks P2, P8, T2.5, T3.5. Land first.
2. **P7 (Placeholder)** + **P11 (Autolink)** + **P6 (CodeBlockLowlight)** — small, no deps, ship in one PR.
3. **P2 (Mention as marks)** — depends on P1, replaces a brittle subsystem.
4. **P9 (FocusMode)** + **P10 (WordCountGoals)** — productivity batch.
5. **P4 (DragHandle)** — verify against PaginationPlus first (spike).
6. **P3 (LanguageTool)** — needs infra (docker, self-hosted endpoint). Coordinate with backend.
7. **P8 (CrossReference)** — needs P1 in production.
8. **P12 (Sidenote)** — only if user demand.
9. **P5, P13** — gated on user research.

### Plugin discipline

- Every new extension lands with i18n keys for its UI (en/pl/ua/ro).
- Every new ProseMirror plugin must declare its origin filter (skip remote-sync tx) — see `commentOrphanWatcher` template.
- Every new plugin must specify its read-only behavior (does it ship in `readOnlyExtensions.ts`? Diff view? Most should NOT — stay editable-only).
- Bundle weight check: any plugin >50KB minified must be code-split (dynamic import in `extensions.ts`).

---

## 5. Tier 3 — Stretch (no specs yet, kept brief)

- **T3.1 Snapshot management**: tagging, search, locking. Independent backend work.
- **T3.2 Suggestion analytics**: emit lifecycle events from `suggestionOps.ts`; dashboard later.
- **T3.3 Mention entities**: marks not strings. Migration: regex-detect `@name` on doc load and rewrite. Sizeable.
- **T3.4 Mini-map / overview rail**: combine comment, suggestion, change density into one rail. Replaces several scattered indicators.
- **T3.5 Comments on suggestions**: anchor a comment thread to a `suggestionId` so it survives accept/reject. Requires extending `CommentThread` with an optional `anchor: { kind: 'range' } | { kind: 'suggestion'; suggestionId }` ADT.

---

## 6. Refactor Candidates (paired with feature work)

| File | LOC | Issue | Pair with |
|---|---|---|---|
| `editor/suggestions/SuggestionMode.ts` | 213 | Monolithic `appendTransaction` (5 step types) | T1.1 (touches same file) |
| `comments/store/commentsActions.ts` | 178 | All thread+reply+reaction mutators in one file | T1.4 (adds orphan flow) |
| `versions/VersionHistoryView.tsx` | 142 | Mixes data fetch + diff + layout | T1.2 (extract `useResolvedSides`) |
| `comments/CommentAnchors.tsx` | 122 | Dense pin + button bar | T2.1 (pin extraction enables diff layer reuse) |
| `suggestions/SuggestionsSidebar/index.tsx` | 189 | Doc walk on every render | T1.1 (memoize during the rewrite) |
| `suggestions/SuggestionThreadCard.tsx` | 198 | Card + replies + compose | T2.4 (header gets chip row anyway) |

**Shared dedup**:
- `sideLabel()` in `VersionComparePicker.tsx:24-27` and `VersionHistoryView.tsx:40-43` → `versions/utils/sideLabel.ts`.
- Comment mark class hooks in `useCommentScrollPulse.ts:18-78` → unify into `useCommentMarkClasses(editor, threads, activeId)`.

**Dead code to remove**:
- `deleteSuggestionReplies` (exported, never imported).
- `acceptFormatChange`/`rejectFormatChange` are unreachable until T1.1 wires them — keep, mark with TODO referencing T1.1.

**ADT cleanups** (per CLAUDE.md):
- Suggestion entries: discriminated `kind: 'insert'|'delete'|'replace'|'format'` with `assertNever`.
- Comment thread status: `'open'|'resolved'|'orphan'` (T1.4).
- Diff sides already use `DiffSideKind` discriminator — keep.
- Comment anchor (T3.5): `kind: 'range'|'suggestion'`.

---

## 7. Sequencing (revised)

Independent, low-risk first; risky/integrative last.

1. **T1.1** (FormatChange in sidebar) + **T1.5** (inline attribution) — both small, no dependencies, immediate UX win.
2. **T1.2** (history-view stats + hunk nav) + **T2.3** (history-view SBS toggle) — same surface, ship together, scope: VersionHistoryView only.
3. **T2.4** (per-author filter) + ADT migrations — touches store, includes identity normalization.
4. **T1.4** (orphan plugin + recovery UI) — biggest UX gain for comments, isolated from other work.
5. **T1.3 spike** — confirm Y.Doc swap mechanism; if green, ship; if red, fall back to map-by-map restore.
6. **T2.1** (comments in diff) — once `useCommentPinPositions` is reusable from T1.4 cleanup.
7. **T2.2** — only if visual examples justify. Otherwise drop.
8. **T2.5** — design spike. No code until contract is signed off.
9. Tier 3 as capacity allows.

**Hard rules for any agent picking up an item**:
- Do not start T2.5 without the spike doc.
- Do not start T1.3 without the 1-day Y.Doc swap spike.
- Always write tests listed in the item before declaring done.
- Always run `frontend` lint + tests after each item; verify no regressions in the other features (especially after T1.4 plugin and T1.3 restore).
- Always add i18n keys to `en/`, `pl/`, `ua/` (and `ro/` if present — see `frontend/src/locales/`).
- Use `@/` path alias. No relative cross-directory imports.
- Keep new files <250 LOC; split if approaching.
