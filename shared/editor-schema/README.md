# @przeswity/editor-schema

Tiptap-flavoured ProseMirror schema + Markdown ↔ Y.Doc round-trip,
shipped as an internal workspace package.

> **Currently consumed only by the backend.** Despite the name and the
> aspirational framing in early commits, the frontend does **not** import
> from this package — it builds its runtime schema directly via Tiptap 3
> in `frontend/src/editor/tiptap/extensions.ts::buildExtensions`. See
> "Two-source-of-truth caveat" below.

---

## What this package provides

| Export                        | From            | Used for                                               |
|-------------------------------|-----------------|--------------------------------------------------------|
| `buildSchemaExtensions()`     | `index.ts`      | A list of Tiptap extensions matching the editor schema |
| `buildProseMirrorSchema()`    | `index.ts`      | A configured `prosemirror-model` Schema                |
| `PROSEMIRROR_FIELD = 'default'` | `index.ts`    | The Y.XmlFragment name that hosts the prose document   |
| `ALLOWED_FONTS`, `FontFamily` | `index.ts`      | Allowed `data-font` values + the `fontFamily` mark     |
| `markdownToYDocState(md)`     | `markdown.ts`   | Markdown → binary Y.Doc state (used to seed books)     |
| `yDocStateToMarkdown(state)`  | `markdown.ts`   | Reverse for Markdown export                            |

The schema covers: `StarterKit`, `Underline`, `Link`, `TextAlign`,
`Highlight`, `Image`, `Table` family, `TaskList`/`TaskItem`, plus three
project marks (`fontFamily`, `comment`, `insertion`/`deletion` track-changes).

---

## Where it's used

```
backend/src/seed/seedBooks.ts          markdownToYDocState (initial state)
backend/src/seed/seedThreads.ts        buildProseMirrorSchema, PROSEMIRROR_FIELD
backend/src/modules/books/service.ts   markdownToYDocState
backend/src/modules/books/router.ts    yDocStateToMarkdown (export)
```

That's the full consumer list at time of writing. **Search before assuming
the frontend is using it.**

---

## Build

```sh
npm -w @przeswity/editor-schema run build       # one-shot tsc
npm -w @przeswity/editor-schema run dev         # tsc --watch (used by compose sidecar)
```

The dev compose stack runs the watch task as the `shared` sidecar so the
backend always boots against the latest schema build. Native backend runs
need a manual rebuild after every schema change.

`tsc` emits `dist/`. Backend's `package.json` resolves
`@przeswity/editor-schema` to that `dist/` via npm workspaces.

---

## Two-source-of-truth caveat

| Side             | Schema location                                 | Tiptap version |
|------------------|-------------------------------------------------|----------------|
| **Frontend** runtime editing  | `frontend/src/editor/tiptap/extensions.ts` | `^3`           |
| **Backend** Markdown export, seed | `shared/editor-schema/src/index.ts`     | `^2`           |

Yjs sync ignores schema (the wire format is binary updates of the
`Y.XmlFragment`), so the version skew works in practice. But:

- A new mark/node added to the **frontend** is invisible to the **backend's**
  Markdown round-trip until you mirror it here. Symptom: DOCX/Markdown
  export drops the formatting silently.
- A new mark/node added **here** has no UI affordance until the frontend
  registers a matching Tiptap extension and a toolbar/slash entry.
- `parseHTML`/`renderHTML` MUST stay byte-identical between the two
  definitions, otherwise round-trips lose attributes.

When extending, see `docs/extending-the-editor.md` Recipe 1 — it walks
through the two-step flow.

The long-term fix is to migrate backend + this package to Tiptap 3 and
import the frontend's extension list directly. Until then, keep the two
definitions aligned by hand.

---

## Markdown ↔ Y.Doc

`markdown.ts` bridges `prosemirror-markdown` (which uses snake_case node
names like `bullet_list`) and Tiptap's camelCase (`bulletList`) via a
hand-maintained mapping:

```ts
const PM_TO_TIPTAP = {
  bullet_list: 'bulletList',
  ordered_list: 'orderedList',
  list_item: 'listItem',
  code_block: 'codeBlock',
  horizontal_rule: 'horizontalRule',
  hard_break: 'hardBreak',
};
```

If you add a node type whose snake_case PM name differs from its Tiptap
name, extend that table.

`prosemirrorJSONToYDoc` / `yDocToProsemirrorJSON` come from `y-prosemirror`
and operate against the field name `PROSEMIRROR_FIELD = 'default'` —
matching the field that `@tiptap/extension-collaboration` uses on the
client.

---

## Testing

```sh
npm -w @przeswity/editor-schema test
```

Tests cover the Markdown round-trip (Markdown → Y → Markdown) for the node
types defined here. Add a case when you add a new node/mark.

---

## Adding to the schema — checklist

1. Define the mark/node in `src/index.ts`. Keep it pure schema — no
   commands, keymaps, or runtime concerns (those live in the frontend's
   Tiptap registration).
2. Add it to the `buildSchemaExtensions()` return list.
3. If its PM name differs from its Tiptap name (snake vs. camel), update
   the `PM_TO_TIPTAP` table in `markdown.ts`.
4. Add a Markdown round-trip test case.
5. `npm run build`.
6. Mirror in the frontend Tiptap extensions (commands/keymap/UI). See
   `docs/extending-the-editor.md` Recipe 1.
