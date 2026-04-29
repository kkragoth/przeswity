# Comments UI Redesign — Focus Mode & Thread Polish

**Date:** 2026-04-28  
**Scope:** `frontend/src/editor/comments/CommentsSidebar.tsx` + `comments.css`

---

## Goal

Improve the comments sidebar UX by making thread management clearer and more intentional. The key idea: when you engage with a thread it takes *focus* — the rest of the list steps back visually so you can read and respond without distraction.

---

## Changes

### 1. Filter chips (replace `<select>`)

Replace the three `<select>` dropdowns for status/author/role with pill chips for the status filter (the primary action). Author and role filters remain as `<select>` but styled consistently.

- Chips: `Open · N`, `Resolved`, `All`
- Active chip: oxblood fill (`--accent` bg, white text)
- Inactive: white bg, border, muted text

### 2. Focus mode — dim inactive threads

When `activeCommentId` is set, threads that are not active render at `opacity: 0.45`. On hover they recover to `0.75`. This is a CSS-only rule on `.sidebar-comments.has-active .thread:not(.is-active)`.

The `has-active` class is toggled on the sidebar wrapper whenever `activeCommentId !== null`.

### 3. Avatar ring on active thread

`.thread.is-active .avatar` gets `box-shadow: 0 0 0 2px white, 0 0 0 3.5px var(--accent)` — a double ring that reads clearly against any avatar background color.

### 4. Quote accent on active thread

`.thread.is-active .thread-quote` shifts from plain `--bg-tint` fill to a left-to-right gradient (`--accent-soft` → `--bg-tint`) and the left border switches from `--border-strong` to `--accent`. Also expands to multi-line (removes `white-space: nowrap`).

### 5. Resolve button in thread header

Move the resolve button from the reply-box action row into `.thread-head-aside`, visible only on the active thread (`is-active`). This makes the primary action immediately accessible without opening the reply box.

The old resolve button in the reply footer is removed (no duplication).

### 6. Explicit close (X) button

A small circular close button appears in `.thread-head-aside` when the thread is active. Clicking it calls `onActiveCommentChange(null)`, collapsing the thread and clearing focus mode. This makes collapse intentional and discoverable.

### 7. CSS Grid row animation (replace `maxHeight` hack)

Replace the `maxHeight: 1600 / 0` inline style toggle with a CSS grid row animation:

```css
.thread-expandable {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s cubic-bezier(0.22, 0.61, 0.36, 1);
}
.thread.is-active .thread-expandable {
  grid-template-rows: 1fr;
}
.thread-expandable > * {
  min-height: 0;
  overflow: hidden;
}
```

The `opacity` transition on the expandable is kept for the fade effect.

### 8. Reply input always visible when expanded

Remove the `openReply` state and the separate "Reply" button that gates the input. When a thread is active and has a body, the reply textarea is always shown at the bottom of the expanded section. The send button is a small icon button (↑) rather than a labelled "Reply" button.

The `openReply` state and `setOpenReply` are deleted from `CommentsSidebar`.

---

## Files Touched

| File | Change |
|------|--------|
| `CommentsSidebar.tsx` | Remove `openReply` state; add `has-active` class to wrapper; move resolve btn to head; add close btn; always-show reply input |
| `comments.css` | Chip styles; focus-mode opacity rules; avatar ring; quote gradient; grid-row animation; send btn style |

---

## Out of Scope

- Author/role filter chips (still `<select>` for now — too many values for chips)
- Keyboard navigation between threads
- Bulk resolve actions
- Dark mode adjustments (tokens already defined, will inherit correctly)
