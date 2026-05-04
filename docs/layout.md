---
title: Frontend layout reorganization
status: ready-to-execute
owner: handoff
---

# Frontend layout reorganization

## Why

`src/containers/editor/` and `src/editor/` have grown by accretion. A single
"feature" (comments, versions, glossary, …) is split across **at least three
different places** with no clear seam:

- `containers/editor/components/<feature>/` — flat dump of UI files
  (15 entries for comments, 7 for versions)
- `containers/editor/hooks/` — feature-specific hooks mixed with editor-wide
  hooks (18 files, no grouping)
- `containers/editor/stores/` — comments store sits next to session/pane/live
  stores
- `editor/<feature>/` — domain logic + CSS, but also includes empty stubs
  (`outline/outline.css` only) and orphaned single-file folders
  (`yjs/types.ts`, `app/readingStats.ts`, `ai/aiOps.ts`)
- Provider files dangle at the top of `containers/editor/`
  (`CommentsStoreProvider.tsx`, `EditorLiveProvider.tsx`, …)

Reading any single feature requires hopping across 4–6 directories. Adding a
new comment field touches files in 3 sibling trees. The structure does not
guide newcomers.

## Goal

Each editor feature becomes a **self-contained module** under
`containers/editor/<feature>/` with the canonical shape:

```
<feature>/
    index.tsx           # the mount point (panel / sidebar / modal)
    components/         # internal pieces — not imported outside the feature
    hooks/              # feature-local hooks
    store/              # feature-local zustand store + provider (if any)
    __tests__/          # unit tests + harnesses
    <feature>.css       # styles that belong to the UI surface
```

`src/editor/<feature>/` continues to hold pure domain logic (no React).
`src/editor/tiptap/` continues to be the Tiptap engine. The 3-tier rule from
`containers/editor/README.md` is preserved verbatim.

The top-level `src/` shape (`containers/`, `components/`, `editor/`, `hooks/`,
`lib/`, …) does **not change**. Cross-cutting components stay in
`src/components/`. This plan only restructures what's inside `containers/editor/`
and tidies `src/editor/`.

## Non-goals

- Renaming components or refactoring their bodies. Pure file moves +
  import-path updates.
- Changing the public API of any store, hook, or component.
- Touching `src/editor/tiptap/`. The engine layer is already cohesive.
- Touching `src/components/`, `src/lib/`, `src/hooks/`, `src/utils/`,
  `src/api/`, `src/routes/`, `src/i18n/`, `src/app/`.

## Target layout

### `src/containers/editor/`

```
containers/editor/
    index.tsx                       # was EditorHost.tsx (renamed)
    EditorLayout.tsx                # currently inlined in EditorHost; split if not already
    README.md                       # update §Architecture paragraph

    layout/                         # editor chrome — frames everything
        TopBar.tsx
        LeftPane.tsx
        RightPane.tsx
        StatusBar.tsx
        BookTitleMenu.tsx
        UserMenu.tsx
        PageJumper.tsx
        EditorSkeleton.tsx
        EmptyState.tsx
        editor-skeleton.css

    session/                        # editor-wide state (was: stores/ + top-level providers)
        sessionStore.ts             # was createSessionStore.ts
        sessionStore.test.ts
        liveStore.ts                # was createLiveStore.ts
        liveStore.test.tsx          # was __tests__/liveStore.test.tsx
        paneStore.ts
        paneStore.test.ts
        SessionProvider.tsx         # was EditorSessionProvider.tsx
        LiveProvider.tsx            # was EditorLiveProvider.tsx
        README.md                   # was stores/README.md (boundary rules — keep verbatim)

    hooks/                          # editor-wide hooks only
        useCollabSession.ts
        useDocumentExport.ts
        useDocumentImport.ts
        useDocumentKeyDown.ts
        useFontsReady.ts
        useInitialSync.ts
        useNarrowLayout.ts
        useReadingStats.ts
        useTargetWords.ts

    __tests__/
        editorRegression.test.tsx

    comments/
        index.tsx                   # was components/comments/CommentsSidebar.tsx
        CommentAnchors.tsx          # was components/comments/CommentAnchors.tsx
                                    #   — exported separately (mounted in EditorHost overlay)
        components/
            CommentFilters.tsx
            CommentReply.tsx
            CommentThreadCard.tsx
            CommentThreadForm.tsx
            MentionTextarea.tsx
            OpenCommentList.tsx
            Reactions.tsx
            ResolvedCommentList.tsx
            ResolvedThreadCard.tsx
            CommentsViewContext.tsx
            thread/
                ThreadComposeForm.tsx
                ThreadEditor.tsx
                ThreadHeader.tsx
                ThreadReplies.tsx
                ThreadReplyCompose.tsx
        hooks/
            useThread.ts
            useIsActiveComment.ts
            useMentionDetection.ts  # was containers/editor/hooks/useMentionDetection.ts
        store/
            commentsStore.ts        # was stores/createCommentsStore.ts
            commentsSelectors.ts    # was stores/commentsSelectors.ts
            CommentsStoreProvider.tsx  # was containers/editor/CommentsStoreProvider.tsx
        comments.css                # was editor/comments/comments.css
        __tests__/
            commentsStore.test.ts   # was stores/commentsStore.test.ts
            commentHarness.tsx      # was __tests__/helpers/commentHarness.tsx

    versions/
        index.tsx                   # was components/versions/VersionsPanel.tsx
        components/
            VersionsList.tsx
            VersionSnapshot.tsx
            VersionDiffModal.tsx
            DiffRichView.tsx
            MarkdownDiffView.tsx
        hooks/
            useVersions.ts
            useAutoSnapshot.ts
        versions.css                # was editor/versions/versions.css

    glossary/
        index.tsx                   # was components/glossary/GlossaryPanel.tsx
        hooks/
            useGlossary.ts          # was components/glossary/useGlossary.ts
        glossary.css                # was editor/glossary/glossary.css

    meta/
        index.tsx                   # was components/meta/MetaPanel.tsx
        meta.css                    # was editor/meta/meta.css

    outline/
        index.tsx                   # was components/outline/OutlineSidebar.tsx
        hooks/
            useEditorHeadings.ts
            usePageNavigation.ts
        outline.css                 # was editor/outline/outline.css

    suggestions/
        index.tsx                   # was components/suggestions/SuggestionsSidebar.tsx
        hooks/
            useSuggestingMode.ts

    workflow/
        ShortcutsModal.tsx          # was components/workflow/ShortcutsModal.tsx
        # no index.tsx — workflow has no single mount point in this container;
        # keep ShortcutsModal as the named export. README will note this.
        workflow.css                # was editor/workflow/workflow.css

    peers/
        index.tsx                   # was components/peers/PeerAvatarStack.tsx
        hooks/
            usePeers.ts

    status/
        index.tsx                   # was components/status/SyncMini.tsx
        hooks/
            useConnectionStatus.ts
```

**Naming rules for `index.tsx`:** the default export's component name stays
the original (e.g. `CommentsSidebar`, `VersionsPanel`), only the file is named
`index.tsx`. This keeps the React DevTools tree readable and makes find-by-name
still work. Imports become:

```ts
import { CommentsSidebar } from '@/containers/editor/comments';
import { VersionsPanel }   from '@/containers/editor/versions';
```

### `src/editor/`

The domain layer keeps its current shape but loses orphaned folders. CSS that
only styles container UI moves out (see "moved to container" notes above).

```
editor/
    collab/
        yDoc.ts
        syncStatus.ts
        syncStatus.test.ts
        peerCursor.ts
        types.ts                    # was editor/yjs/types.ts

    comments/
        Comment.ts
        threadOps.ts
        reactions.ts
        reactions.test.ts
        color.ts
        format.ts                   # previewBody helper — pure domain
        mentionCandidates.ts        # was containers/editor/components/comments/mentionCandidates.ts
                                    #   (pure logic, no React — belongs in domain layer)
        types.ts
        useThreads.ts               # Yjs→React bridge — domain-side
        # comments.css moved to containers/editor/comments/

    versions/
        diffDoc.ts
        readOnlyExtensions.ts
        types.ts
        buildDiffDocument.ts        # was editor/diff/buildDiffDocument.ts
        buildDiffDocument.test.ts   # was editor/diff/buildDiffDocument.test.ts
        # versions.css moved

    glossary/
        format.ts
        GlossaryHighlight.ts        # Tiptap mark — stays domain
        # glossary.css moved

    suggestions/
        SuggestionMode.ts
        suggestionOps.ts
        suggestionMarkUtils.ts
        suggestionKeyHandlers.ts
        DiffBlockAttr.ts
        TrackChange.ts
        # suggestions.css moved

    workflow/
        templates.ts
        # workflow.css moved

    ai/
        aiOps.ts

    io/
        markdown.ts
        typography.ts
        typography-css.ts
        typography.test.ts
        io.css                      # injected typography styles — keep
        docx/
        typography/

    identity/
        perms.ts
        storage.ts
        types.ts
        identity.css

    shell/
        Avatar.tsx
        ContextMenu.tsx
        useToast.ts
        shell.css

    tiptap/                         # ENGINE — untouched

    styles/
        layout.css
        tokens.css

    constants.ts
    types.ts
    utils.ts
    styles.css
```

**Removed:**
- `editor/yjs/` (single file → `editor/collab/types.ts`)
- `editor/diff/` (specifically owned by versions → `editor/versions/`)
- `editor/app/` — `readingStats.ts` is React-free domain math; move to
  `editor/io/readingStats.ts` (it's currently imported only by
  `containers/editor/hooks/useReadingStats.ts` and `StatusBar.tsx`).
  `editor/app/topbar.css` is empty/unused — verify with `grep -r topbar.css`,
  delete if no references.
- `editor/meta/` — currently only `meta.css` (no `metaOps.ts` despite README
  claim). After CSS moves to container, the folder is empty → delete.
- `editor/outline/` — only `outline.css`. Same as above → delete.

**Kept asymmetric on purpose:** `outline/`, `meta/`, `peers/`, `status/`,
`workflow/` exist in `containers/editor/` but not in `editor/` — those features
are pure UI, they have no domain logic. That's fine; the symmetry rule is "if
domain logic exists, it lives under `editor/<feature>/`". Empty domain folders
are noise.

## Execution plan

Run in order. Each phase is a separate commit. Each phase ends with `tsc` clean
and `vitest run` green before moving on.

**Working directory.** All shell snippets in this document assume the cwd is
`frontend/` (so `src/...` resolves correctly). If you're at the repo root,
either `cd frontend` first, or prefix every `src/` path with `frontend/`.

### Phase 0 — Prep

1. Confirm clean working tree (or stash). The committed baseline must be
   green: `pnpm typecheck && pnpm test`.
2. Audit for unexpected callers:
   ```sh
   grep -rn "from '@/containers/editor/" src/ | sort -u > /tmp/before-imports.txt
   grep -rn "from '@/editor/" src/ | sort -u >> /tmp/before-imports.txt
   ```
   This file becomes the truth-table the import rewrites must reproduce.

### Phase 1 — Extract `containers/editor/layout/`

Pure mechanical move. No content changes.

1. `git mv containers/editor/components/{TopBar,LeftPane,RightPane,StatusBar,BookTitleMenu,UserMenu,PageJumper,EditorSkeleton,EmptyState}.tsx containers/editor/layout/`
2. `git mv containers/editor/components/editor-skeleton.css containers/editor/layout/`
3. Update import paths in callers — they currently import from
   `@/containers/editor/components/<X>` → become `@/containers/editor/layout/<X>`.
   Use a single sed pass per filename.
4. Delete `containers/editor/components/.gitkeep` (folder will be empty after
   later phases) — but keep the folder for now if other phases run later.
5. Verify: `pnpm typecheck`, `pnpm test`.

### Phase 2 — Consolidate session state into `session/`

> **Atomicity warning.** Steps 2 and 4 below produce a transient broken-imports
> state (files moved, callers not yet rewritten). Treat steps 1–4 as a single
> atomic commit. Do **not** stop or push between them. If you have to pause,
> revert with `git checkout .` and restart the phase from step 1 — never leave
> the working tree halfway through.

1. `mkdir -p containers/editor/session`
2. Moves:
   - `stores/createSessionStore.ts` → `session/sessionStore.ts`
   - `stores/sessionStore.test.ts` → `session/sessionStore.test.ts`
   - `stores/createLiveStore.ts` → `session/liveStore.ts`
   - `__tests__/liveStore.test.tsx` → `session/liveStore.test.tsx`
   - `stores/paneStore.ts` → `session/paneStore.ts`
   - `stores/paneStore.test.ts` → `session/paneStore.test.ts`
   - `EditorSessionProvider.tsx` → `session/SessionProvider.tsx`
   - `EditorLiveProvider.tsx` → `session/LiveProvider.tsx`
   - `stores/README.md` → `session/README.md` (and update §7 paths inside)
3. Update **internal exports**: `EditorSessionProvider` and
   `EditorLiveProvider` are renamed at the file level only; keep the React
   component name unchanged so no callers break aside from the import path.
4. Rewrite imports across the codebase. Likely affected:
   `containers/editor/index.tsx` (formerly EditorHost.tsx), routes that mount
   the editor.
5. Delete `containers/editor/stores/` once empty.
6. Verify.

**Note:** `createCommentsStore.ts` and `commentsSelectors.ts` and
`commentsStore.test.ts` stay in `stores/` for now — they move with comments
in Phase 4. Don't co-locate them yet.

### Phase 3 — Rename `EditorHost.tsx` → `index.tsx`

1. `git mv containers/editor/EditorHost.tsx containers/editor/index.tsx`
2. Keep the exported component name `EditorHost`. Callers
   (`routes/_app/...`) switch from `@/containers/editor/EditorHost` to
   `@/containers/editor`.
3. Verify.

### Phase 4 — Per-feature consolidation (one commit per feature)

For each feature in this order — **do them sequentially, not in parallel**, so
each commit is small and reviewable:

1. **comments** (largest, do first to validate the pattern)
2. versions
3. outline
4. glossary
5. meta
6. suggestions
7. peers
8. status
9. workflow

For each `<feature>`:

1. `mkdir -p containers/editor/<feature>/components`
   (and `hooks/`, `store/`, `__tests__/` as needed for that feature — see
   target layout above for which subfolders to create).
2. Move the panel/main file from
   `containers/editor/components/<feature>/<MainComponent>.tsx` to
   `containers/editor/<feature>/index.tsx`. Keep its exported component name.
   **Exception — `workflow`:** there is no panel mount point. Move
   `components/workflow/ShortcutsModal.tsx` to
   `containers/editor/workflow/ShortcutsModal.tsx` and skip the
   `index.tsx` rename. The feature folder has no `index.tsx`.
   **Exception — `comments`:** also leave `CommentAnchors.tsx` at the
   feature root (`containers/editor/comments/CommentAnchors.tsx`),
   not under `components/`. It's a separately-mounted overlay (see caveat
   below); `components/` is reserved for pieces only the sidebar uses.
3. Move all sibling files from `containers/editor/components/<feature>/` into
   `containers/editor/<feature>/components/` (or `hooks/` if it's a hook file
   like `useThread.ts`, `useIsActiveComment.ts`). For comments, exclude
   `CommentAnchors.tsx` from this step — it goes to the feature root per
   step 2.
4. For comments specifically, also move:
   - `containers/editor/CommentsStoreProvider.tsx` → `comments/store/`
   - `containers/editor/stores/createCommentsStore.ts` → `comments/store/commentsStore.ts`
   - `containers/editor/stores/commentsSelectors.ts` → `comments/store/commentsSelectors.ts`
   - `containers/editor/stores/commentsStore.test.ts` → `comments/__tests__/commentsStore.test.ts`
   - `containers/editor/__tests__/helpers/commentHarness.tsx` → `comments/__tests__/commentHarness.tsx`
   - `containers/editor/hooks/useMentionDetection.ts` → `comments/hooks/useMentionDetection.ts`
   - `containers/editor/components/comments/mentionCandidates.ts` →
     `editor/comments/mentionCandidates.ts` (NOTE: this crosses into the
     domain layer — the file is pure logic, no React, so it belongs in
     `editor/`. Update the one importer
     `containers/editor/comments/index.tsx` (formerly `CommentsSidebar.tsx`).
5. For versions: also move
   `containers/editor/hooks/{useVersions,useAutoSnapshot}.ts` → `versions/hooks/`.
6. For outline: also move
   `containers/editor/hooks/{useEditorHeadings,usePageNavigation}.ts` → `outline/hooks/`.
   For glossary: also move
   `containers/editor/components/glossary/useGlossary.ts` → `glossary/hooks/useGlossary.ts`.
7. For suggestions: also move
   `containers/editor/hooks/useSuggestingMode.ts` → `suggestions/hooks/`.
8. For peers: also move
   `containers/editor/hooks/usePeers.ts` → `peers/hooks/`.
9. For status: also move
   `containers/editor/hooks/useConnectionStatus.ts` → `status/hooks/`.
10. Move CSS: `editor/<feature>/<feature>.css` → `containers/editor/<feature>/<feature>.css`.
    Update its `@import` line (if any importer exists in `editor/styles.css` —
    check `grep -rn "<feature>.css" src/`).
11. Rewrite import paths. Most callers are inside the feature itself — those
    can use **relative** imports (`./components/Foo`, `../store/commentsStore`)
    because they're now co-located. External callers
    (`containers/editor/index.tsx`, layout components) update to
    `@/containers/editor/<feature>` and `@/containers/editor/<feature>/...`.
12. Delete the now-empty `containers/editor/components/<feature>/` folder.
13. Run `pnpm typecheck && pnpm test` before committing.

**Caveat for comments:** `CommentAnchors.tsx` is mounted by
`editor/tiptap/EditorView.tsx` (over the editor canvas as overlay pins),
not by `CommentsSidebar`. Per step 2 above, keep `CommentAnchors.tsx` at
the feature root (`containers/editor/comments/CommentAnchors.tsx`) so it
has its own visible top-level entry point. Importers update from
`@/containers/editor/components/comments/CommentAnchors` to
`@/containers/editor/comments/CommentAnchors`. Affected importer:
`editor/tiptap/EditorView.tsx` (and post-rename — see layout-extended.md
— `editor/tiptap/index.tsx`). `components/` stays reserved for
"internal pieces only the sidebar uses".

### Phase 5 — Tidy `src/editor/`

1. `git mv editor/yjs/types.ts editor/collab/types.ts`
   - Audit: `grep -rn "from '@/editor/yjs" src/` and rewrite.
   - `rmdir editor/yjs`
2. `git mv editor/diff/buildDiffDocument.ts editor/versions/`
   `git mv editor/diff/buildDiffDocument.test.ts editor/versions/`
   - Rewrite imports. Likely only `editor/versions/diffDoc.ts` and tests.
   - `rmdir editor/diff`
3. `git mv editor/app/readingStats.ts editor/io/readingStats.ts`
   - Rewrite imports.
   - Verify `editor/app/topbar.css` is unreferenced; delete if so.
   - `rmdir editor/app` if empty.
4. Delete now-empty domain folders:
   - `editor/meta/` (only had `meta.css`, moved in Phase 4)
   - `editor/outline/` (only had `outline.css`)
5. Update top-level `editor/styles.css` if it `@import`s any of the moved
   CSS files.
6. Verify.

### Phase 6 — README + import-rule docs

1. Update `containers/editor/README.md`:
   - Replace the `components/comments/`, `components/glossary/`, … listing
     with the new feature-module layout.
   - Add a "Feature module shape" section that documents the
     `index.tsx + components/ + hooks/ + store/ + __tests__/` contract.
   - Reaffirm the `editor/ → containers/editor/` import rule (still one-way).
   - Add an additional rule: **a feature module's `components/` folder is
     private to that feature**. External callers import the feature's
     `index.tsx` only. Cross-feature reuse means promoting the component to
     `src/components/` or to a feature-neutral location under the editor.
2. Update `containers/editor/session/README.md` (was `stores/README.md`)
   §7 paths to reflect new locations.
3. Update top-level `frontend/README.md` only if it mentions any of the moved
   paths (likely does not).

### Phase 7 — Final verification

1. `pnpm typecheck`
2. `pnpm test`
3. `pnpm lint --fix` (catches any stale relative paths)
4. `pnpm build` (Vite — catches any CSS path that didn't survive the move)
5. Manual smoke in browser:
   - Open a book → editor mounts, Yjs syncs.
   - Add a comment, reply, react, resolve, reopen.
   - Open versions panel, take snapshot, diff against current.
   - Toggle suggesting mode, accept/reject a suggestion.
   - Open outline sidebar, click a heading.
   - Open glossary panel, edit an entry.
   - Resize to narrow layout (panes collapse to rail).
6. Diff `grep -rn "from '@/containers/editor\|@/editor"` against
   `/tmp/before-imports.txt` — sanity check that no import was left
   pointing at a deleted path.

## Mechanical concerns

### Path alias rewrites

Use `find` + `sd` (or `perl -pi`) — **do not** use editor "rename folder"
features that try to be smart, they tend to miss `.test.ts` files and JSDoc
links. One example pass:

```sh
# Phase 4 / comments
find src -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 |
  xargs -0 perl -pi -e "
    s|\@/containers/editor/components/comments/CommentsSidebar|\@/containers/editor/comments|g;
    s|\@/containers/editor/components/comments/|\@/containers/editor/comments/components/|g;
    s|\@/containers/editor/CommentsStoreProvider|\@/containers/editor/comments/store/CommentsStoreProvider|g;
    s|\@/containers/editor/stores/createCommentsStore|\@/containers/editor/comments/store/commentsStore|g;
    s|\@/containers/editor/stores/commentsSelectors|\@/containers/editor/comments/store/commentsSelectors|g;
    s|\@/containers/editor/hooks/useMentionDetection|\@/containers/editor/comments/hooks/useMentionDetection|g;
  "
```

After each pass, **inside the moved folder**, switch absolute `@/` imports
that now refer to siblings into relative imports (`./`, `../`) — this is what
makes the feature module portable and signals "this is private". Do this with
a follow-up pass scoped to the feature folder:

```sh
find src/containers/editor/comments -type f \( -name '*.ts' -o -name '*.tsx' \) -print0 |
  xargs -0 perl -pi -e "
    # imports of comments/components/X from inside comments/
    s|\@/containers/editor/comments/components/|./components/|g;
    s|\@/containers/editor/comments/hooks/|./hooks/|g;
    s|\@/containers/editor/comments/store/|./store/|g;
    s|\@/containers/editor/comments/__tests__/|./__tests__/|g;
  "
```

(Then by-eye fix any `./components/Foo` referenced from `./components/Bar.tsx`
— it should be `./Bar` not `./components/Bar`. ESLint + tsc catch these.)

### CSS imports

CSS files are imported via JS `import './foo.css'`. Each CSS move requires
updating exactly one importer (whichever component used to live next to it).
After the move the importer is the new `index.tsx` in the feature folder.
Grep-check before deleting the old folder:
```sh
grep -rn "<feature>.css" src/
```

### Tests

`vitest` resolves the same `@/` alias. `__tests__/helpers/commentHarness.tsx`
is currently imported by `editorRegression.test.tsx` and
`commentsStore.test.ts`. After the move, both update to
`@/containers/editor/comments/__tests__/commentHarness`. The
`editorRegression.test.tsx` file stays at
`containers/editor/__tests__/editorRegression.test.tsx` because it's a
multi-feature integration test — there is no single feature folder for it to
belong to.

### `.gitkeep` cleanup

Several feature folders currently have `.gitkeep` files
(`containers/editor/components/<feature>/.gitkeep`,
 `containers/editor/hooks/.gitkeep`, etc.). After Phase 4 these folders
are deleted; the `.gitkeep` files go with them. Don't add new `.gitkeep`
to the new feature folders — they are non-empty by construction.

### Editor 3-tier rule (unchanged)

`src/editor/` MUST NOT import from `src/containers/editor/`. The rewrites
move React UI **into** containers — they never invert the dependency.
Verify after Phase 5:
```sh
grep -rn "from '@/containers/editor" src/editor/
# expected: zero results
```

## Acceptance checklist

- [ ] `containers/editor/components/` no longer exists.
- [ ] `containers/editor/stores/` no longer exists; contents under
      `session/` or feature-local `store/`.
- [ ] `containers/editor/<feature>/index.tsx` exists for each of: comments,
      versions, outline, glossary, meta, suggestions, peers, status.
      `workflow/` has `ShortcutsModal.tsx` and no `index.tsx` (intentional).
- [ ] Each feature's `components/` is imported only via relative paths from
      inside the same feature (no `@/containers/editor/<feature>/components/`
      anywhere else in `src/`).
- [ ] `editor/yjs/`, `editor/diff/`, `editor/app/`, `editor/meta/`,
      `editor/outline/` are gone.
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build` all green.
- [ ] Manual smoke in browser passes (see Phase 7).
- [ ] `containers/editor/README.md` and `containers/editor/session/README.md`
      reflect the new layout.
- [ ] No new `// removed`, `// moved` style comments anywhere.

## Out-of-scope follow-ups (do NOT do in this PR)

- Splitting any single component file (file size unchanged).
- Renaming the public component names (`CommentsSidebar`, `VersionsPanel`, …
  stay).
- Touching `editor/tiptap/` substructure.
- Promoting or demoting any component to/from `src/components/`.
- Changing zustand store shape or selector signatures.
- **`UserMenu` deduplication.** Two near-identical files exist:
  `containers/editor/components/UserMenu.tsx` (used by editor TopBar) and
  `components/layout/UserMenu.tsx` (used by global AppTopBar). This PR
  moves the editor's copy to `containers/editor/layout/UserMenu.tsx`
  (Phase 1) without merging the two. Deduplicating them — collapsing to
  the global `components/layout/UserMenu.tsx` and deleting the editor
  copy — is a separate task that requires verifying both call sites
  render identical UI.

These are valid future tasks; bundling them with the move would make the diff
unreviewable.
