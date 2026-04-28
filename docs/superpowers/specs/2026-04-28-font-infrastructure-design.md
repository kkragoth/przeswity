# Font Infrastructure — Design Spec

**Date:** 2026-04-28
**Status:** Approved
**Sub-project:** 1 of 6 (see `2026-04-28-docx-parity-roadmap.md`)

## Goal

Make the Tiptap editor and the `docx.js` exporter render every block type using **identical font files, identical sizes, identical line-heights, and identical paragraph spacing**. After this lands, residual visual differences between the editor and an exported DOCX are attributable solely to Word's vs the browser's text shaper — every other dimension is byte-identical because both sides read from a single typography manifest.

This spec does **not** cover sections, headers, footers, page breaks, tables, images, or Word-native semantics (track changes / comments / footnotes / TOC). Those are sub-projects 2–6.

---

## Architecture

### 1. Single source of truth: `typography.ts`

New file: `frontend/src/editor/io/typography.ts`. Exports constants used by both the CSS layer and the DOCX exporter.

```ts
// shape only — exact numbers tuned during implementation
export const FONT_FAMILIES = {
    serif: 'Liberation Serif',
    sans:  'Liberation Sans',
    mono:  'Liberation Mono',
} as const;

export interface BlockTypography {
    family: keyof typeof FONT_FAMILIES;
    sizePt: number;
    weight: 'normal' | 'bold';
    italic?: boolean;
    lineHeight: number;       // multiplier, e.g. 1.15
    spaceBeforePt: number;
    spaceAfterPt: number;
    indentPt?: number;        // for blockquote, list items
}

export const TYPOGRAPHY: Record<BlockKind, BlockTypography> = {
    body:       { family: 'serif', sizePt: 11, weight: 'normal', lineHeight: 1.15, spaceBeforePt: 0, spaceAfterPt: 8 },
    h1:         { family: 'serif', sizePt: 18, weight: 'bold',   lineHeight: 1.15, spaceBeforePt: 12, spaceAfterPt: 6 },
    h2:         { family: 'serif', sizePt: 16, weight: 'bold',   lineHeight: 1.15, spaceBeforePt: 10, spaceAfterPt: 6 },
    h3:         { family: 'serif', sizePt: 14, weight: 'bold',   lineHeight: 1.15, spaceBeforePt: 8,  spaceAfterPt: 4 },
    h4:         { family: 'serif', sizePt: 12, weight: 'bold',   lineHeight: 1.15, spaceBeforePt: 6,  spaceAfterPt: 4 },
    h5:         { family: 'serif', sizePt: 11, weight: 'bold',   lineHeight: 1.15, spaceBeforePt: 6,  spaceAfterPt: 4 },
    h6:         { family: 'serif', sizePt: 11, weight: 'bold', italic: true, lineHeight: 1.15, spaceBeforePt: 6, spaceAfterPt: 4 },
    blockquote: { family: 'serif', sizePt: 11, weight: 'normal', italic: true, lineHeight: 1.15, spaceBeforePt: 8, spaceAfterPt: 8, indentPt: 36 },
    code:       { family: 'mono',  sizePt: 10, weight: 'normal', lineHeight: 1.30, spaceBeforePt: 6, spaceAfterPt: 6 },
    listItem:   { family: 'serif', sizePt: 11, weight: 'normal', lineHeight: 1.15, spaceBeforePt: 0, spaceAfterPt: 4, indentPt: 18 },
} as const;

export const PAGE = {
    widthPt: 595,    // A4 portrait
    heightPt: 842,
    marginTopPt: 72,
    marginBottomPt: 72,
    marginLeftPt: 72,
    marginRightPt: 72,
} as const;
```

Helpers in same module convert points → docx half-points (`pt * 2`), points → twips (`pt * 20`), points → CSS px at 96dpi (`pt * 96 / 72`). All conversions live here so callers never compute units inline.

This file is the **only** place numbers are written. Everything else imports.

### 2. Browser layer

**Font assets.** Ship 12 .ttf files (4 weights × 3 families, regular / bold / italic / bold-italic) under `frontend/public/fonts/liberation/`. `public/` is chosen over Vite asset imports so the same URLs are usable both for `@font-face` and for `fetch()` at export time — no build duplication, no base64 inlining bloat.

License files (`LICENSE` from upstream Liberation Fonts project) ship alongside.

**`@font-face` declarations.** New CSS file `frontend/src/editor/editor/fonts.css`, imported once at app entry. 12 entries hand-written (small enough not to warrant generation):

```css
@font-face {
    font-family: 'Liberation Serif';
    src: url('/fonts/liberation/LiberationSerif-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style:  normal;
    font-display: block;  /* avoid fallback-flash; correctness > FOIT */
}
/* …11 more… */
```

`font-display: block` blocks paint until the font loads — correctness over FOUT. Acceptable because the fonts are local and small (~150 KB each).

**Editor styles.** Editor root sets:

```css
.ProseMirror {
    font-family: 'Liberation Serif', serif;
    font-size: var(--editor-body-pt);     /* derived from TYPOGRAPHY.body.sizePt */
    line-height: var(--editor-body-lh);
}
.ProseMirror h1 { font-family: 'Liberation Serif'; font-size: …; font-weight: bold; … }
/* …per block kind… */
.ProseMirror code, .ProseMirror pre { font-family: 'Liberation Mono', monospace; … }
```

CSS variables are emitted from `typography.ts` at module load (set on `:root` via a small init function called from `EditorView.tsx`) so the values cannot drift from the manifest. Generic family (`serif`, `monospace`) is crash-safety only — Liberation must always win.

**Pre-load.** Before mounting Tiptap (in `EditorView.tsx`), `await Promise.all(FONT_VARIANTS.map(v => document.fonts.load(\`\${v.weight} \${v.style} 16px '\${v.family}'\`)))`. First paint then has correct metrics — avoids initial-fallback layout that PaginationPlus would re-measure.

### 3. DOCX layer

**Font embedding.** On first export call, fetch all 12 .ttf URLs in parallel, cache the `Uint8Array` per font in module scope (don't re-fetch on subsequent exports). Pass to `docx.js`:

```ts
const doc = new Document({
    fonts: [
        { name: 'Liberation Serif',     data: serifRegularBytes,    family: 'roman' },
        { name: 'Liberation Serif Bold',data: serifBoldBytes,       family: 'roman' },
        // …all 12…
    ],
    styles: stylesFromTypography(TYPOGRAPHY),
    sections: [...],
});
```

`docx.js` writes embedded fonts into `word/fontTable.xml` + `word/fonts/` parts. Ships the .ttf inside the .docx so any viewer renders correctly without the system having Liberation installed.

**Style configuration.** Helper `stylesFromTypography(TYPOGRAPHY)` returns the `IStylesOptions` for `docx.js`:

- `default.document.run`: family, size in half-points
- `default.document.paragraph`: line spacing, space-before, space-after
- `paragraphStyles`: one entry per block kind (`Heading1`–`Heading6`, `IntenseQuote`, `Code`, list-item style)

This means `blockToParagraphs` in `docx.ts` mostly just sets `style: 'Heading1'` etc. and `docx.js` applies the registered style. Per-`TextRun` overrides only when a mark requires them.

**Per-run font.** Every `TextRun` gets explicit `font: TYPOGRAPHY[kind].family` and `size: pointsToHalfPoints(TYPOGRAPHY[kind].sizePt)`. No reliance on inheritance — Word's inheritance has gaps (e.g. table cells don't inherit run defaults reliably across versions).

**Page setup.** `PAGE` constants drive section page size + margins (twips, `pt * 20`).

**Refactor of existing `docx.ts`.** Replace inline `MARGIN_TWIPS = 1440` etc. with `pointsToTwips(PAGE.marginLeftPt)`. Replace HeadingLevel-based mapping with paragraph styles registered from `TYPOGRAPHY`. The structural changes are small; the behavioral change is that fonts and sizes now match the editor.

### 4. Wiring summary

| Concern | Owner |
|---|---|
| Numbers (sizes, spacing, margins) | `typography.ts` only |
| Browser font loading | `fonts.css` + `EditorView.tsx` pre-load |
| Browser block styling | `editor.css` driven by CSS variables from `typography.ts` |
| DOCX font embedding | `docx.ts` exporter, lazy-cached fetch |
| DOCX block styling | `stylesFromTypography()` registered as document styles |
| Conversions | helpers in `typography.ts` (`ptToHalf`, `ptToTwips`, `ptToPx`) |

---

## Acceptance Criteria

Manual review only — no CI visual-regression in scope per roadmap decision.

1. **Editor uses Liberation.** Open editor, computed `font-family` on a paragraph reads `Liberation Serif`. Temporarily delete the `@font-face` rule → page must render with browser's serif fallback (proves Liberation was actually being used).
2. **DOCX embeds Liberation.** Export sample doc. Unzip the .docx; `word/fontTable.xml` references Liberation Serif/Sans/Mono; `word/fonts/` part contains the .ttf bytes (or .obfuscated copies — Word's standard format). File size ~600 KB to ~1 MB depending on which weights are used.
3. **Word view.** Open exported DOCX in Microsoft Word. File → Properties → Fonts (or "Embed Fonts"): only Liberation Serif/Sans/Mono listed. No system fonts leaked through.
4. **Cross-viewer.** Same DOCX renders identically in Word, LibreOffice Writer, and Apple Pages — no font substitution warnings; heading sizes and line heights visually identical across all three.
5. **Sample-doc parity.** Sample doc contains: H1–H6, body paragraph, blockquote, ordered list, unordered list, codeBlock, inline `code`, bold, italic, underline. Side-by-side at the same pixel scale, the editor screenshot and the Word screenshot of page 1 align within ~2px on every text baseline.
6. **No drift between sides.** Searching the codebase (`grep`) for hardcoded font sizes, family names, or margin values outside `typography.ts` returns zero matches.

---

## Out of Scope (Deferred)

- **User-facing font picker.** Single canonical font per kind for now.
- **Sections / multi-section page setup.** Sub-project 2.
- **Headers / footers beyond current single-pair model.** Sub-project 2.
- **Page-break / section-break nodes.** Sub-project 3.
- **Track changes, comments, footnotes, TOC native.** Sub-project 4.
- **Tables and images parity.** Sub-project 5.
- **Highlight, glossary, code-block background shading.** Sub-project 6.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `docx.js` font embedding produces files some Word versions reject | Test against Word 2019, Word 365 (Mac + Win), LibreOffice 24+, Pages 13+. Fall back to declaring the font without embedding if a viewer rejects, accepting reduced parity. |
| `~600 KB`–`1 MB` per docx is too large | Acceptable for office docs. If pushback, drop italic/bold-italic for Mono and Sans (used rarely) — saves ~300 KB. |
| Font-face load blocks first paint | `font-display: block` is intentional. Pre-load before mount means the block window is ≤ tens of ms on a warm cache, and a flash of fallback would corrupt PaginationPlus's measured page boundaries — unacceptable. |
| Liberation metrics differ subtly from Times New Roman / Arial | Liberation is metric-compatible by design. Users opening in Word on Windows see the same line breaks. If a Windows user expects "Times New Roman" exactly, they get a metrically-identical clone — acceptable for parity goal. |
