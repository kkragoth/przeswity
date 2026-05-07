# Extending the editor

Recipes for adding common features. Each recipe is end-to-end: schema →
extension → wiring → tests → i18n. If you're new to Tiptap, read
`docs/intro.md` §2 first.

> Before extending, decide where the feature belongs:
> - **In-document data, collaborative** → `Y.Doc` + a Tiptap mark/node
> - **In-document highlight, NOT collaborative** → ProseMirror decorations
> - **Out-of-document UI state** → Zustand store (`session/`, `live`, `pane`)
> - **Server-persisted, not realtime** → REST module under `backend/src/modules/`

---

## Recipe 1 — Add an inline mark (e.g. underline-with-style)

A *mark* is inline (bold, italic, comment). For block-level features see
Recipe 2.

### 1.1 — Define the frontend mark

The frontend's runtime schema is whatever `buildExtensions` returns in
`editor/tiptap/extensions.ts`. Define the mark once, register it there.

```ts
// frontend/src/editor/tiptap/extensions/Strikethrough.ts
import { Mark, mergeAttributes } from '@tiptap/core';

export const Strikethrough = Mark.create({
  name: 'strikethrough',
  parseHTML: () => [{ tag: 's' }, { tag: 'del' }, { style: 'text-decoration:line-through' }],
  renderHTML: ({ HTMLAttributes }) => ['s', mergeAttributes(HTMLAttributes), 0],
  addCommands() {
    return {
      toggleStrikethrough: () => ({ commands }) => commands.toggleMark('strikethrough'),
    };
  },
  addKeyboardShortcuts() {
    return { 'Mod-Shift-x': () => this.editor.commands.toggleStrikethrough() };
  },
});
```

Register in `editor/tiptap/extensions.ts` → `buildExtensions`:

```ts
import { Strikethrough } from '@/editor/tiptap/extensions/Strikethrough';
// inside buildExtensions(...):
return [ /* … */, Strikethrough, /* … */ ];
```

### 1.2 — Mirror in the shared schema (only if it round-trips)

The shared package (`shared/editor-schema/`) drives **Markdown export**,
**DOCX export validators**, and **seed-from-Markdown** on the backend.
If your mark needs to survive any of those round-trips, mirror it there.
If it's a pure client visual (a soft highlight, a UI-only decoration),
skip this step.

```ts
// shared/editor-schema/src/index.ts — schema-only definition
import { Mark, mergeAttributes } from '@tiptap/core';
export const Strikethrough = Mark.create({
  name: 'strikethrough',
  parseHTML: () => [{ tag: 's' }, { tag: 'del' }, { style: 'text-decoration:line-through' }],
  renderHTML: ({ HTMLAttributes }) => ['s', mergeAttributes(HTMLAttributes), 0],
});
// Add it to whichever buildSchema/extensions list this file exports.
```

Rebuild after editing the shared package:
```sh
npm -w @przeswity/editor-schema run build   # `just dev` does this via sidecar
```

> The two definitions live in two packages and are aligned **by hand**.
> Until backend + shared move to Tiptap 3 and import the frontend's
> extensions directly, drift is a real risk — keep `parseHTML` /
> `renderHTML` byte-identical between them.

### 1.3 — Add UI affordances

- Toolbar button: edit `editor/tiptap/toolbar/TextFormattingZone.tsx`.
- Slash command: append to `SLASH_ITEMS` in `editor/tiptap/slash/slashCommandList.ts`.
- Bubble menu: edit `editor/tiptap/canvas/BubbleToolbar.tsx`.

### 1.4 — i18n

Add the button label / aria text to all three locale files:

```jsonc
// public/locales/{en,pl,ua}/translation.json
{ "toolbar": { "strikethrough": "Strikethrough" /* / "Przekreślenie" / "Закреслення" */ } }
```

Run `npm -w frontend run check-locales` to verify.

### 1.5 — Test

`editor/tiptap/extensions/__tests__/Strikethrough.test.ts` — assert the
mark round-trips through HTML (parse → render) and that the command toggles.

---

## Recipe 2 — Add a node (block)

Same flow as a mark, but `Node.create` instead of `Mark.create`. Two
extra concerns:

- **`parseDOM` / `toDOM`** must be lossless and stable. If a custom node
  serializes to `<div data-foo>` and you later add an attribute, every
  existing document still has to parse cleanly.
- **`group: 'block'`** + appropriate `content` spec. Use existing nodes as
  reference: `Footnote.ts` for an inline atom, `TableOfContents.ts` for a
  block node with custom rendering.

### Schema migration

Yjs documents are forward-only — there's no migration framework. If you
remove or rename a node type:

1. Keep the old type spec in the schema for at least one release. Mark it
   deprecated.
2. Write a one-shot script that loads each `book_yjs_state` row, applies a
   ProseMirror transform, and writes back.
3. Only after backfill complete: remove the old spec.

Alternatively, prefer **adding a new attribute with a default** over
introducing a new node type — it costs nothing and never needs migration.

---

## Recipe 3 — Add a slash command

Edit `editor/tiptap/slash/slashCommandList.ts`:

```ts
{
  id: 'callout',
  title: 'Callout',
  hint: 'Boxed paragraph',
  icon: '!',
  keywords: ['callout', 'note', 'aside'],
  command: (e) => { e.chain().focus().toggleCallout().run(); },
},
```

The slash menu reads from this array — no other wiring needed. Async
commands are supported (`async (e) => { await … }`).

> Avoid `window.prompt`/`window.confirm` in slash commands. The two cases
> in the existing list (`fn`, `img`) are tracked for replacement with an
> injected dialog callback. Don't add new ones.

---

## Recipe 4 — Add a toolbar button

Per zone:

| Zone                           | File                                      |
|--------------------------------|-------------------------------------------|
| Block style dropdown           | `toolbar/StyleDropdown.tsx`               |
| Inline text formatting         | `toolbar/TextFormattingZone.tsx`          |
| Block-level (lists, quote, …)  | `toolbar/BlockFormattingZone.tsx`         |
| Inserts (image, table, …)      | `toolbar/InsertZone.tsx`                  |
| Special characters             | `toolbar/SpecialCharsMenu.tsx`            |
| File menu                      | `toolbar/FileMenu.tsx`                    |
| Zoom                           | `toolbar/ZoomControl.tsx`                 |

`Primitives.tsx` exports button atoms (`ToolbarButton`, `ModeToggle`).
Reach for those rather than ad-hoc `<button>`s.

---

## Recipe 5 — Add a side panel

1. Create the feature folder under `containers/editor/<feature>/` with the
   shape from `containers/editor/README.md`:
   ```
   <feature>/
     index.tsx
     components/      ← private to this feature
     hooks/
     <feature>.css
   ```
2. Mount the panel from `containers/editor/layout/RightPane.tsx` (or
   `LeftPane.tsx`) — add a tab entry that lazy-renders the panel.
3. If the feature owns Yjs state, write the ops in `editor/<feature>/`
   first; the React panel only consumes those ops.
4. i18n keys under `<feature>.*`.
5. Tests: a renderable harness in `<feature>/__tests__/` + ops tests.

> **Cross-feature reuse rule** — never import from another feature's
> `components/` folder. If you need to share, lift to `src/components/` or
> to `src/editor/<domain>/`.

---

## Recipe 6 — Add an extension that needs runtime context

Tiptap ProseMirror plugins fire synchronously inside event loops; closures
capturing React state go stale. Use the `EditorContextHandle` instead.

```ts
// extensions.ts — pass a getter, not a value
SlashCommand.configure({
  onTrigger: (info) => config.onSlashTrigger(info),
}),
GlossaryHighlight.configure({
  getEntries: () => config.getGlossaryEntries(),  // ← lazy read
}),
```

Then wire `getGlossaryEntries` to `ctx.get().glossary` in
`useEditorInit`. Update `EditorCtx` type if you're adding a new field.

---

## Recipe 7 — Add a REST endpoint

Under `backend/src/modules/<feature>/`:

```
router.ts        // POST/GET handlers, applies session middleware
service.ts       // drizzle calls, business logic
policy.ts        // assert helpers (assertCanXxx)
schemas.ts       // zod request/response schemas
openapi.ts       // OpenAPI registrations using ./schemas
```

Wire up:

1. Define schemas in `schemas.ts`.
2. Implement the handler in `router.ts`:
   - Resolve session: `const me = await requireUser(req)`.
   - Load access: `const access = await loadBookAccess(bookId, me); requireBookAccess(access);`.
   - Policy check from `policy.ts`.
   - Validate body with `schemas.ts` zod parser.
   - Call `service.ts`.
3. Register in `openapi.ts` with an `operationId` (CI enforces this).
4. Mount the router from `app.ts`.
5. Run `just gen-api` (with backend running) to refresh the frontend client.
6. Tests: `backend/tests/<feature>.test.ts`.

---

## Recipe 8 — Add a permission

Walk-through in `docs/permissions.md` "Adding a permission — checklist".

---

## Common pitfalls

- **Stale closures inside ProseMirror plugins.** Use `ctx.get()`, not
  captured variables. The bug looks like: feature works on first render,
  silently breaks on rerender or remote update.
- **Forgot to rebuild `@przeswity/editor-schema`.** Symptom: backend
  Markdown round-trip drops the new mark/node, or seeded books look
  wrong. Fix: `just dev` does this automatically; native runs need
  `npm -w @przeswity/editor-schema run build`.
- **Adding a Y.Doc top-level key without updating `docs/yjs-and-collab.md`.**
  Don't. Future you needs that table.
- **Skipping i18n on a new string.** CI fails on missing keys. Always edit
  all three `translation.json` files together.
- **Inline drizzle calls outside `service.ts`.** Belongs in service.
  Keeping data access centralised is what lets us migrate the DB later.
- **Cross-feature `components/` imports.** See "Cross-feature reuse rule"
  above. Promote to a shared location instead.
