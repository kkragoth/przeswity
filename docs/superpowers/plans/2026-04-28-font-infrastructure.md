# Font Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the editor and the DOCX exporter render every block type using identical embedded Liberation fonts, identical sizes, identical line heights, and identical paragraph spacing — driven by a single typography manifest.

**Architecture:** New module `frontend/src/editor/io/typography.ts` is the sole source of truth for family/size/line-height/spacing/indent values. CSS layer reads it via emitted CSS variables; DOCX layer reads it directly into `docx.js` style configs. Liberation Serif/Sans/Mono `.ttf` files ship under `frontend/public/fonts/liberation/`, are declared via `@font-face` for the browser, and are embedded into every exported DOCX via `docx.js` `fonts:` option.

**Tech Stack:** Tiptap v3, `docx.js` v9, Vite, vitest, Liberation Fonts 2.1.5 (SIL OFL).

**Spec:** `docs/superpowers/specs/2026-04-28-font-infrastructure-design.md`

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `frontend/public/fonts/liberation/*.ttf` (12 files) | Create | Static font assets, served at `/fonts/liberation/...` and fetched by exporter |
| `frontend/public/fonts/liberation/LICENSE` | Create | SIL OFL license text from upstream |
| `frontend/src/editor/io/typography.ts` | Create | Single source of truth: typography manifest + unit conversions + DOCX style builder |
| `frontend/src/editor/io/typography.test.ts` | Create | Unit tests for conversions + style builder |
| `frontend/src/editor/editor/fonts.css` | Create | 12 `@font-face` declarations |
| `frontend/src/editor/styles.css` | Modify | Import `fonts.css` |
| `frontend/src/editor/styles/tokens.css` | Modify | Change `--font-body`/`--font-mono` to Liberation; expose typography CSS variables |
| `frontend/src/editor/editor/editor.css` | Modify | Replace hardcoded heading/body sizes with CSS variables driven by typography manifest |
| `frontend/src/editor/EditorHost.tsx` | Modify | Pre-load fonts before mounting Tiptap |
| `frontend/src/editor/io/docx.ts` | Modify | Embed fonts; register paragraph styles from manifest; per-run font/size from manifest |
| `frontend/vitest.config.ts` | Create (if absent) | Minimal vitest config for the new tests |

---

## Task 1: Add Liberation font assets

**Files:**
- Create: `frontend/public/fonts/liberation/LiberationSerif-Regular.ttf`
- Create: `frontend/public/fonts/liberation/LiberationSerif-Bold.ttf`
- Create: `frontend/public/fonts/liberation/LiberationSerif-Italic.ttf`
- Create: `frontend/public/fonts/liberation/LiberationSerif-BoldItalic.ttf`
- Create: `frontend/public/fonts/liberation/LiberationSans-Regular.ttf`
- Create: `frontend/public/fonts/liberation/LiberationSans-Bold.ttf`
- Create: `frontend/public/fonts/liberation/LiberationSans-Italic.ttf`
- Create: `frontend/public/fonts/liberation/LiberationSans-BoldItalic.ttf`
- Create: `frontend/public/fonts/liberation/LiberationMono-Regular.ttf`
- Create: `frontend/public/fonts/liberation/LiberationMono-Bold.ttf`
- Create: `frontend/public/fonts/liberation/LiberationMono-Italic.ttf`
- Create: `frontend/public/fonts/liberation/LiberationMono-BoldItalic.ttf`
- Create: `frontend/public/fonts/liberation/LICENSE`

- [ ] **Step 1: Create directory**

```bash
mkdir -p frontend/public/fonts/liberation
```

- [ ] **Step 2: Download Liberation Fonts 2.1.5 release tarball**

```bash
cd /tmp
curl -L -o liberation-fonts.tar.gz \
  https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz
tar -xzf liberation-fonts.tar.gz
ls liberation-fonts-ttf-2.1.5/
```

Expected: directory contains `LiberationSerif-Regular.ttf`, `LiberationSans-Regular.ttf`, `LiberationMono-Regular.ttf` and the bold/italic variants, plus a `LICENSE` file.

- [ ] **Step 3: Copy the 12 required .ttf files plus LICENSE into the project**

```bash
cd /tmp/liberation-fonts-ttf-2.1.5
cp LiberationSerif-Regular.ttf LiberationSerif-Bold.ttf LiberationSerif-Italic.ttf LiberationSerif-BoldItalic.ttf \
   LiberationSans-Regular.ttf  LiberationSans-Bold.ttf  LiberationSans-Italic.ttf  LiberationSans-BoldItalic.ttf \
   LiberationMono-Regular.ttf  LiberationMono-Bold.ttf  LiberationMono-Italic.ttf  LiberationMono-BoldItalic.ttf \
   "$OLDPWD/frontend/public/fonts/liberation/"
cp LICENSE "$OLDPWD/frontend/public/fonts/liberation/LICENSE"
```

- [ ] **Step 4: Verify all 12 files present**

```bash
ls frontend/public/fonts/liberation/ | grep -c '\.ttf$'
```

Expected: `12`.

- [ ] **Step 5: Verify URLs are served by the dev server**

Start dev server in another terminal: `cd frontend && npm run dev`. Then:

```bash
curl -I http://localhost:3000/fonts/liberation/LiberationSerif-Regular.ttf
```

Expected: `HTTP/1.1 200 OK` with `Content-Type: font/ttf` (or `application/octet-stream`).

- [ ] **Step 6: Commit**

```bash
git add frontend/public/fonts/liberation/
git commit -m "feat: ship Liberation Serif/Sans/Mono font assets under public/fonts/liberation"
```

---

## Task 2: Create typography manifest with conversion helpers

**Files:**
- Create: `frontend/src/editor/io/typography.ts`
- Create: `frontend/src/editor/io/typography.test.ts`
- Create: `frontend/vitest.config.ts` (if not present)

The manifest preserves current editor sizes (h1 30px, h2 22px, h3 18px, body 16px, code 13px) expressed in points so DOCX can consume them directly. Conversions in one place: pt → CSS px (96dpi), pt → docx half-points, pt → twips, multiplier line-height → docx 240ths.

- [ ] **Step 1: Confirm vitest config presence**

```bash
ls frontend/vitest.config.ts frontend/vitest.config.* 2>/dev/null
```

If nothing prints, create a minimal config. Otherwise skip to Step 2.

```ts
// frontend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
    resolve: {
        alias: { '@': path.resolve(__dirname, 'src') },
    },
});
```

- [ ] **Step 2: Write failing tests for conversion helpers**

Create `frontend/src/editor/io/typography.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ptToHalfPoints, ptToTwips, ptToPx, lineHeightTo240ths, TYPOGRAPHY, PAGE, FONT_FAMILIES } from './typography';

describe('unit conversions', () => {
    it('ptToHalfPoints multiplies by 2', () => {
        expect(ptToHalfPoints(11)).toBe(22);
        expect(ptToHalfPoints(22.5)).toBe(45);
    });

    it('ptToTwips multiplies by 20', () => {
        expect(ptToTwips(72)).toBe(1440);
        expect(ptToTwips(11)).toBe(220);
    });

    it('ptToPx converts at 96dpi', () => {
        expect(ptToPx(72)).toBe(96);
        expect(ptToPx(12)).toBe(16);
    });

    it('lineHeightTo240ths multiplies multiplier by 240', () => {
        expect(lineHeightTo240ths(1)).toBe(240);
        expect(lineHeightTo240ths(1.5)).toBe(360);
    });
});

describe('typography manifest', () => {
    it('exposes the three Liberation families', () => {
        expect(FONT_FAMILIES.serif).toBe('Liberation Serif');
        expect(FONT_FAMILIES.sans).toBe('Liberation Sans');
        expect(FONT_FAMILIES.mono).toBe('Liberation Mono');
    });

    it('body matches the current editor 16px / 1.5', () => {
        expect(TYPOGRAPHY.body.sizePt).toBe(12);   // 12pt = 16px @ 96dpi
        expect(TYPOGRAPHY.body.lineHeight).toBe(1.5);
        expect(TYPOGRAPHY.body.family).toBe('serif');
    });

    it('headings preserve current editor pixel sizes', () => {
        expect(ptToPx(TYPOGRAPHY.h1.sizePt)).toBe(30);
        expect(ptToPx(TYPOGRAPHY.h2.sizePt)).toBe(22);
        expect(ptToPx(TYPOGRAPHY.h3.sizePt)).toBe(18);
    });

    it('code uses mono at 13px', () => {
        expect(TYPOGRAPHY.code.family).toBe('mono');
        expect(ptToPx(TYPOGRAPHY.code.sizePt)).toBeCloseTo(13, 0);
    });

    it('A4 page setup is 595x842pt with 72pt margins', () => {
        expect(PAGE.widthPt).toBe(595);
        expect(PAGE.heightPt).toBe(842);
        expect(PAGE.marginTopPt).toBe(72);
        expect(PAGE.marginLeftPt).toBe(72);
    });
});
```

- [ ] **Step 3: Run tests, verify they fail**

```bash
cd frontend && npx vitest run src/editor/io/typography.test.ts
```

Expected: FAIL — module `./typography` not found.

- [ ] **Step 4: Implement the manifest**

Create `frontend/src/editor/io/typography.ts`:

```ts
// Single source of truth for font families, sizes, line heights, spacing,
// page setup. Both the editor's CSS layer and the DOCX exporter read from here.

export const FONT_FAMILIES = {
    serif: 'Liberation Serif',
    sans:  'Liberation Sans',
    mono:  'Liberation Mono',
} as const;

export type FontKey = keyof typeof FONT_FAMILIES;

export interface BlockTypography {
    family: FontKey;
    sizePt: number;
    bold: boolean;
    italic: boolean;
    lineHeight: number;       // multiplier
    spaceBeforePt: number;
    spaceAfterPt: number;
    indentPt: number;         // left indent for the block (lists / blockquote)
}

export type BlockKind =
    | 'body'
    | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
    | 'blockquote'
    | 'code'
    | 'listItem';

// Sizes preserve current editor pixel values (16/30/22/18/13 px @ 96dpi)
// converted to pt. line-heights mirror current editor.css.
export const TYPOGRAPHY: Record<BlockKind, BlockTypography> = {
    body:       { family: 'serif', sizePt: 12,    bold: false, italic: false, lineHeight: 1.5,  spaceBeforePt: 0,  spaceAfterPt: 8,  indentPt: 0  },
    h1:         { family: 'serif', sizePt: 22.5,  bold: true,  italic: false, lineHeight: 1.2,  spaceBeforePt: 14, spaceAfterPt: 6,  indentPt: 0  },
    h2:         { family: 'serif', sizePt: 16.5,  bold: true,  italic: false, lineHeight: 1.3,  spaceBeforePt: 12, spaceAfterPt: 6,  indentPt: 0  },
    h3:         { family: 'serif', sizePt: 13.5,  bold: true,  italic: false, lineHeight: 1.35, spaceBeforePt: 10, spaceAfterPt: 5,  indentPt: 0  },
    h4:         { family: 'serif', sizePt: 12,    bold: true,  italic: false, lineHeight: 1.35, spaceBeforePt: 8,  spaceAfterPt: 4,  indentPt: 0  },
    h5:         { family: 'serif', sizePt: 12,    bold: true,  italic: false, lineHeight: 1.35, spaceBeforePt: 8,  spaceAfterPt: 4,  indentPt: 0  },
    h6:         { family: 'serif', sizePt: 12,    bold: true,  italic: true,  lineHeight: 1.35, spaceBeforePt: 8,  spaceAfterPt: 4,  indentPt: 0  },
    blockquote: { family: 'serif', sizePt: 12,    bold: false, italic: true,  lineHeight: 1.5,  spaceBeforePt: 6,  spaceAfterPt: 12, indentPt: 21 },  // 28px
    code:       { family: 'mono',  sizePt: 9.75,  bold: false, italic: false, lineHeight: 1.6,  spaceBeforePt: 6,  spaceAfterPt: 12, indentPt: 0  },
    listItem:   { family: 'serif', sizePt: 12,    bold: false, italic: false, lineHeight: 1.5,  spaceBeforePt: 0,  spaceAfterPt: 0,  indentPt: 18 },
};

// A4 in points (1in = 72pt). 1in margins = current PaginationPlus 96px @ 96dpi.
export const PAGE = {
    widthPt: 595,
    heightPt: 842,
    marginTopPt: 72,
    marginBottomPt: 72,
    marginLeftPt: 72,
    marginRightPt: 72,
} as const;

// ---------- Conversions ----------

/** docx.js sizes are expressed in half-points. */
export function ptToHalfPoints(pt: number): number {
    return Math.round(pt * 2);
}

/** docx.js margins/indents are in twips (1/1440 inch = 1/20 of a point). */
export function ptToTwips(pt: number): number {
    return Math.round(pt * 20);
}

/** CSS pixels at 96dpi: 1pt = 96/72 px. Used to derive editor CSS values. */
export function ptToPx(pt: number): number {
    return Math.round((pt * 96) / 72);
}

/** docx.js line spacing in 240ths of a line (so 240 = single, 360 = 1.5). */
export function lineHeightTo240ths(multiplier: number): number {
    return Math.round(multiplier * 240);
}

// ---------- Font variants needed for browser preload ----------

export interface FontVariant {
    family: string;
    weight: 400 | 700;
    style:  'normal' | 'italic';
    file:   string;             // public URL
}

export const FONT_VARIANTS: FontVariant[] = [
    { family: 'Liberation Serif', weight: 400, style: 'normal', file: '/fonts/liberation/LiberationSerif-Regular.ttf'    },
    { family: 'Liberation Serif', weight: 700, style: 'normal', file: '/fonts/liberation/LiberationSerif-Bold.ttf'       },
    { family: 'Liberation Serif', weight: 400, style: 'italic', file: '/fonts/liberation/LiberationSerif-Italic.ttf'     },
    { family: 'Liberation Serif', weight: 700, style: 'italic', file: '/fonts/liberation/LiberationSerif-BoldItalic.ttf' },
    { family: 'Liberation Sans',  weight: 400, style: 'normal', file: '/fonts/liberation/LiberationSans-Regular.ttf'     },
    { family: 'Liberation Sans',  weight: 700, style: 'normal', file: '/fonts/liberation/LiberationSans-Bold.ttf'        },
    { family: 'Liberation Sans',  weight: 400, style: 'italic', file: '/fonts/liberation/LiberationSans-Italic.ttf'      },
    { family: 'Liberation Sans',  weight: 700, style: 'italic', file: '/fonts/liberation/LiberationSans-BoldItalic.ttf'  },
    { family: 'Liberation Mono',  weight: 400, style: 'normal', file: '/fonts/liberation/LiberationMono-Regular.ttf'     },
    { family: 'Liberation Mono',  weight: 700, style: 'normal', file: '/fonts/liberation/LiberationMono-Bold.ttf'        },
    { family: 'Liberation Mono',  weight: 400, style: 'italic', file: '/fonts/liberation/LiberationMono-Italic.ttf'      },
    { family: 'Liberation Mono',  weight: 700, style: 'italic', file: '/fonts/liberation/LiberationMono-BoldItalic.ttf'  },
];
```

- [ ] **Step 5: Run tests, verify pass**

```bash
cd frontend && npx vitest run src/editor/io/typography.test.ts
```

Expected: PASS, all 9 tests green.

- [ ] **Step 6: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/editor/io/typography.ts frontend/src/editor/io/typography.test.ts frontend/vitest.config.ts
git commit -m "feat(editor): add typography manifest with unit conversions"
```

---

## Task 3: Add browser `@font-face` declarations and import

**Files:**
- Create: `frontend/src/editor/editor/fonts.css`
- Modify: `frontend/src/editor/styles.css`

`font-display: block` is intentional — a flash of fallback font would corrupt PaginationPlus's measured page boundaries.

- [ ] **Step 1: Create `fonts.css`**

```css
/*
 * Liberation Serif/Sans/Mono — embedded for both editor rendering and DOCX
 * export so that browser metrics match what users see in Microsoft Word.
 *
 * font-display: block — first paint must use the correct font. Fallback
 * glyphs would shift line breaks and break PaginationPlus's page math.
 */

@font-face {
    font-family: 'Liberation Serif';
    src: url('/fonts/liberation/LiberationSerif-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style:  normal;
    font-display: block;
}
@font-face {
    font-family: 'Liberation Serif';
    src: url('/fonts/liberation/LiberationSerif-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style:  normal;
    font-display: block;
}
@font-face {
    font-family: 'Liberation Serif';
    src: url('/fonts/liberation/LiberationSerif-Italic.ttf') format('truetype');
    font-weight: 400;
    font-style:  italic;
    font-display: block;
}
@font-face {
    font-family: 'Liberation Serif';
    src: url('/fonts/liberation/LiberationSerif-BoldItalic.ttf') format('truetype');
    font-weight: 700;
    font-style:  italic;
    font-display: block;
}

@font-face {
    font-family: 'Liberation Sans';
    src: url('/fonts/liberation/LiberationSans-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style:  normal;
    font-display: block;
}
@font-face {
    font-family: 'Liberation Sans';
    src: url('/fonts/liberation/LiberationSans-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style:  normal;
    font-display: block;
}
@font-face {
    font-family: 'Liberation Sans';
    src: url('/fonts/liberation/LiberationSans-Italic.ttf') format('truetype');
    font-weight: 400;
    font-style:  italic;
    font-display: block;
}
@font-face {
    font-family: 'Liberation Sans';
    src: url('/fonts/liberation/LiberationSans-BoldItalic.ttf') format('truetype');
    font-weight: 700;
    font-style:  italic;
    font-display: block;
}

@font-face {
    font-family: 'Liberation Mono';
    src: url('/fonts/liberation/LiberationMono-Regular.ttf') format('truetype');
    font-weight: 400;
    font-style:  normal;
    font-display: block;
}
@font-face {
    font-family: 'Liberation Mono';
    src: url('/fonts/liberation/LiberationMono-Bold.ttf') format('truetype');
    font-weight: 700;
    font-style:  normal;
    font-display: block;
}
@font-face {
    font-family: 'Liberation Mono';
    src: url('/fonts/liberation/LiberationMono-Italic.ttf') format('truetype');
    font-weight: 400;
    font-style:  italic;
    font-display: block;
}
@font-face {
    font-family: 'Liberation Mono';
    src: url('/fonts/liberation/LiberationMono-BoldItalic.ttf') format('truetype');
    font-weight: 700;
    font-style:  italic;
    font-display: block;
}
```

- [ ] **Step 2: Import `fonts.css` from `styles.css`**

Read `frontend/src/editor/styles.css` first, then add the import line at the very top so the `@font-face` declarations register before any consumer:

```css
/* frontend/src/editor/styles.css — top of file */
@import './editor/fonts.css';
@import './styles/tokens.css';
@import './styles/layout.css';
/* … existing imports … */
```

- [ ] **Step 3: Run dev server and verify font loads in DevTools Network**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000` in Chrome, open DevTools → Network → filter `Font`. Reload. You must see GET requests for the Liberation `.ttf` files returning 200.

- [ ] **Step 4: Verify `document.fonts.check` returns true after load**

In the browser console of the editor page:

```js
await document.fonts.ready;
document.fonts.check("16px 'Liberation Serif'")
```

Expected: `true`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/editor/editor/fonts.css frontend/src/editor/styles.css
git commit -m "feat(editor): declare @font-face for Liberation families"
```

---

## Task 4: Switch editor CSS tokens to Liberation and emit typography variables

**Files:**
- Modify: `frontend/src/editor/styles/tokens.css:54-72` (font tokens, content scale)
- Create: `frontend/src/editor/io/typography-css.ts`
- Modify: `frontend/src/editor/EditorHost.tsx`

Tokens must reference Liberation as the primary family (system fallback only as crash-safety). Editor.css derives heading sizes from CSS variables that are emitted from the typography manifest at module load — this prevents drift between manifest and styles.

- [ ] **Step 1: Modify `tokens.css` font and content variables**

Replace lines 53-72 in `frontend/src/editor/styles/tokens.css`:

```css
  /* ---------- Typography ---------- */
  /* Liberation is shipped via @font-face in editor/fonts.css. The fallback
     family is crash-safety only — Liberation must always win. */
  --font-display: 'Liberation Serif', Georgia, serif;
  --font-body:    'Liberation Serif', Georgia, serif;
  --font-ui:      'Liberation Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:    'Liberation Mono', Menlo, Consolas, monospace;

  /* Type scale (UI) — unchanged */
  --fs-xs:   12px;
  --fs-sm:   13px;
  --fs-base: 14px;
  --fs-md:   15px;
  --fs-lg:   16px;
  --fs-xl:   18px;
  --fs-2xl:  22px;
  --fs-3xl:  28px;
  --fs-display: 36px;

  /* Editor content scale — driven by typography manifest at runtime via
     editor/io/typography-css.ts. The values below are static fallbacks
     used before the runtime emit runs. */
  --content-fs:    16px;
  --content-lh:    1.5;
```

- [ ] **Step 2: Create `typography-css.ts` to emit CSS variables from the manifest**

```ts
// frontend/src/editor/io/typography-css.ts
import { TYPOGRAPHY, FONT_FAMILIES, ptToPx, type BlockKind } from './typography';

const VAR_BLOCKS: BlockKind[] = ['body', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'listItem'];

/**
 * Writes typography manifest values as CSS custom properties on :root.
 * Call once at app startup, before the editor mounts. Any later change
 * to TYPOGRAPHY in the manifest will be picked up via HMR.
 */
export function applyTypographyToCssVars(target: HTMLElement = document.documentElement): void {
    target.style.setProperty('--font-body', `'${FONT_FAMILIES.serif}', Georgia, serif`);
    target.style.setProperty('--font-ui',   `'${FONT_FAMILIES.sans}', -apple-system, sans-serif`);
    target.style.setProperty('--font-mono', `'${FONT_FAMILIES.mono}', Menlo, Consolas, monospace`);

    for (const kind of VAR_BLOCKS) {
        const t = TYPOGRAPHY[kind];
        target.style.setProperty(`--ed-${kind}-fs`, `${ptToPx(t.sizePt)}px`);
        target.style.setProperty(`--ed-${kind}-lh`, String(t.lineHeight));
        target.style.setProperty(`--ed-${kind}-fw`, t.bold ? '700' : '400');
        target.style.setProperty(`--ed-${kind}-fst`, t.italic ? 'italic' : 'normal');
        target.style.setProperty(`--ed-${kind}-mt`, `${ptToPx(t.spaceBeforePt)}px`);
        target.style.setProperty(`--ed-${kind}-mb`, `${ptToPx(t.spaceAfterPt)}px`);
        target.style.setProperty(`--ed-${kind}-indent`, `${ptToPx(t.indentPt)}px`);
    }

    target.style.setProperty('--content-fs', `${ptToPx(TYPOGRAPHY.body.sizePt)}px`);
    target.style.setProperty('--content-lh', String(TYPOGRAPHY.body.lineHeight));
}
```

- [ ] **Step 3: Call the emitter from `EditorHost.tsx`**

Read the current `EditorHost.tsx` first to find a sensible location. Add the import and a `useEffect` that runs once on mount before children render:

```tsx
// frontend/src/editor/EditorHost.tsx — top of imports
import { applyTypographyToCssVars } from '@/editor/io/typography-css';
```

Add inside the component, before any JSX returns child editor surfaces:

```tsx
useLayoutEffect(() => {
    applyTypographyToCssVars();
}, []);
```

If `EditorHost` is not a function component or already has a similar effect, adapt the location but keep the call before mounting Tiptap.

- [ ] **Step 4: Run dev server, verify CSS variables present**

```bash
cd frontend && npm run dev
```

Open the editor page. In DevTools console:

```js
getComputedStyle(document.documentElement).getPropertyValue('--font-body').trim()
getComputedStyle(document.documentElement).getPropertyValue('--ed-h1-fs').trim()
```

Expected:
- `--font-body` includes `Liberation Serif`
- `--ed-h1-fs` is `30px`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/editor/styles/tokens.css frontend/src/editor/io/typography-css.ts frontend/src/editor/EditorHost.tsx
git commit -m "feat(editor): emit typography CSS variables from manifest at startup"
```

---

## Task 5: Refactor `editor.css` heading and body rules to read from manifest variables

**Files:**
- Modify: `frontend/src/editor/editor/editor.css:46-145`

Currently each heading hardcodes its own `font-size`, `line-height`, `font-weight`, padding. Replace with the per-block CSS variables emitted in Task 4 so the manifest is the only place numbers exist.

- [ ] **Step 1: Replace `.prose-editor` block rules with variable-driven versions**

Edit `frontend/src/editor/editor/editor.css`. Replace the `.prose-editor`, headings, blockquote, lists, `pre`, `code` blocks with:

```css
.prose-editor {
    position: relative;
    z-index: 1;
    outline: none;
    font-family: var(--font-body);
    font-size: var(--ed-body-fs);
    line-height: var(--ed-body-lh);
    color: var(--text);
    font-feature-settings: 'kern', 'liga', 'onum', 'pnum';
}

.prose-editor > * {
    margin-top: 0;
}

.prose-editor p {
    margin: 0;
    padding-bottom: var(--ed-body-mb);
}

.prose-editor h1 {
    font-family: var(--font-body);
    font-size: var(--ed-h1-fs);
    font-weight: var(--ed-h1-fw);
    line-height: var(--ed-h1-lh);
    margin: 0;
    padding-top: var(--ed-h1-mt);
    padding-bottom: var(--ed-h1-mb);
    color: var(--text);
}

.prose-editor h2 {
    font-family: var(--font-body);
    font-size: var(--ed-h2-fs);
    font-weight: var(--ed-h2-fw);
    line-height: var(--ed-h2-lh);
    margin: 0;
    padding-top: var(--ed-h2-mt);
    padding-bottom: var(--ed-h2-mb);
    color: var(--text);
}

.prose-editor h3 {
    font-family: var(--font-body);
    font-size: var(--ed-h3-fs);
    font-weight: var(--ed-h3-fw);
    line-height: var(--ed-h3-lh);
    margin: 0;
    padding-top: var(--ed-h3-mt);
    padding-bottom: var(--ed-h3-mb);
    color: var(--text);
}

.prose-editor h4,
.prose-editor h5 {
    font-family: var(--font-body);
    font-size: var(--ed-h4-fs);
    font-weight: var(--ed-h4-fw);
    line-height: var(--ed-h4-lh);
    margin: 0;
    padding-top: var(--ed-h4-mt);
    padding-bottom: var(--ed-h4-mb);
    color: var(--text);
}

.prose-editor h6 {
    font-family: var(--font-body);
    font-size: var(--ed-h6-fs);
    font-weight: var(--ed-h6-fw);
    font-style: var(--ed-h6-fst);
    line-height: var(--ed-h6-lh);
    margin: 0;
    padding-top: var(--ed-h6-mt);
    padding-bottom: var(--ed-h6-mb);
    color: var(--text);
}

.prose-editor blockquote {
    position: relative;
    font-family: var(--font-body);
    font-size: var(--ed-blockquote-fs);
    font-style: var(--ed-blockquote-fst);
    line-height: var(--ed-blockquote-lh);
    margin: 0;
    padding: var(--ed-blockquote-mt) 0 var(--ed-blockquote-mb) var(--ed-blockquote-indent);
    color: var(--text-muted);
}

/* leave the existing ::before quote-mark rule unchanged */

.prose-editor ul,
.prose-editor ol {
    padding-left: var(--ed-listItem-indent);
    margin: 0;
    padding-bottom: var(--ed-body-mb);
}

.prose-editor li::marker {
    color: var(--text-muted);
}

.prose-editor pre {
    background: #16110d;
    color: var(--text-on-accent);
    padding: var(--sp-3) var(--sp-4);
    border-radius: var(--r-2);
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: var(--ed-code-fs);
    line-height: var(--ed-code-lh);
    margin: 0 0 var(--ed-code-mb);
}

.prose-editor code {
    font-family: var(--font-mono);
    font-size: 0.92em;
    background: var(--bg-tint);
    padding: 1px 5px;
    border-radius: var(--r-2);
}

.prose-editor pre code {
    background: transparent;
    padding: 0;
    font-size: inherit;
    border-radius: 0;
}
```

- [ ] **Step 2: Verify visually that the editor renders identically**

```bash
cd frontend && npm run dev
```

Open the editor. Headings should render at the same pixel sizes as before (30/22/18/16). Compare side-by-side with the previous build by stashing the change once if uncertain. Heading weights remain bold per the manifest.

- [ ] **Step 3: Run lint and typecheck**

```bash
cd frontend && npm run lint && npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/editor/editor/editor.css
git commit -m "refactor(editor): drive heading and body styles from typography manifest variables"
```

---

## Task 6: Pre-load Liberation fonts before editor mount

**Files:**
- Modify: `frontend/src/editor/EditorHost.tsx`

`PaginationPlus` measures the DOM to compute page boundaries. If it measures while a fallback font is rendering, the page math is wrong. Pre-loading via `document.fonts.load(...)` and awaiting the result guarantees the editor only mounts once Liberation is paint-ready.

- [ ] **Step 1: Read `EditorHost.tsx`**

```bash
cat frontend/src/editor/EditorHost.tsx
```

Identify where the editor child is rendered conditionally. We will gate it on a `fontsReady` state.

- [ ] **Step 2: Add font preload state**

Add at the top of imports:

```tsx
import { useEffect, useLayoutEffect, useState } from 'react';
import { FONT_VARIANTS } from '@/editor/io/typography';
```

Inside the component:

```tsx
const [fontsReady, setFontsReady] = useState(false);

useEffect(() => {
    let cancelled = false;
    Promise.all(
        FONT_VARIANTS.map((v) =>
            document.fonts.load(`${v.weight} ${v.style} 16px '${v.family}'`),
        ),
    ).then(() => {
        if (!cancelled) setFontsReady(true);
    });
    return () => { cancelled = true; };
}, []);
```

Wrap the existing editor render in a guard:

```tsx
if (!fontsReady) {
    return <div className="editor-shell editor-shell--loading" />;
}
// existing JSX returning the actual editor
```

(Keep the `applyTypographyToCssVars()` `useLayoutEffect` from Task 4 — it must still run on first render so `editor.css` variables are populated before the splash placeholder paints.)

- [ ] **Step 3: Verify the editor waits for fonts**

Throttle Network to "Slow 4G" in DevTools, hard-reload `http://localhost:3000`. The editor area should remain empty for ~1 second (fonts loading) then appear. Headings should render in Liberation Serif from the very first paint.

- [ ] **Step 4: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/editor/EditorHost.tsx
git commit -m "feat(editor): preload Liberation fonts before mounting Tiptap"
```

---

## Task 7: Add `docx.js` style builder driven by typography manifest

**Files:**
- Modify: `frontend/src/editor/io/typography.ts` (append style builder)
- Modify: `frontend/src/editor/io/typography.test.ts` (add coverage)

Builder returns the `IPropertiesOptions['styles']` shape `docx.js` accepts. Tested by inspecting the returned object.

- [ ] **Step 1: Add failing test for `buildDocxStyles`**

Append to `frontend/src/editor/io/typography.test.ts`:

```ts
import { buildDocxStyles, buildDocxPageProperties } from './typography';

describe('buildDocxStyles', () => {
    const styles = buildDocxStyles();

    it('default run uses Liberation Serif at 24 half-points (12pt body)', () => {
        const run = styles.default!.document!.run!;
        expect(run.font).toBe('Liberation Serif');
        expect(run.size).toBe(24);
    });

    it('default paragraph spacing is 360 line / 0 before / 160 after (twips)', () => {
        const para = styles.default!.document!.paragraph!;
        expect(para.spacing!.line).toBe(360);
        expect(para.spacing!.before).toBe(0);
        expect(para.spacing!.after).toBe(160);   // 8pt = 160 twips
    });

    it('Heading1 paragraph style overrides size to 45 half-points (22.5pt)', () => {
        const h1 = styles.paragraphStyles!.find((s) => s.id === 'Heading1');
        expect(h1).toBeDefined();
        expect(h1!.run!.size).toBe(45);
        expect(h1!.run!.bold).toBe(true);
    });

    it('Code paragraph style uses Liberation Mono', () => {
        const code = styles.paragraphStyles!.find((s) => s.id === 'Code');
        expect(code!.run!.font).toBe('Liberation Mono');
    });
});

describe('buildDocxPageProperties', () => {
    it('A4 size and 1440-twip margins', () => {
        const page = buildDocxPageProperties();
        expect(page.size!.width).toBe(11906);   // 595pt * 20
        expect(page.size!.height).toBe(16838);  // 842pt * 20
        expect(page.margin!.top).toBe(1440);    // 72pt * 20
    });
});
```

- [ ] **Step 2: Verify tests fail**

```bash
cd frontend && npx vitest run src/editor/io/typography.test.ts
```

Expected: FAIL — `buildDocxStyles` and `buildDocxPageProperties` not defined.

- [ ] **Step 3: Implement `buildDocxStyles` and `buildDocxPageProperties`**

Append to `frontend/src/editor/io/typography.ts`:

```ts
import type { IStylesOptions, IPageSizeAttributes, IPageMarginAttributes } from 'docx';

interface DocxPageProperties {
    size: IPageSizeAttributes;
    margin: IPageMarginAttributes;
}

export function buildDocxPageProperties(): DocxPageProperties {
    return {
        size: {
            width: ptToTwips(PAGE.widthPt),
            height: ptToTwips(PAGE.heightPt),
        },
        margin: {
            top: ptToTwips(PAGE.marginTopPt),
            bottom: ptToTwips(PAGE.marginBottomPt),
            left: ptToTwips(PAGE.marginLeftPt),
            right: ptToTwips(PAGE.marginRightPt),
        },
    };
}

const HEADING_STYLE_IDS: Record<'h1'|'h2'|'h3'|'h4'|'h5'|'h6', string> = {
    h1: 'Heading1', h2: 'Heading2', h3: 'Heading3',
    h4: 'Heading4', h5: 'Heading5', h6: 'Heading6',
};

function paragraphStyleFromBlock(id: string, kind: BlockKind, name: string) {
    const t = TYPOGRAPHY[kind];
    return {
        id,
        name,
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: {
            font: FONT_FAMILIES[t.family],
            size: ptToHalfPoints(t.sizePt),
            bold: t.bold || undefined,
            italics: t.italic || undefined,
        },
        paragraph: {
            spacing: {
                line: lineHeightTo240ths(t.lineHeight),
                before: ptToTwips(t.spaceBeforePt),
                after: ptToTwips(t.spaceAfterPt),
            },
            indent: t.indentPt > 0 ? { left: ptToTwips(t.indentPt) } : undefined,
        },
    };
}

export function buildDocxStyles(): IStylesOptions {
    const body = TYPOGRAPHY.body;
    return {
        default: {
            document: {
                run: {
                    font: FONT_FAMILIES[body.family],
                    size: ptToHalfPoints(body.sizePt),
                },
                paragraph: {
                    spacing: {
                        line: lineHeightTo240ths(body.lineHeight),
                        before: ptToTwips(body.spaceBeforePt),
                        after: ptToTwips(body.spaceAfterPt),
                    },
                },
            },
        },
        paragraphStyles: [
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h1, 'h1', 'Heading 1'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h2, 'h2', 'Heading 2'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h3, 'h3', 'Heading 3'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h4, 'h4', 'Heading 4'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h5, 'h5', 'Heading 5'),
            paragraphStyleFromBlock(HEADING_STYLE_IDS.h6, 'h6', 'Heading 6'),
            paragraphStyleFromBlock('IntenseQuote', 'blockquote', 'Intense Quote'),
            paragraphStyleFromBlock('Code', 'code', 'Code'),
        ],
    };
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/editor/io/typography.test.ts
```

Expected: PASS, all tests green.

- [ ] **Step 5: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/editor/io/typography.ts frontend/src/editor/io/typography.test.ts
git commit -m "feat(io): build docx.js style config from typography manifest"
```

---

## Task 8: Embed fonts and apply styles in DOCX exporter

**Files:**
- Modify: `frontend/src/editor/io/docx.ts` (whole file)

Three changes: (1) fetch + cache `.ttf` bytes once per session, (2) pass `fonts:` to the Document constructor, (3) replace inline twips constants and `HeadingLevel`-based mapping with the typography-driven style builder. Per-run `font` and `size` are set explicitly.

- [ ] **Step 1: Add font byte loader at the top of `docx.ts`**

Replace the imports and constants at the top of `frontend/src/editor/io/docx.ts` (lines 1-20) with:

```ts
import {
    Document,
    Header,
    Footer,
    Packer,
    Paragraph,
    TextRun,
    AlignmentType,
    ExternalHyperlink,
    PageNumber,
    TabStopType,
} from 'docx';
import type { Editor } from '@tiptap/react';
import {
    FONT_FAMILIES,
    FONT_VARIANTS,
    TYPOGRAPHY,
    buildDocxStyles,
    buildDocxPageProperties,
    ptToHalfPoints,
    ptToTwips,
    type BlockKind,
} from '@/editor/io/typography';

let fontBytesCache: Promise<Array<{ name: string; data: ArrayBuffer }>> | null = null;

async function loadFontBytes(): Promise<Array<{ name: string; data: ArrayBuffer }>> {
    if (!fontBytesCache) {
        fontBytesCache = Promise.all(
            FONT_VARIANTS.map(async (v) => {
                const resp = await fetch(v.file);
                if (!resp.ok) throw new Error(`Failed to load font ${v.file}: ${resp.status}`);
                return { name: v.family, data: await resp.arrayBuffer() };
            }),
        );
    }
    return fontBytesCache;
}

const HEADING_STYLE: Record<number, string> = {
    1: 'Heading1', 2: 'Heading2', 3: 'Heading3',
    4: 'Heading4', 5: 'Heading5', 6: 'Heading6',
};

function pageProperties() {
    const p = buildDocxPageProperties();
    return { page: { size: p.size, margin: p.margin } };
}

const CONTENT_WIDTH_TWIPS =
    ptToTwips(595) - ptToTwips(72) * 2;  // A4 width minus 1in margins each side
```

(Keep existing `JSONNode`, `ExportOptions`, `alignment` definitions — they don't change.)

- [ ] **Step 2: Update `inlinesToRuns` to set explicit font and size on every run**

Replace the function body (lines ~46-73 of the current file):

```ts
function inlinesToRuns(
    nodes: JSONNode[] | undefined,
    opts: ExportOptions,
    blockKind: BlockKind = 'body',
): (TextRun | ExternalHyperlink)[] {
    if (!nodes) return [];
    const t = TYPOGRAPHY[blockKind];
    const runs: (TextRun | ExternalHyperlink)[] = [];
    for (const n of nodes) {
        if (n.type !== 'text') continue;
        const marks = n.marks ?? [];
        const isDeletion = marks.some((m) => m.type === 'deletion');
        const isInsertion = marks.some((m) => m.type === 'insertion');
        if (opts.acceptSuggestions && isDeletion) continue;

        const run = new TextRun({
            text: n.text ?? '',
            font: FONT_FAMILIES[t.family],
            size: ptToHalfPoints(t.sizePt),
            bold: t.bold || marks.some((m) => m.type === 'bold'),
            italics: t.italic || marks.some((m) => m.type === 'italic'),
            underline: marks.some((m) => m.type === 'underline') ? {} : undefined,
            strike: marks.some((m) => m.type === 'strike') && !opts.acceptSuggestions ? true : undefined,
            color: !opts.acceptSuggestions
                ? isDeletion ? '9CA3AF' : isInsertion ? '15803D' : undefined
                : undefined,
        });
        const link = marks.find((m) => m.type === 'link');
        if (link) {
            runs.push(new ExternalHyperlink({ link: (link.attrs?.href as string) ?? '#', children: [run] }));
        } else {
            runs.push(run);
        }
    }
    return runs;
}
```

- [ ] **Step 3: Update `blockToParagraphs` to apply `style` and pass block kind to `inlinesToRuns`**

Replace the function:

```ts
function blockToParagraphs(node: JSONNode, opts: ExportOptions): Paragraph[] {
    switch (node.type) {
        case 'paragraph':
            return [new Paragraph({
                alignment: alignment(node.attrs),
                children: inlinesToRuns(node.content, opts, 'body'),
            })];
        case 'heading': {
            const level = (node.attrs?.level as number) ?? 1;
            const styleId = HEADING_STYLE[level] ?? 'Heading1';
            const kind = `h${level}` as BlockKind;
            return [new Paragraph({
                style: styleId,
                alignment: alignment(node.attrs),
                children: inlinesToRuns(node.content, opts, kind),
            })];
        }
        case 'blockquote':
            return (node.content ?? []).map((c) => new Paragraph({
                style: 'IntenseQuote',
                children: inlinesToRuns(c.content, opts, 'blockquote'),
            }));
        case 'bulletList':
            return (node.content ?? []).flatMap((li) =>
                (li.content ?? []).map((c) => new Paragraph({
                    bullet: { level: 0 },
                    children: inlinesToRuns(c.content, opts, 'listItem'),
                })),
            );
        case 'orderedList':
            return (node.content ?? []).flatMap((li, i) =>
                (li.content ?? []).map((c) => new Paragraph({
                    children: [
                        new TextRun({
                            text: `${i + 1}. `,
                            font: FONT_FAMILIES[TYPOGRAPHY.listItem.family],
                            size: ptToHalfPoints(TYPOGRAPHY.listItem.sizePt),
                        }),
                        ...inlinesToRuns(c.content, opts, 'listItem'),
                    ],
                })),
            );
        case 'taskList':
            return (node.content ?? []).flatMap((li) => {
                const checked = li.attrs?.checked ? '☑' : '☐';
                return (li.content ?? []).map((c) => new Paragraph({
                    children: [
                        new TextRun({
                            text: `${checked} `,
                            font: FONT_FAMILIES[TYPOGRAPHY.listItem.family],
                            size: ptToHalfPoints(TYPOGRAPHY.listItem.sizePt),
                        }),
                        ...inlinesToRuns(c.content, opts, 'listItem'),
                    ],
                }));
            });
        case 'codeBlock':
            return [new Paragraph({
                style: 'Code',
                children: [new TextRun({
                    text: node.content?.[0]?.text ?? '',
                    font: FONT_FAMILIES[TYPOGRAPHY.code.family],
                    size: ptToHalfPoints(TYPOGRAPHY.code.sizePt),
                })],
            })];
        case 'horizontalRule':
            return [new Paragraph({
                border: { bottom: { color: '999999', style: 'single', size: 6, space: 1 } },
                children: [],
            })];
        default:
            return [new Paragraph({ children: inlinesToRuns(node.content, opts, 'body') })];
    }
}
```

- [ ] **Step 4: Update `parseHfTokens` and `buildHfParagraph` to use Liberation Serif**

Replace those two helpers:

```ts
function parseHfTokens(text: string): TextRun[] {
    const plain = text.replace(/<[^>]+>/g, '').trim();
    if (!plain) return [];
    const parts = plain.split(/(\{page\}|\{total\})/);
    const baseProps = {
        font: FONT_FAMILIES.serif,
        size: ptToHalfPoints(TYPOGRAPHY.body.sizePt),
    };
    return parts.flatMap((part): TextRun[] => {
        if (part === '{page}') return [new TextRun({ ...baseProps, children: [PageNumber.CURRENT] })];
        if (part === '{total}') return [new TextRun({ ...baseProps, children: [PageNumber.TOTAL_PAGES] })];
        return part ? [new TextRun({ ...baseProps, text: part })] : [];
    });
}

function buildHfParagraph(left: string, right: string): Paragraph {
    const leftRuns = parseHfTokens(left);
    const rightRuns = parseHfTokens(right);
    return new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_WIDTH_TWIPS }],
        children: [...leftRuns, ...(rightRuns.length > 0 ? [new TextRun({ text: '\t' }), ...rightRuns] : [])],
    });
}
```

- [ ] **Step 5: Update `editorToDocxBlob` to load fonts and apply styles**

Replace the function:

```ts
export async function editorToDocxBlob(
    editor: Editor,
    opts: ExportOptions = { acceptSuggestions: true },
): Promise<Blob> {
    const json = editor.getJSON() as JSONNode;
    const paragraphs: Paragraph[] = (json.content ?? []).flatMap((b) => blockToParagraphs(b, opts));

    const headerLeft = opts.headerLeft ?? '';
    const headerRight = opts.headerRight ?? '';
    const footerLeft = opts.footerLeft ?? '';
    const footerRight = opts.footerRight ?? '';

    const fonts = await loadFontBytes();

    const doc = new Document({
        fonts,
        styles: buildDocxStyles(),
        sections: [{
            properties: pageProperties(),
            headers: headerLeft || headerRight
                ? { default: new Header({ children: [buildHfParagraph(headerLeft, headerRight)] }) }
                : undefined,
            footers: footerLeft || footerRight
                ? { default: new Footer({ children: [buildHfParagraph(footerLeft, footerRight)] }) }
                : undefined,
            children: paragraphs,
        }],
    });
    return Packer.toBlob(doc);
}
```

- [ ] **Step 6: Remove the now-unused `HeadingLevel` import**

The import block at the top no longer needs `HeadingLevel`. Confirm by searching for usage:

```bash
grep -n "HeadingLevel" frontend/src/editor/io/docx.ts
```

Expected: no matches. If any remain, remove the corresponding usage.

- [ ] **Step 7: Run typecheck**

```bash
cd frontend && npm run typecheck
```

Expected: PASS. If `IPageSizeAttributes` or `IPageMarginAttributes` aren't exported by your `docx` version, fall back to typing them as `Record<string, number>` in `typography.ts` — they are emitted as plain objects by `docx.js`.

- [ ] **Step 8: Run lint**

```bash
cd frontend && npm run lint
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/editor/io/docx.ts
git commit -m "feat(io): embed Liberation fonts and apply typography styles in DOCX export"
```

---

## Task 9: Manual verification against acceptance criteria

**Files:** none (verification only)

These are the spec's acceptance criteria. All must pass before declaring sub-project 1 complete.

- [ ] **Step 1: Editor renders in Liberation**

Start dev server (`npm run dev`), open the editor. In DevTools console:

```js
getComputedStyle(document.querySelector('.prose-editor')).fontFamily
```

Expected: starts with `"Liberation Serif"`.

Temporarily comment out the first `@font-face` rule in `frontend/src/editor/editor/fonts.css`, hard reload. The body must visibly fall back to Georgia / serif (proves Liberation was actually doing the work, not just listed). Restore the rule.

- [ ] **Step 2: Build a sample document**

In the editor, type or paste a document containing each of: H1, H2, H3, H4, H5, H6, body paragraph, blockquote, bullet list (3 items), ordered list (3 items), code block (3 lines), inline `code`, **bold**, *italic*, <u>underline</u>, a link, page-numbered footer (default `{page}`).

- [ ] **Step 3: Export DOCX**

Use the editor's Export menu → DOCX. Save the file as `sample.docx`.

- [ ] **Step 4: Verify embedded fonts in the .docx**

```bash
unzip -l sample.docx | grep -E '(fontTable|fonts/)'
```

Expected: lines for `word/fontTable.xml` and embedded font parts under `word/fonts/` (Word writes obfuscated copies — `.odttf` extensions are normal).

```bash
unzip -p sample.docx word/fontTable.xml | grep -i 'liberation'
```

Expected: at least three matches — Liberation Serif, Liberation Sans, Liberation Mono.

- [ ] **Step 5: Open in Microsoft Word**

Open `sample.docx` in Microsoft Word (Mac or Windows). File → Properties → Fonts (or "Embed Fonts" dialog): only Liberation Serif/Sans/Mono should appear. No system fonts leaked. Heading sizes, line heights, body proportions should match the editor.

- [ ] **Step 6: Open in LibreOffice Writer**

Open `sample.docx` in LibreOffice Writer. Same document should render with Liberation fonts; no font-substitution dialog. Visually compare against Word — should be identical.

- [ ] **Step 7: Open in Apple Pages**

Open `sample.docx` in Apple Pages. Same expectation; Pages may show a one-time "missing fonts" dialog the first time but should resolve to the embedded copies.

- [ ] **Step 8: Side-by-side screenshot comparison**

Take a screenshot of the editor's page 1 at 100% zoom. Take a screenshot of Word's view of `sample.docx` page 1 at 100% zoom. Overlay in any image tool (or place side-by-side). Heading sizes, line baselines, margins, list indents must align within ~2px.

- [ ] **Step 9: Grep for hardcoded font/size leaks**

```bash
grep -nE "(Source Serif|IBM Plex|font-size:\s*[0-9]+px)" frontend/src/editor/editor/editor.css frontend/src/editor/io/docx.ts frontend/src/editor/styles/tokens.css
```

Expected: zero font-name matches outside Liberation. Acceptable: UI-scale font-sizes (`--fs-*`) defined in `tokens.css`. No hardcoded heading/body sizes inside `editor.css`.

- [ ] **Step 10: Mark complete**

If all checks pass, sub-project 1 is done. Notify the user with the verification summary so they can review before sub-project 2.

---

## Self-Review Notes

- **Spec coverage:** every numbered point in the spec's "Architecture" + "Acceptance Criteria" maps to at least one task: typography manifest (Task 2), font assets (Task 1), `@font-face` (Task 3), CSS variables (Task 4), editor.css refactor (Task 5), pre-load (Task 6), `docx.js` styles + embedding (Tasks 7–8), all six acceptance checks (Task 9).
- **No placeholders:** all code blocks contain runnable code; commands have expected output stated.
- **Type consistency:** `BlockKind`, `FontKey`, `BlockTypography`, `FontVariant` are defined once in Task 2 and reused identically in Tasks 7–8.
