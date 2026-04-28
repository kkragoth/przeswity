# Tiptap Pagination Plus — Design Spec

**Date:** 2026-04-28  
**Status:** Approved

## Goal

Replace the custom DOM-measurement pagination system with `tiptap-pagination-plus`, upgrade Tiptap to v3, and add user-editable print-ready headers/footers stored collaboratively via Yjs.

---

## Architecture

### 1. Tiptap v3 Upgrade

Bump all `@tiptap/*` packages from `^2.10.3` to `^3.22.5`. Audit each extension for breaking API changes. Key risks:

- `StarterKit` v3 may drop bundled extensions that were implicit in v2 — verify against v3 changelog and add any missing extensions explicitly.
- `Collaboration` and `CollaborationCursor` APIs are stable across v2→v3.
- Table extensions are replaced by plugin variants (see below).

### 2. Pagination: Replace Custom System with PaginationPlus

**Remove:**
- `useWordLikePagination.ts`
- `pageLayout.ts`
- `PageNumbers.tsx`
- `page-numbers.css`
- All paper-sheet rendering in `EditorView.tsx`
- Custom pagination CSS in `editor.css`

**Add to `extensions.ts`:**

```ts
import { PaginationPlus, PAGE_SIZES, TablePlus, TableRowPlus, TableCellPlus, TableHeaderPlus } from 'tiptap-pagination-plus';

PaginationPlus.configure({
    pageHeight: PAGE_SIZES.A4.pageHeight,   // 1123px
    pageWidth: PAGE_SIZES.A4.pageWidth,     // 794px
    marginTop: 96,
    marginBottom: 96,
    marginLeft: 96,
    marginRight: 96,
    pageGap: 32,
    pageBreakBackground: '#f0ede8',
    headerLeft: '',
    headerRight: '',
    footerLeft: '',
    footerRight: '{page}',
    onHeaderClick: ({ pageNumber }) => { /* passed via config getter */ },
    onFooterClick: ({ pageNumber }) => { /* passed via config getter */ },
})
```

Replace `Table`, `TableRow`, `TableCell`, `TableHeader` with `TablePlus`, `TableRowPlus`, `TableCellPlus`, `TableHeaderPlus` from the plugin for correct table-splitting across pages.

### 3. Header/Footer Floating Bar

#### ADT

```ts
type HeaderFooterFocus =
    | { kind: 'header'; left: string; right: string }
    | { kind: 'footer'; left: string; right: string }
    | { kind: 'none' };
```

#### `HeaderFooterBar.tsx` (new)

A floating overlay bar rendered inside `.editor-shell` when `focus.kind !== 'none'`.

- **Mode label**: "Header" or "Footer"
- **Two inputs**: Left / Right, placeholder `e.g. Company Name or {page} of {total}`
- **Apply**: on blur or Enter — calls `editor.commands.updateHeaderContent(left, right)` or `updateFooterContent(left, right)`
- **Dismiss**: Escape or click outside — reverts to saved state
- **Positioning**: sticky near top (header mode) or bottom (footer mode) of the scroll container

#### `EditorView.tsx` changes

- Remove `useWordLikePagination`, `pageCssVars`, `pageStackStyle`, `PageNumbers`, paper-sheet `<div>` array
- Add `headerFooterFocus: HeaderFooterFocus` state (default `{ kind: 'none' }`)
- Pass `onHeaderClick` / `onFooterClick` to `buildExtensions` as getters, same pattern as other live callbacks
- Render `<HeaderFooterBar>` when `headerFooterFocus.kind !== 'none'`

### 4. Yjs Persistence

Header/footer content is stored in the shared Yjs document map:

```ts
const meta = collab.doc.getMap<string>('meta');
// Keys: 'headerLeft', 'headerRight', 'footerLeft', 'footerRight'
```

**On mount:** read keys from the map and seed `PaginationPlus` initial config. Default values if keys are absent: `headerLeft: ''`, `headerRight: ''`, `footerLeft: ''`, `footerRight: '{page}'`.

**On apply (blur/dismiss):** write updated values back to the map, then call `updateHeaderContent`/`updateFooterContent`.

**Yjs observer:** `meta.observe(...)` triggers `updateHeaderContent`/`updateFooterContent` when a remote peer changes any header/footer key — keeps all collaborators in sync.

### 5. CSS

**Remove** from `editor.css`:
- `.editor-paper-layer`, `.editor-paper-sheet`, `.editor-paper-sheet::before/::after`
- `.prose-editor` explicit `width` and `min-height` constraints (plugin owns page width now)
- `.pm-page-break-before` rule
- CSS custom properties `--page-height-px`, `--page-margin-y-px`, `--page-gap-px`, `--pm-page-break-before`, `--page-top`, `--page-stack-height`

**Keep / adapt:**
- `.editor-shell`, `.editor-scroll`, `.editor-page` — adjust margins/sizing to wrap the plugin's `[data-rm-pagination]` container
- `.prose-editor` typography rules (fonts, headings, lists, etc.) — keep as-is

**Add `@media print`:**

```css
@media print {
    .editor-toolbar,
    .toolbar,
    .left-pane,
    .right-pane,
    .statusbar,
    .bubble-menu,
    .drag-handle { display: none !important; }
    .editor-scroll { overflow: visible; padding: 0; }
    .editor-page { margin: 0; width: 100%; }
}
```

---

## Files Touched

| File | Action |
|------|--------|
| `frontend/package.json` | Bump `@tiptap/*` to v3, add `tiptap-pagination-plus` |
| `editor/editor/extensions.ts` | Add `PaginationPlus`, swap table extensions, remove old imports |
| `editor/editor/EditorView.tsx` | Remove custom pagination, add `HeaderFooterFocus` state + bar |
| `editor/editor/HeaderFooterBar.tsx` | **New** — floating edit bar |
| `editor/editor/useWordLikePagination.ts` | **Delete** |
| `editor/editor/pageLayout.ts` | **Delete** |
| `editor/editor/PageNumbers.tsx` | **Delete** |
| `editor/editor/page-numbers.css` | **Delete** |
| `editor/editor/editor.css` | Remove paper-sheet CSS, add print media query |
| `editor/styles/tokens.css` | Remove page CSS custom properties if present |

---

## Out of Scope

- Per-page custom header/footer (plugin supports it but not exposed in the UI)
- Rich-text formatting inside header/footer (inputs are plain text with `{page}`/`{total}` tokens)
- Page size switching UI (A4 fixed; can be added later)
