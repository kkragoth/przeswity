# DOCX 1:1 Parity — Roadmap

**Date:** 2026-04-28
**Status:** Approved
**Type:** Roadmap (not an implementable spec — declares ordering and shared constraints for six sub-project specs)

## Goal

Produce DOCX exports that match what users see in the editor, on two axes:

- **A. Visual fidelity** — same fonts, sizes, line heights, margins, paragraph spacing, list indents.
- **B. Layout fidelity** — same page boundaries (line N on page X in browser ≈ line N on page X in DOCX) within ±0–1 line drift per page.

Pixel-perfect glyph alignment (C) is explicitly out of scope: DOCX is reflowable and Word's text shaper differs from the browser's. The ±0–1 line ceiling is the realistic target for a `.docx` export.

Verification is **manual cross-viewer review** (Word + LibreOffice + Pages). No CI visual-regression infra in scope.

---

## Hard Constraints (apply to every sub-project)

1. **Font allowlist:** Liberation Serif (body, headings), Liberation Sans (optional body alt), Liberation Mono (code). All four weights (Regular/Bold/Italic/BoldItalic) per family. **Fully embedded** in DOCX, served via `@font-face` in browser. No system-font fallbacks beyond crash-safety generics.
2. **Single source of truth for typography.** One module exports family/size/line-height/spacing/indent constants. Both CSS and `docx.js` configs derive from it. No hand-synced numbers.
3. **Word-native semantics.** Track changes export as `w:ins`/`w:del`, comments as `w:comment`, footnotes as real footnotes, TOC as `TOC` field, lists as `w:numId`. No flattening to color/inline styling.
4. **Section model.** Per-section page setup, first-page-different, odd/even headers and footers must be representable in both editor and DOCX.
5. **Cross-viewer correctness.** Output must render identically in Microsoft Word, LibreOffice Writer, and Apple Pages. If any of the three diverges, the export is broken.

---

## Sub-projects

Each sub-project gets its **own spec → plan → implementation cycle**. Specs live alongside this file in `docs/superpowers/specs/`.

| # | Sub-project | Depends on | Notes |
|---|---|---|---|
| 1 | Font infrastructure | — | Foundation. Without shared metrics no other sub-project can claim parity. Spec: `2026-04-28-font-infrastructure-design.md`. |
| 2 | Editor section model | 1 | Section/header/footer/page-setup data model in Tiptap schema + Yjs. UI deferred to #3. Replaces single-section PaginationPlus assumption — likely needs PaginationPlus fork or replacement. |
| 3 | Page-break + section-break nodes + insertion UI | 2 | New Tiptap node types (`pageBreak`, `sectionBreak` with attrs), slash-menu / toolbar entry points, keyboard shortcut. PaginationPlus must honor them. |
| 4 | Word-native semantic upgrade | 1 | Track changes → `w:ins`/`w:del`, comments → `w:comment`, footnotes → real footnotes, TOC → `TOC \o` field, lists → `w:numId`/`w:abstractNumId`. Some require lower-level XML emission below `docx.js`'s public API. Independent of #2/#3 — could parallel them, kept sequential for review simplicity. |
| 5 | Tables + images parity | 1 | Column widths, borders, cell shading, merged cells, image dimensions in EMUs, anchoring (inline only — floating deferred). |
| 6 | Style polish | 1, 4 | Highlight mark (`w:highlight`/`w:shd`), glossary marks, code-block shading, blockquote indent + border, horizontal-rule styling. Cleanup pass — round-trippable styles. |

**Order rationale:** 1 first because it gates parity for everything else. 2 before 3 because UI without a data model is rework. 4 can in principle parallel 2/3 but its review surface is large and mixing it with section-model changes makes rollback hard. 5/6 are independent of each other but cheaper after 4 lands the styles-system pattern.

---

## What's Out of Scope for This Initiative

- User-facing font picker (could be a future sub-project; not required for parity).
- Floating image anchors (Word `wp:anchor`). Inline only.
- Word macros, ActiveX, embedded OLE.
- DOCX **import** parity. This roadmap is export-only.
- Visual regression CI. Manual review per the verification decision.
- PDF export. Separate concern.

---

## Done When

All six sub-projects are complete and their per-spec acceptance criteria pass. The combined manual review:

1. Sample document containing every editor feature exports cleanly.
2. Editor → Word: heading sizes, line heights, margins, list indents, table widths, image dimensions, headers/footers, comments, footnotes, TOC, page numbers — all visually align.
3. Page boundary drift ≤ 1 line per page across the sample document.
4. Round-trip safe: Word edits to comments/track-changes/footnotes don't corrupt the file.
