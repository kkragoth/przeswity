# Contributing

Workflow rules for the Prześwity editor. Before your first PR, read:

- [`README.md`](README.md) — how to boot the stack
- [`docs/intro.md`](docs/intro.md) — Tiptap/Yjs primer + project tour
- [`docs/architecture.md`](docs/architecture.md) — three-layer architecture
- [`CLAUDE.md`](CLAUDE.md) — code-quality rules enforced in review

---

## Local setup

```sh
just dev                                # backend stack (db + shared + backend)
cd frontend && cp -n .env.example .env  # in another terminal
npm -w frontend run dev                 # frontend on :3000
```

See `README.md` for env vars, seeded users, and known gotchas
(`localhost` vs `127.0.0.1` for cookies, etc.).

---

## Branches & commits

- Branch from `main`. Use a short prefix and a descriptive name:
  `feat/strikethrough-mark`, `fix/comment-orphan-detection`,
  `refactor/split-threads-sidebar`.
- Conventional-style subject lines: `feat: …`, `fix: …`, `refactor: …`,
  `docs: …`, `chore: …`. Keep the first line under 70 chars; details go in
  the body.
- One concern per commit. The recent history (`git log`) has many
  refactor splits committed in isolation — match that cadence.
- Never force-push `main`. Branch force-pushes are fine for cleanups but
  ask before doing it on a shared branch.

---

## PR checklist

Before opening a PR, run **all** of these locally. CI runs them too, but
catching them locally saves a round-trip.

```sh
# Frontend
npm -w frontend run typecheck
npm -w frontend run lint
npm -w frontend test
npm -w frontend run check-locales

# Backend
npm -w backend run lint
npm -w backend test

# Shared (only if you touched it)
npm -w @przeswity/editor-schema run build
npm -w @przeswity/editor-schema test
```

In your PR description:

1. **What** — one paragraph, what changed and why.
2. **How to verify** — manual steps, the URL/feature to click, what to
   look for.
3. **Risk** — what's new, what's load-bearing, what to watch in production.

---

## OpenAPI / API client

If you changed any backend route signature, request schema, or response
shape:

1. Update `modules/<feature>/openapi.ts` (and `schemas.ts` if needed).
   Every route MUST have an `operationId` (a vitest enforces this).
2. With the backend running, regenerate the client:
   ```sh
   just gen-api
   ```
3. Commit `frontend/src/api/generated/` alongside the backend changes.
   These two MUST land in the same PR.

A drift between backend handlers and the generated client is the most
common source of silent type errors after a route refactor.

---

## i18n

Every user-visible string must use `t('namespace.key')`. When you touch a
file with hardcoded text, extract them to i18n keys at the same time.

Add translations in **all three** locale files together:

```
frontend/public/locales/en/translation.json
frontend/public/locales/pl/translation.json
frontend/public/locales/ua/translation.json
```

CI runs `npm -w frontend run check-locales` — a missing key in any locale
fails the build. Key naming convention is documented in `CLAUDE.md`.

---

## Schema changes (the editor schema)

The frontend runtime schema and the backend Markdown round-trip schema
are **two separate definitions** today. See
`shared/editor-schema/README.md` for the caveat. When you add or change a
mark/node:

- Frontend extension goes in `frontend/src/editor/tiptap/extensions/`.
- If it round-trips through Markdown/DOCX, mirror it in
  `shared/editor-schema/src/index.ts` and add a round-trip test.

Walkthrough: `docs/extending-the-editor.md` Recipe 1.

---

## Database changes

1. Edit `backend/src/db/schema.ts`.
2. Generate a migration: `npm -w backend run db:generate`.
3. **Read the generated SQL.** drizzle-kit produces drop+create on
   renames; if that's not what you wanted, hand-edit the migration.
4. Apply: `just db-migrate` (or `just db-reset` in dev).
5. Commit the schema edit + the new SQL file together.

---

## Code-quality rules (from `CLAUDE.md`)

These are enforced in review — internalize them:

- Files under ~250 LOC. >300 is a code smell that needs splitting.
- Use `@/` path aliases. Never `../` for cross-directory imports.
- Use TS string-valued enums (or `as const` objects) for finite domains,
  never bare string-literal unions or scattered string constants.
- Prefer ADTs (discriminated unions on `kind`) over optional-field bags.
- Pure functions with descriptive parameters > closures over ambient state.
- No comments that restate what the code does. Only WHY-comments for
  non-obvious behaviour, workarounds, or surprising invariants.
- Fix root causes, not symptoms.

---

## Adding documentation

- Cross-cutting docs go under `docs/`.
- Per-package READMEs (`backend/`, `frontend/`, `shared/editor-schema/`)
  cover what's specific to running and extending that package.
- Per-feature READMEs (e.g. `frontend/src/containers/editor/README.md`)
  cover the architecture *inside* a complex module.
- Update the relevant doc in the **same PR** as the code change. Stale
  docs are worse than missing ones.

---

## When something is unclear

- Three-layer architecture or naming → `docs/architecture.md`.
- Y.Doc shape, ops rules → `docs/yjs-and-collab.md`.
- Permissions, who-can-do-what → `docs/permissions.md`.
- Specific recipe → `docs/extending-the-editor.md`.
- Editor typography/spacing → `docs/editor-styling.md`.
- Coding conventions → `CLAUDE.md`.

If you can't find an answer, ask in the PR description — we'll add it to
the right doc.
