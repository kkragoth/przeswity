# Editor Styling — TL;DR

How to change font, font size, and paragraph/page spacing inside the document editor.

## High-level overview

Two layers, in order of authority:

1. **Typography manifest** (`frontend/src/editor/io/typography/constants.ts`) — single source of truth for *font family, size (pt), line height, space-before/after, indent* per block kind (`body`, `h1`–`h6`, `blockquote`, `code`, `listItem`). Read by both the editor's runtime CSS and the DOCX exporter, so changes here also affect `.docx` exports.
2. **CSS tokens & rules** (`frontend/src/editor/styles/tokens.css`, `frontend/src/editor/tiptap/editor.css`) — visual layer. Tokens emit at runtime as `--ed-<kind>-fs|lh|fw|fst|mt|mb|indent` via `editor/io/typography-css.ts`. Static fallbacks (`--content-fs`, `--font-body`, page margins) live in `tokens.css`.

Rule of thumb:
- **Type/spacing per block (body, h1, blockquote…)** → edit the manifest.
- **Page margins, scroll padding, paper background** → edit `tokens.css` / `editor.css`.
- **Font file (swap Liberation for something else)** → edit `FONT_FAMILIES` + `FONT_VARIANTS` in `constants.ts` and add `@font-face` in `editor/tiptap/fonts.css`.

## Low-level: what to change

### Change a font family
File: `frontend/src/editor/io/typography/constants.ts`

```ts
export const FONT_FAMILIES = {
    serif: 'Liberation Serif',  // body / headings
    sans:  'Liberation Sans',   // UI
    mono:  'Liberation Mono',   // code
}
```

If you swap to a new font, also:
- add the file under `frontend/public/fonts/...`
- add a row to `FONT_VARIANTS` (regular/bold/italic/bolditalic)
- add `@font-face` in `frontend/src/editor/tiptap/fonts.css`

### Change font size / line-height / bold / italic per block
File: `frontend/src/editor/io/typography/constants.ts` → `BLOCK_TYPOGRAPHY_PRESETS`

Sizes are in **points (pt)**, converted to px at runtime via `ptToPx`.

```ts
body: { family: 'serif', sizePt: 12, bold: false, italic: false,
        lineHeight: 1.5, spaceBeforePt: 0, spaceAfterPt: 8, indentPt: 0 },
h1:   { ..., sizePt: 22.5, ..., spaceBeforePt: 14, spaceAfterPt: 6 },
```

- `sizePt` — font size
- `lineHeight` — unitless multiplier
- `spaceBeforePt` / `spaceAfterPt` — paragraph margin top/bottom (rendered as `padding-top` / `padding-bottom`)
- `indentPt` — left indent (used by blockquote, list items)

These flow into CSS as `--ed-<kind>-fs`, `--ed-<kind>-lh`, `--ed-<kind>-mt`, `--ed-<kind>-mb`, `--ed-<kind>-indent`.

### Change paragraph margin/padding (the rule, not the value)
File: `frontend/src/editor/tiptap/editor.css`

If you want a *different rule* (e.g. margin instead of padding, or per-element override), edit selectors like `.prose-editor p`, `.prose-editor h1`, `.prose-editor blockquote`. For values, prefer the manifest above.

```css
.prose-editor p {
    margin: 0;
    padding-bottom: var(--ed-body-mb);
}
.prose-editor blockquote {
    padding: var(--ed-blockquote-mt) 0 var(--ed-blockquote-mb) var(--ed-blockquote-indent);
}
```

### Change page margins (the paper itself)
File: `frontend/src/editor/io/typography/constants.ts` → `PAGE`

```ts
export const PAGE = {
    widthPt: 595.3, heightPt: 841.9,        // A4
    marginTopPt: 72, marginBottomPt: 72,    // 1 inch
    marginLeftPt: 72, marginRightPt: 72,
}
```

Affects on-screen page chrome **and** DOCX export.

For the *outer* canvas padding (around the page, not inside it), edit `tokens.css`:

```css
--editor-measure: 602px;
--page-margin-y:  96px;
--page-margin-x:  96px;
```

…or `.editor-scroll { padding: ... }` in `editor.css`.

### Change UI font / sizes (toolbar, panels — not the document)
File: `frontend/src/editor/styles/tokens.css`

```css
--font-ui:   'Liberation Sans', ...;
--fs-base:   14px;
--fs-sm:     13px;  /* etc. */
```

## Quick reference — which file to touch

| I want to change…                           | File                                                   |
|---------------------------------------------|--------------------------------------------------------|
| Body / heading font size or line-height     | `editor/io/typography/constants.ts`                    |
| Paragraph spacing before/after              | `editor/io/typography/constants.ts` (`spaceBeforePt/AfterPt`) |
| Blockquote / list indent                    | `editor/io/typography/constants.ts` (`indentPt`)       |
| Page margins (and DOCX margins)             | `editor/io/typography/constants.ts` (`PAGE`)           |
| Document font family                        | `editor/io/typography/constants.ts` (`FONT_FAMILIES`) + `editor/tiptap/fonts.css` |
| Selector rule (margin vs padding, color)    | `editor/tiptap/editor.css`                             |
| UI / toolbar font + sizes, spacing scale    | `editor/styles/tokens.css`                             |
| Theme colors (paper, accent, dark mode)     | `editor/styles/tokens.css`                             |

## Headers & footers

Headers/footers are rendered by the **PaginationPlus** Tiptap extension at the top/bottom of every paginated page. Each band has a **left** slot and a **right** slot (plain text + tokens like `{page}`).

### High-level

- **Content** (per-document): stored in the Yjs collab doc under `meta` map keys `headerLeft`, `headerRight`, `footerLeft`, `footerRight`. Default `footerRight = '{page}'`.
- **Edit UI**: `frontend/src/editor/tiptap/headerFooter/HeaderFooterBar.tsx` — opened by clicking the header or footer band.
- **Sync** (Yjs ↔ extension): `frontend/src/editor/tiptap/headerFooter/useHeaderFooterSync.ts` — observes `meta` and calls PaginationPlus's `updateHeaderContent` / `updateFooterContent` commands.
- **Layout & defaults**: `frontend/src/editor/tiptap/extensions.ts` — `PaginationPlus.configure({...})`.
- **Bar styling**: `frontend/src/editor/tiptap/headerFooter/headerFooter.css` (`.hf-bar*` classes).

### Low-level — what to change

**Default header/footer text** (new documents) — `editor/tiptap/extensions.ts`:

```ts
PaginationPlus.configure({
    ...A4_PAGE,
    pageGap: 32,
    contentMarginTop: 8,        // gap between header band and content
    contentMarginBottom: 8,     // gap between content and footer band
    headerLeft: '',
    headerRight: '',
    footerLeft: '',
    footerRight: '{page}',      // {page} → current page number
    ...
})
```

**Page size + margins** (header/footer sit *inside* the top/bottom margins) — `editor/tiptap/extensions.ts` → `A4_PAGE`:

```ts
const A4_PAGE = {
    pageHeight: A4_PAGE_HEIGHT_PX,  // from editor/tiptap/constants.ts
    pageWidth:  A4_PAGE_WIDTH_PX,
    marginTop:    A4_MARGIN_PX,     // taller margin → more room for header
    marginBottom: A4_MARGIN_PX,
    marginLeft:   A4_MARGIN_PX,
    marginRight:  A4_MARGIN_PX,
}
```

For DOCX export, mirror these in `editor/io/typography/constants.ts` → `PAGE` (pt-based).

**Edit-bar look (the input row that appears when you click the header/footer)** — `editor/tiptap/headerFooter/headerFooter.css`. Tweak `.hf-bar` (background, padding, border), `.hf-bar__input` (height, font), `.hf-bar__label` (uppercase tag).

**Edit-bar fields/labels/placeholders** — `editor/tiptap/headerFooter/HeaderFooterBar.tsx` plus i18n keys under `headerFooterBar.*` in `frontend/src/locales/{en,pl,ua}/editor.json`.

**Header/footer typography on the page itself** (font, size, color of the rendered text in the bands) — these come from PaginationPlus's own DOM. Override via descendant selectors in `editor/tiptap/editor.css`, e.g.:

```css
.rm-page-header,
.rm-page-footer {
    font-family: var(--font-ui);
    font-size: 10pt;
    color: var(--text-muted);
}
```

(Inspect the rendered DOM to confirm class names if PaginationPlus version changes.)

### Quick reference

| I want to change…                                | File                                                       |
|--------------------------------------------------|------------------------------------------------------------|
| Default header/footer text for new docs          | `editor/tiptap/extensions.ts` (`PaginationPlus.configure`) |
| Space between header/footer band and content     | `editor/tiptap/extensions.ts` (`contentMarginTop/Bottom`)  |
| Page top/bottom margin (room for header/footer)  | `editor/tiptap/extensions.ts` (`A4_PAGE`) + `typography/constants.ts` (`PAGE`) for DOCX |
| Header/footer **content** for current document   | Yjs `meta` map — set via the bar UI, not hardcoded         |
| Edit-bar UI styling                              | `editor/tiptap/headerFooter/headerFooter.css`              |
| Edit-bar labels/placeholders                     | `editor/tiptap/headerFooter/HeaderFooterBar.tsx` + `locales/*/editor.json` |
| Font/size of text rendered in header/footer band | `editor/tiptap/editor.css` (selectors on PaginationPlus's header/footer DOM) |

Tokens supported in slot values (resolved by PaginationPlus): `{page}` for the current page number. Plain text otherwise.

## Notes

- The manifest is the **single source of truth** — DOCX export reads the same numbers, so document-style tweaks stay consistent across screen and export.
- After editing the manifest, no rebuild step is needed beyond the normal dev reload — `applyTypographyToCssVars` runs at editor mount and re-emits the CSS variables.
- Don't hardcode pt/px in `editor.css` for things the manifest already covers; use the `--ed-*` variables so DOCX stays in sync.
