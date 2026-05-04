---
title: Frontend layout reorganization — extended (renames, splits, tiptap)
status: ready-to-execute
prerequisite: docs/layout.md (must be merged first)
owner: handoff
---

# Frontend layout — extended

This document covers the work explicitly listed as out-of-scope at the bottom
of `docs/layout.md`:

1. **Tiptap engine restructure** — collapse the flat `editor/tiptap/` root into
   semantic sub-folders.
2. **Renames** — files whose name does not match what they export.
3. **Splits** — files >200 lines or with two clearly separable concerns.

It assumes `docs/layout.md` has been merged: feature folders exist under
`containers/editor/<feature>/`, layout chrome lives under
`containers/editor/layout/`, session state lives under
`containers/editor/session/`, and the empty `editor/yjs|diff|app|meta|outline`
folders are gone.

Do **not** start this work before `layout.md` has shipped. Some of these moves
look identical mechanically but their target paths assume the post-`layout.md`
state and would conflict if attempted earlier.

---

## A. Tiptap engine restructure

### Why

`editor/tiptap/` currently has 12 files at the root mixing canvas overlays
(`BlockMenu.tsx`, `BubbleToolbar.tsx`), toolbar pieces (`Toolbar.tsx`,
`StyleDropdown.tsx`, `ToolbarPrimitives.tsx`, `FileMenu.tsx`), header/footer
UI (`HeaderFooterBar.tsx`), the canvas mount (`EditorView.tsx`), and the
engine wiring (`extensions.ts`, `editorContext.ts`, `types.ts`). Two of the
empty placeholder folders (`components/`, `extensions/`) advertise an
intention that was never executed. Sub-folder naming is inconsistent: the
toolbar's zones live in `toolbar/` but the toolbar itself lives at the root.

### Target

```
editor/tiptap/
    index.tsx                       # was EditorView.tsx
    extensions.ts                   # the bundler — unchanged
    editorContext.ts                # ref-cell — unchanged
    types.ts
    constants.ts                    # NEW — A4_PAGE_*, gap colors, etc.
                                    #   currently in editor/constants.ts;
                                    #   move only the page-layout constants
                                    #   used by extensions.ts (lines 36–40)

    canvas/                         # things that overlay the editor surface
        BlockMenu.tsx               # was tiptap/BlockMenu.tsx
        BubbleToolbar.tsx           # was tiptap/BubbleToolbar.tsx
        DragHandle.tsx              # was tiptap/blocks/DragHandle.tsx
        canvas.css                  # carved from tiptap/editor.css —
                                    #   the parts that style overlays
                                    #   (.bubble-toolbar, .block-menu, etc.)

    toolbar/
        index.tsx                   # was tiptap/Toolbar.tsx
        StyleDropdown.tsx           # was tiptap/StyleDropdown.tsx
        FileMenu.tsx                # was tiptap/FileMenu.tsx
        Primitives.tsx              # was tiptap/ToolbarPrimitives.tsx
        SpecialCharsMenu.tsx        # was tiptap/formatting/SpecialCharsMenu.tsx
        toolbar.css                 # was tiptap/toolbar.css
        zones/
            BlockFormattingZone.tsx
            InsertZone.tsx
            PaneToggleZone.tsx
            TextFormattingZone.tsx

    headerFooter/
        HeaderFooterBar.tsx
        useHeaderFooterSync.ts      # was tiptap/hooks/useHeaderFooterSync.ts
        headerFooter.css            # was tiptap/header-footer-bar.css

    blocks/
        blockOps.ts
        useBlockHover.ts            # was tiptap/hooks/useBlockHover.ts
        useBlockMenu.ts             # was tiptap/hooks/useBlockMenu.ts
        useBlockDragDrop.ts         # was tiptap/hooks/useBlockDragDrop.ts
        useBlockDragDrop.test.ts
        blocks.css

    extensions/                     # generic extensions with no feature folder
        Footnote.ts                 # was tiptap/blocks/Footnote.ts
        TableOfContents.ts          # was tiptap/blocks/Toc.ts (filename
                                    #   matches its export)
        Highlight.ts                # was tiptap/formatting/Highlight.ts
        SmartPaste.ts               # was tiptap/formatting/SmartPaste.ts
        SmartTypography.ts          # was tiptap/formatting/SmartTypography.ts
        formatting.css              # was tiptap/formatting/formatting.css

    find/                           # already cohesive — no change
    slash/                          # already cohesive — no change
    contextItems/                   # already cohesive — no change

    hooks/                          # only engine-wide hooks remain
        useAwarenessSync.ts
        useCommentScrollPulse.ts
        useEditorContextMenu.ts
        useEditorInit.ts
        useEditorInteractions.ts

    fonts.css                       # tiptap-canvas font-face declarations
    editor.css                      # remaining canvas/page styles after the
                                    #   canvas/* and headerFooter/* carve-outs
```

**Removed folders:**
- `editor/tiptap/components/` (was always empty)
- `editor/tiptap/formatting/` (split between `extensions/` and `toolbar/`)

**Why split `formatting/`?** Three of its files (`Highlight.ts`,
`SmartPaste.ts`, `SmartTypography.ts`) are pure Tiptap extensions —
no UI. The fourth (`SpecialCharsMenu.tsx`) is a toolbar dropdown. Keeping
them in the same folder forced both meanings on the name.

**Why split `blocks/`?** It currently mixes a UI overlay (`DragHandle.tsx`),
extensions (`Footnote.ts`, `Toc.ts`), and engine helpers (`blockOps.ts`).
After the split: extensions go to `extensions/`, the overlay goes to
`canvas/`, and the helpers stay alongside the block-related hooks
(which move in from `tiptap/hooks/`).

**Why a `headerFooter/` folder for three files?** The hook
(`useHeaderFooterSync`) reads from `editorContext.ts` synchronously per the
"category C" rule in `containers/editor/session/README.md`. Co-locating it
with the UI it serves makes that contract impossible to lose track of.

### Imports rule (after restructure)

Existing rule (`editor/` must not import `containers/editor/`) extends:
`editor/tiptap/extensions/` MUST NOT import `editor/tiptap/canvas/`,
`toolbar/`, or `headerFooter/`. Extensions are pure ProseMirror behavior;
they cannot depend on React UI. Verify with:

```sh
grep -rn "from '@/editor/tiptap/\(canvas\|toolbar\|headerFooter\)" \
  src/editor/tiptap/extensions/
# expected: zero results
```

---

## B. Renames

Files whose name fights what they actually contain. Each rename is a single
`git mv` plus an alias-import sweep.

| Current path | New path | Reason |
|---|---|---|
| `editor/tiptap/EditorView.tsx` | `editor/tiptap/index.tsx` | The canvas mount point. Imports become `from '@/editor/tiptap'`. |
| `editor/tiptap/Toolbar.tsx` | `editor/tiptap/toolbar/index.tsx` | Folder named `toolbar/`, containing zones, but the toolbar itself lives at the root. Reunify. |
| `editor/tiptap/ToolbarPrimitives.tsx` | `editor/tiptap/toolbar/Primitives.tsx` | Belongs with the toolbar; "Toolbar" prefix becomes redundant inside the folder. |
| `editor/comments/Comment.ts` | `editor/comments/CommentMark.ts` | File holds the Tiptap **mark extension**, not the data type. The data ADT is in `types.ts`. Today the import `import { Comment } from '@/editor/comments/Comment'` reads like an entity, not an extension. |
| `editor/comments/color.ts` | `editor/comments/authorColor.ts` | Single export is `authorColor`. `color.ts` reads as the more general thing it isn't. |
| `editor/comments/useThreads.ts` | `editor/comments/useCommentThreads.ts` | Hook is reused outside the comments folder (`tiptap/EditorView.tsx`, `containers/editor/comments/CommentAnchors.tsx`). At call sites the unprefixed `useThreads` is ambiguous. |
| `editor/suggestions/TrackChange.ts` | `editor/suggestions/trackChangeMarks.ts` | Exports two extensions (`Insertion`, `Deletion`); the file is a multi-export grouping, not a single class. Lowercase signals that. |
| `editor/suggestions/DiffBlockAttr.ts` | `editor/suggestions/blockDiffAttribute.ts` | Same reasoning — exports an extension that adds a block attribute, not a class named `DiffBlockAttr`. |
| `editor/tiptap/blocks/Toc.ts` | `editor/tiptap/extensions/TableOfContents.ts` | Filename matches the exported extension name; rename happens as part of the move. |

**NOT renamed** (deliberately, to keep churn down):
- `editor/comments/threadOps.ts`, `reactions.ts` — names describe the
  module's verbs (`addThread`, `replyTo`, `toggleReaction`); ambiguity is
  resolved by the `comments/` parent.
- `editor/versions/diffDoc.ts` and `editor/versions/buildDiffDocument.ts`
  (the latter merged in by `layout.md` Phase 5). They look like duplicates
  but are not: `diffDoc.ts` operates on Y.Doc snapshots, `buildDiffDocument.ts`
  produces a ProseMirror document for rendering. **Add a one-line file-top
  comment** to each clarifying the shape it returns; do not rename.
- `editor/types.ts` and per-feature `types.ts` files — consistent pattern,
  scoped by parent folder.

### Rename procedure

For each rename, run in this order:

1. `git mv <old> <new>` — preserves history.
2. Search-and-replace alias imports across the tree:
   ```sh
   find src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 |
     xargs -0 perl -pi -e "s|\@/editor/comments/Comment\b|\@/editor/comments/CommentMark|g"
   ```
   The `\b` word boundary is critical — without it, the pattern matches
   `@/editor/comments/CommentAnchors` etc. **Test the regex with `grep -E`
   before running `perl -pi`**.
3. For renames that change the **imported symbol** (none in this list — all
   renames change file paths only, leaving exported names untouched),
   you would also rewrite the symbol. Not applicable here.
4. `pnpm typecheck` after each rename. Don't batch — if step 2's regex
   over-matches, you want to know which rename caused it.

---

## C. Splits

Only files where (a) length is ≥200 LOC **or** (b) the file mixes two
demonstrably independent concerns. Long files that are cohesive (`find/plugin.ts`
at 159 LOC is a single ProseMirror plugin — it stays whole) are not split.

### C1. `containers/editor/comments/store/commentsStore.ts` (255 LOC)

**Already moved** here by `layout.md` Phase 4 — was
`containers/editor/stores/createCommentsStore.ts`.

**Concerns mixed in one file:**
- State shape + setters (lines 28–107: enums, interfaces, simple `set` calls).
- Composed Yjs ops wrapped in `doc.transact` (lines ~110–250:
  `submitInitialBody`, `submitReply`, `editSubmit`, `resolveThread`,
  `removeThread`, `flushPending`).

**Why split:** the simple-setter section is ~80 LOC of trivial state
plumbing; the composed-ops section is the interesting part where the
`doc.transact` invariant lives (per `containers/editor/session/README.md`
§5). Mixing them buries the invariant.

**Target:**
```
comments/store/
    commentsStore.ts          # ~150 LOC — state, simple setters, factory entry
    commentsActions.ts        # ~120 LOC — composed transactional ops
    commentsSelectors.ts      # unchanged
```

`commentsStore.ts` exposes `createCommentsStore(doc, currentUser)` which
returns a `StoreApi<CommentsState>`. Composed ops are still attached to the
same store (so call sites don't change), but their bodies are imported from
`commentsActions.ts`. Pattern:

```ts
// commentsActions.ts
export function makeCommentsActions(
    doc: Y.Doc,
    currentUser: User,
    set: StoreApi<CommentsState>['setState'],
    get: StoreApi<CommentsState>['getState'],
) {
    return {
        submitInitialBody: () => doc.transact(() => { ... }),
        submitReply: (threadId: string) => doc.transact(() => { ... }),
        // ...
    };
}

// commentsStore.ts
import { makeCommentsActions } from './commentsActions';

export const createCommentsStore = (doc: Y.Doc, currentUser: User) =>
    createStore<CommentsState>()((set, get) => ({
        ...defaults,
        // setters inline (trivial)
        setStatus: (status) => set(s => ({ filter: { ...s.filter, status } })),
        // ...
        // composed ops from the actions module
        ...makeCommentsActions(doc, currentUser, set, get),
    }));
```

The existing test (`commentsStore.test.ts`) does not import the internal
`makeCommentsActions` — it tests behavior through the store API. No test
changes required.

### C2. `containers/editor/index.tsx` / EditorHost (188 LOC)

**Already noted** in `layout.md` execution plan (Phase 3 renames the file;
the README hints at a split into `EditorHost` for lifecycle gating and
`EditorLayout` for slot-based grid).

**Concerns:**
- Lifecycle gating: collab provider state, suspense boundary, key remount.
- Provider stack: `<EditorSessionProvider>` → `<EditorLiveProvider>` →
  `<CommentsStoreProvider>` → `<SessionStoreProvider>`.
- Layout shell: CSS grid mounting LeftPane / canvas / RightPane / TopBar /
  StatusBar / FindReplaceBar overlay.

**Target:**
```
containers/editor/
    index.tsx              # ~70 LOC — lifecycle gating only
    Providers.tsx          # ~50 LOC — provider stack
    EditorLayout.tsx       # ~80 LOC — CSS grid shell
```

`index.tsx`:
```tsx
export function EditorHost({ bookId }: { bookId: string }) {
    const collab = useCollabSession(bookId);
    if (!collab) return <EditorSkeleton />;
    return (
        <Providers collab={collab} key={collab.id}>
            <EditorLayout />
        </Providers>
    );
}
```

`Providers.tsx`: wraps children in the four context providers.
`EditorLayout.tsx`: the JSX grid + slot composition, no provider concerns.

### C3. `containers/editor/comments/components/CommentsSidebar.tsx` (128 LOC)

**Concerns:**
- Header (filter chips + counts).
- Tabbed switch between "Open" and "Resolved" lists.
- Empty state.

**Target:** keep `CommentsSidebar.tsx` as the orchestrator (~70 LOC). Extract
`CommentsSidebarHeader.tsx` (filter strip, count chips) into the same folder.
The Open/Resolved tab bodies are already separate
(`OpenCommentList.tsx`, `ResolvedCommentList.tsx`) — no further work there.

### C4. `containers/editor/comments/components/MentionTextarea.tsx` (129 LOC)

**Concerns:**
- The `<textarea>` itself + draft state.
- The mention candidate popover (positioning, keyboard nav, item rendering).

**Target:**
```
comments/components/
    MentionTextarea.tsx          # ~60 LOC — textarea, draft, onChange wiring
    MentionPopover.tsx           # ~70 LOC — candidate list, keyboard nav, position
```

`MentionTextarea` consumes `useMentionDetection` (already a separate hook)
and renders `<MentionPopover>` when the hook reports an active trigger.

### C5. `containers/editor/comments/CommentAnchors.tsx` (124 LOC)

**Concerns:**
- Computing pin positions from ProseMirror geometry (DOM coordinates,
  `COMMENT_PIN_GAP_PX` collision pass).
- Rendering the pins as overlay React nodes.

**Target:** extract `useCommentPinPositions(editor, threads)` into
`comments/hooks/useCommentPinPositions.ts`. The component shrinks to ~60
LOC of JSX. The math becomes a pure function, testable in isolation. This
satisfies CLAUDE.md's "NEVER write raw math/coordinate comparisons inline"
rule, which the current file violates.

### C6. `containers/editor/glossary/index.tsx` (was GlossaryPanel.tsx, 163 LOC)

**Concerns:**
- Listing entries (read path).
- Add-entry form (write path).
- Edit-entry inline editor (write path).

**Target:**
```
glossary/
    index.tsx                       # orchestrator
    components/
        GlossaryEntryList.tsx       # listing
        GlossaryEntryForm.tsx       # add + edit (single component, mode prop)
```

Split rationale: read and write paths have independent invalidation cycles
(read subscribes to Y.Map; write owns local form state). Keeping them in
one file forces both pieces to re-render on either change.

### C7. `containers/editor/suggestions/index.tsx` (was SuggestionsSidebar.tsx, 151 LOC)

**Concerns:**
- List of pending suggestions.
- Per-suggestion item (preview, accept/reject buttons).

**Target:** extract `SuggestionItem.tsx` into
`suggestions/components/SuggestionItem.tsx`. The sidebar shrinks to ~60 LOC.

### C8. `containers/editor/versions/index.tsx` (was VersionsPanel.tsx, 134 LOC)

**Concerns:**
- Header (snapshot button, target-words input).
- Snapshot list.
- Per-snapshot row (name, time, diff/restore actions).

**Target:** the per-snapshot row is **already** `VersionSnapshot.tsx` (43
LOC, in `components/`). Extract `VersionsPanelHeader.tsx` (~40 LOC) into
the same folder. `index.tsx` shrinks to ~60 LOC of orchestration.

### C9. `editor/tiptap/toolbar/SpecialCharsMenu.tsx` (was formatting/SpecialCharsMenu.tsx, 137 LOC)

**Concerns:**
- The dropdown menu UI.
- A static table of special characters (likely an array literal that
  dominates the file).

**Target:**
```
toolbar/
    SpecialCharsMenu.tsx        # ~60 LOC — UI
    specialChars.ts             # ~80 LOC — static data table
```

Pure data extraction. Same approach as
`editor/tiptap/slash/slashCommandList.ts` already uses for slash commands.

### C10. `editor/tiptap/find/FindReplaceBar.tsx` (137 LOC)

**Concerns:**
- Find input + result count.
- Replace input + replace/replace-all buttons.
- Match navigation (prev/next).

**Inspect first.** If the three concerns each occupy ~40 LOC of independent
JSX, split into `FindRow.tsx`, `ReplaceRow.tsx`, `MatchNav.tsx` co-located
in `find/`. If the concerns are tightly interleaved by shared local state,
**do not split** — leave a comment at the top documenting the structure
and move on. The cost of forced splitting is worse than 137 LOC.

### C11. NOT splitting

Document why these aren't split, so a future reviewer doesn't reopen the
question:

| File | LOC | Why kept whole |
|---|---|---|
| `editor/tiptap/find/plugin.ts` | 159 | Single ProseMirror plugin — its state machine is one concern. |
| `editor/tiptap/extensions.ts` | 129 | The bundler is a flat list of extension constructors; chunking it loses the at-a-glance view of what's loaded. |
| `editor/tiptap/Primitives.tsx` (was ToolbarPrimitives) | 146 | A coherent set of small button/group primitives. Splitting per-primitive creates 5 ~30 LOC files for no benefit. |
| `editor/versions/diffDoc.ts` | 127 | Pure logic, single concern (build a diff Y.Doc from snapshots). |
| `containers/editor/__tests__/helpers/commentHarness.tsx` | 129 | Test harness factory — splitting fragments the setup story. |
| `editor/tiptap/index.tsx` (was EditorView.tsx) | 140 | After the rename it orchestrates ~10 hooks; each hook is already extracted. The 140 LOC is mostly hook wiring. Reducing further means re-collapsing extracted pieces. |
| `containers/editor/layout/LeftPane.tsx` | 135 | Already a thin switch over feature panels after `layout.md`. Re-evaluate **after** that ships; do not split preemptively. |
| `containers/editor/layout/BookTitleMenu.tsx` | 119 | Title + dropdown of actions; cohesive surface. |
| `editor/tiptap/toolbar/FileMenu.tsx` (was FileMenu.tsx) | 120 | One menu per import/export action; splitting yields trivial wrappers. |

---

## Execution plan

Phases are separate commits. Each phase ends with `pnpm typecheck && pnpm test`
green. Do **not** start a phase before the previous one is committed and CI
green.

### Phase E1 — Tiptap engine restructure (Section A)

Order matters because some moves cross-reference each other.

1. Create new folders: `canvas/`, `headerFooter/`, `extensions/`. Keep
   `toolbar/`, `blocks/` (they exist).
2. Move overlays into `canvas/`:
   - `BlockMenu.tsx`, `BubbleToolbar.tsx`, and `blocks/DragHandle.tsx`.
3. Move toolbar pieces into `toolbar/`:
   - `Toolbar.tsx` → `toolbar/index.tsx` (this is the rename in §B too —
     do it here, in this commit, with the move).
   - `StyleDropdown.tsx`, `FileMenu.tsx`.
   - `ToolbarPrimitives.tsx` → `toolbar/Primitives.tsx` (rename + move).
   - `formatting/SpecialCharsMenu.tsx` → `toolbar/SpecialCharsMenu.tsx`.
4. Move header/footer pieces:
   - `HeaderFooterBar.tsx` → `headerFooter/HeaderFooterBar.tsx`.
   - `hooks/useHeaderFooterSync.ts` → `headerFooter/useHeaderFooterSync.ts`.
   - `header-footer-bar.css` → `headerFooter/headerFooter.css`.
5. Move extensions (no UI):
   - `blocks/Footnote.ts` → `extensions/Footnote.ts`.
   - `blocks/Toc.ts` → `extensions/TableOfContents.ts` (rename + move).
   - `formatting/Highlight.ts` → `extensions/Highlight.ts`.
   - `formatting/SmartPaste.ts` → `extensions/SmartPaste.ts`.
   - `formatting/SmartTypography.ts` → `extensions/SmartTypography.ts`.
   - `formatting/formatting.css` → `extensions/formatting.css`.
6. Move block-related hooks into `blocks/`:
   - `hooks/useBlockHover.ts`, `useBlockMenu.ts`, `useBlockDragDrop.ts`,
     `useBlockDragDrop.test.ts` → `blocks/`.
7. Carve `editor.css`: split overlay-specific selectors out into
   `canvas/canvas.css`. Identify them by grepping for the class names
   actually used by `BlockMenu.tsx`, `BubbleToolbar.tsx`, `DragHandle.tsx`
   and moving only those rules. Keep the rest in `editor.css`.
8. Rename `EditorView.tsx` → `index.tsx`.
9. Move page-layout constants: `editor/constants.ts` exports
   `A4_PAGE_WIDTH_PX`, `A4_PAGE_HEIGHT_PX`, `A4_MARGIN_PX`,
   `PAGE_GAP_BORDER_COLOR`, `PAGE_BREAK_BACKGROUND` consumed by
   `extensions.ts`. Move just those into a new
   `editor/tiptap/constants.ts`. **Do not move `COMMENT_PIN_GAP_PX`** —
   that's consumed by `containers/editor/comments/CommentAnchors.tsx`,
   which lives outside tiptap; keep it in `editor/constants.ts`. Update
   the two import sites.
10. Delete empty folders: `editor/tiptap/components/`, `formatting/`.
11. Rewrite imports across the tree:
    ```sh
    find src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 |
      xargs -0 perl -pi -e "
        s|\@/editor/tiptap/EditorView\b|\@/editor/tiptap|g;
        s|\@/editor/tiptap/Toolbar\b|\@/editor/tiptap/toolbar|g;
        s|\@/editor/tiptap/ToolbarPrimitives\b|\@/editor/tiptap/toolbar/Primitives|g;
        s|\@/editor/tiptap/BlockMenu\b|\@/editor/tiptap/canvas/BlockMenu|g;
        s|\@/editor/tiptap/BubbleToolbar\b|\@/editor/tiptap/canvas/BubbleToolbar|g;
        s|\@/editor/tiptap/blocks/DragHandle\b|\@/editor/tiptap/canvas/DragHandle|g;
        s|\@/editor/tiptap/HeaderFooterBar\b|\@/editor/tiptap/headerFooter/HeaderFooterBar|g;
        s|\@/editor/tiptap/StyleDropdown\b|\@/editor/tiptap/toolbar/StyleDropdown|g;
        s|\@/editor/tiptap/FileMenu\b|\@/editor/tiptap/toolbar/FileMenu|g;
        s|\@/editor/tiptap/formatting/SpecialCharsMenu\b|\@/editor/tiptap/toolbar/SpecialCharsMenu|g;
        s|\@/editor/tiptap/formatting/Highlight\b|\@/editor/tiptap/extensions/Highlight|g;
        s|\@/editor/tiptap/formatting/SmartPaste\b|\@/editor/tiptap/extensions/SmartPaste|g;
        s|\@/editor/tiptap/formatting/SmartTypography\b|\@/editor/tiptap/extensions/SmartTypography|g;
        s|\@/editor/tiptap/blocks/Footnote\b|\@/editor/tiptap/extensions/Footnote|g;
        s|\@/editor/tiptap/blocks/Toc\b|\@/editor/tiptap/extensions/TableOfContents|g;
        s|\@/editor/tiptap/hooks/useHeaderFooterSync\b|\@/editor/tiptap/headerFooter/useHeaderFooterSync|g;
        s|\@/editor/tiptap/hooks/useBlockHover\b|\@/editor/tiptap/blocks/useBlockHover|g;
        s|\@/editor/tiptap/hooks/useBlockMenu\b|\@/editor/tiptap/blocks/useBlockMenu|g;
        s|\@/editor/tiptap/hooks/useBlockDragDrop\b|\@/editor/tiptap/blocks/useBlockDragDrop|g;
      "
    ```
    Run this **after** the `git mv`s, then `pnpm typecheck`.
12. Inside relocated files, switch `@/editor/tiptap/...` self-imports to
    relative form where they now reference siblings (the toolbar zones
    already live next to the new toolbar root, etc.).
13. Verify the import-direction rule:
    ```sh
    grep -rn "from '@/editor/tiptap/\(canvas\|toolbar\|headerFooter\)" \
      src/editor/tiptap/extensions/
    ```
    Expected: no output.

**Commit message:** `refactor(frontend): tiptap engine — semantic sub-folders`.

### Phase E2 — Renames (Section B)

One commit per rename **except** the four already absorbed into Phase E1
(`EditorView.tsx`, `Toolbar.tsx`, `ToolbarPrimitives.tsx`,
`blocks/Toc.ts`).

Remaining renames, do them in this order — each is one commit:

1. `editor/comments/Comment.ts` → `editor/comments/CommentMark.ts`.
   Imports affected: `editor/tiptap/extensions.ts` (line 19).
2. `editor/comments/color.ts` → `editor/comments/authorColor.ts`.
   Imports affected: `containers/editor/comments/CommentAnchors.tsx`,
   `comments/components/ResolvedThreadCard.tsx`, `comments/components/thread/ThreadHeader.tsx`.
3. `editor/comments/useThreads.ts` → `editor/comments/useCommentThreads.ts`,
   **and** rename the exported hook `useThreads` → `useCommentThreads` at the
   same time. Hook callers update via the same sweep:
   ```sh
   find src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 |
     xargs -0 perl -pi -e "
       s|\@/editor/comments/useThreads\b|\@/editor/comments/useCommentThreads|g;
       s|\buseThreads\b|useCommentThreads|g;
     "
   ```
   The second pattern is broad; review the diff before committing. There
   are no other `useThreads` symbols in the tree (verified by grep before
   running).
4. `editor/suggestions/TrackChange.ts` → `editor/suggestions/trackChangeMarks.ts`.
   Exports (`Insertion`, `Deletion`) keep their names.
5. `editor/suggestions/DiffBlockAttr.ts` → `editor/suggestions/blockDiffAttribute.ts`.
   Export keeps its name.

After each rename: `pnpm typecheck && pnpm test`.

### Phase E3 — Splits (Section C)

One commit per split, in this order. Ordering puts the smallest first so any
pattern issues surface cheaply.

1. C5 — Extract `useCommentPinPositions`. Adds a hook file, slims a component.
2. C4 — `MentionPopover` extraction.
3. C3 — `CommentsSidebarHeader` extraction.
4. C7 — `SuggestionItem` extraction.
5. C6 — Glossary list/form extraction.
6. C8 — `VersionsPanelHeader` extraction.
7. C9 — `specialChars.ts` data extraction.
8. C10 — Inspect `FindReplaceBar`; split or annotate.
9. C2 — `EditorHost` / `Providers` / `EditorLayout` split.
10. C1 — Comments store / actions split. **Do this last** because it touches
    the most-tested file in the editor; wanting other refactors green first
    de-risks a regression there.

Each split commit must:
- Not change any exported symbol's name or signature.
- Not change any test file (other than the new file's location if it
  moved). Tests verify behavior, not file layout — they should stay green
  without modification.
- Update only the import paths required by the move.

---

## Acceptance checklist

After all three sections are merged:

- [ ] `editor/tiptap/` root contains exactly: `index.tsx`, `extensions.ts`,
      `editorContext.ts`, `types.ts`, `constants.ts`, `editor.css`,
      `fonts.css`, plus the seven sub-folders (`canvas/`, `toolbar/`,
      `headerFooter/`, `blocks/`, `extensions/`, `find/`, `slash/`,
      `contextItems/`, `hooks/`).
- [ ] `editor/tiptap/components/` and `editor/tiptap/formatting/` no longer
      exist.
- [ ] `grep -rn "from '@/editor/tiptap/\(canvas\|toolbar\|headerFooter\)" src/editor/tiptap/extensions/`
      returns nothing.
- [ ] All renames in §B applied; `grep -rn "@/editor/comments/Comment'\|@/editor/comments/Comment\"\|@/editor/comments/color'\|@/editor/comments/color\"\|@/editor/comments/useThreads'\|@/editor/comments/useThreads\""`
      returns nothing.
- [ ] No file in `containers/editor/` exceeds 200 LOC except by deliberate
      decision documented in §C11 of this doc.
- [ ] No file in `editor/tiptap/` exceeds 200 LOC except entries listed in
      §C11.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build` all green.
- [ ] Manual smoke (same suite as `layout.md` Phase 7) passes.
- [ ] `containers/editor/README.md` "Architecture" listing updated to
      reflect the new tiptap folder structure.

---

## Cross-cutting risks

- **`docs/refactor-frontend.md`** references specific paths (Smell 13 §1,
  Appendix A). After the split, update path references in that doc, or it
  will rot. (Search for `@/editor/tiptap/` and `@/containers/editor/stores/`
  in docs.)
- **i18n key mention**: `containers/editor/comments/components/MentionTextarea.tsx`
  uses translation keys like `editor.comments.mentions.*`. Splitting it
  into `MentionPopover.tsx` does not change keys; verify the t() namespaces
  remain consistent (both files use `useTranslation('editor')`).
- **Pre-commit hooks**: the project may have an ESLint rule banning
  relative cross-directory imports per CLAUDE.md ("ALWAYS use the `@/`
  alias"). The intra-feature relative imports introduced by `layout.md`
  are deliberate (private feature internals). If the lint rule fires on
  them, scope the rule with an override for files matching
  `src/containers/editor/<feature>/**` rather than reverting to absolute
  paths.

---

## Out-of-scope follow-ups (do NOT do in this PR)

- Refactoring the per-extension implementations
  (`Footnote.ts`, `TableOfContents.ts`, `Highlight.ts`, etc.).
- Changing the public API of any zustand store.
- Adding new tests for any of the split components — splitting must be
  behavior-preserving and the existing tests cover the surface.
- Touching `editor/io/`, `editor/identity/`, `editor/shell/`, `editor/collab/`.
  Those folders are already cohesive; revisit only if a concrete need
  arises.
