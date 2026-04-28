# Prześwity Editor — Stage 1

Collaborative publishing editor for the Prześwity publishing house. Built with:

- **Backend** — Node 22 + TypeScript + Express + Drizzle/Postgres + BetterAuth + Hocuspocus (Yjs WebSocket)
- **Frontend** — Vite + React + TanStack Router/Query + Zustand + Tailwind + shadcn + Tiptap (ported from `editor-poc/`)
- **Shared** — `@przeswity/editor-schema` workspace package for byte-identical Yjs↔ProseMirror schemas on both sides
- **Realtime** — Hocuspocus on `:8080/collaboration`, persisted in Postgres `book_yjs_state`
- **i18n** — Polish (primary), English, Ukrainian via `react-i18next`

See `plans/start.md` for the full Stage 1 plan.

## Repository layout

```
backend/                    # Express + Drizzle + BetterAuth + Hocuspocus
frontend/                   # Vite + React + TanStack + Tiptap editor
shared/editor-schema/       # @przeswity/editor-schema workspace package
editor-poc/                 # original Tiptap POC (reference; do not modify)
plans/start.md              # full Stage 1 implementation plan
docker-compose.dev.yml      # dev: db + shared sidecar + backend
docker-compose.deploy.yml   # deploy stub (D2 not implemented in Stage 1)
justfile                    # `just dev`, `just gen-api`, `just db-*`
```

## Quickstart

**Two terminals**:

### Terminal 1 — backend stack (db + backend in Docker)

```sh
just dev
```

Brings up:
- Postgres 16 on `localhost:5433` → container `db:5432`
- One-shot `installer` (npm install)
- `shared` sidecar — `tsc --watch` keeps `@przeswity/editor-schema/dist` warm
- `backend` — runs migrations + seed + `tsx watch` on `localhost:8080`

Cold boot ≈ 15 s. Wait for `backend listening on :8080 (collab: /collaboration)`.

### Terminal 2 — frontend (native, hot reload)

```sh
cd frontend
cp -n .env.example .env
npm run dev
```

Vite serves on `http://localhost:3000`.

> Browser cookies for BetterAuth: do NOT use `127.0.0.1` — use `localhost` everywhere so cookies are shared between `:3000` (frontend) and `:8080` (backend).

## Try it out

1. Open `http://localhost:3000/login`.
2. Use the **"Szybkie logowanie (dev)"** panel on the right to one-click sign in as any seeded user.
3. Role-aware redirect:
   - `admin@local.test` → `/admin/users`
   - `coord1@local.test`, `coord2@local.test` → `/coordinator`
   - everyone else → `/books`
4. Click any book card → opens the editor at `/books/<id>` connected via Hocuspocus.

## Seeded users

All accounts share the dev password `devseed1234` (used implicitly by the dev quick-login).

| Email                  | Role                   | Pinned color |
|-----------------------|------------------------|--------------|
| admin@local.test      | Admin                  | red          |
| coord1@local.test     | Coordinator (3 books)  | blue         |
| coord2@local.test     | Coordinator (1 book)   | sky          |
| editor1@local.test    | Editor                 | green        |
| editor2@local.test    | Editor                 | emerald      |
| proof1@local.test     | Proofreader            | purple       |
| trans1@local.test     | Translator             | amber        |
| type1@local.test      | Typesetter             | pink         |
| author1@local.test    | Author                 | violet       |

## Seeded books

| Title                       | Owner   | Assignments |
|----------------------------|---------|-------------|
| Geopolityka rzek           | coord1  | editor1 (editor), proof1 (proofreader), author1 (author) |
| Atlas wiatrów              | coord1  | trans1 (translator), editor2 (editor), proof1 (proofreader), type1 (typesetter) |
| Krótka historia chmur      | coord1  | editor1 (editor), proof1 (proofreader) |
| Notatki marginesu          | coord2  | editor2 (editor) |

## Environment variables

### Backend (`backend/.env`)

`backend/.env.example` is the template. Required for native runs; the compose service inlines its own env so editing `backend/.env` only matters when running outside compose.

| Variable               | Default                                              | Notes |
|-----------------------|------------------------------------------------------|-------|
| `NODE_ENV`            | `development`                                        | enum: `development \| test \| production` |
| `PORT`                | `8080`                                               |       |
| `DATABASE_URL`        | `postgres://przeswity:przeswity@db:5432/przeswity`   | use `localhost:5433` for native runs |
| `BETTER_AUTH_SECRET`  | (required, ≥32 chars)                                | `openssl rand -base64 32` |
| `BETTER_AUTH_URL`     | `http://localhost:8080`                              |       |
| `CORS_ORIGINS`        | `http://localhost:3000`                              | comma-separated |
| `COOKIE_DOMAIN`       | `''`                                                 | empty on localhost (browsers reject `Domain=localhost`) |
| `COOKIE_SECURE`       | `false`                                              | `true` only behind HTTPS |
| `PUBLIC_API_URL`      | `http://localhost:8080`                              |       |
| `COLLAB_PATH`         | `/collaboration`                                     |       |
| `ENABLE_DEV_AUTH`     | `true` in dev / **must be unset in production**     | guarded by NODE_ENV check |

### Frontend (`frontend/.env`)

| Variable           | Default                                    |
|-------------------|--------------------------------------------|
| `VITE_API_URL`    | `http://localhost:8080`                    |
| `VITE_COLLAB_URL` | `ws://localhost:8080/collaboration`        |

## Useful commands

```sh
just dev                  # full dev stack (db + backend in Docker)
just dev-down             # stop the stack (preserves data)
just db-up                # only the database
just gen-api              # regenerate frontend OpenAPI client from running backend
just db-seed              # idempotent re-seed
just db-reset             # nuke + re-migrate + re-seed
npm -w backend test       # backend vitest suite (51 tests)
npm -w frontend run typecheck
npm -w frontend run check-locales
```

## API reference

- Swagger UI: `http://localhost:8080/docs`
- Raw spec: `http://localhost:8080/openapi.json`
- Operation IDs are enforced by a vitest — every registered path must have one.

## Known Stage-1 limitations

- **Suggest-only roles trust the client**. Proofreader / translator / author connect read-write at the WS layer; the editor's `SuggestionMode` extension wraps every keystroke into Insertion/Deletion marks before broadcasting. Stage 2 ships a server-side Yjs-update validator (placeholder file `backend/src/collab/suggestOnly.ts` not yet present; tracked in plan).
- **Single backend instance**. No Redis fan-out — one Hocuspocus process serves all books. Stage 2 adds `@hocuspocus/extension-redis` for horizontal scaling.
- **F5 polish deferred** (F5.5 AI suggestions wiring, F5.6 mention coverage, F5.7 style-only enforcement, F5.16 detached-comment detection, F5.17 ghost-mark cleanup, etc.). The editor functionally works; these are quality-of-life refinements.
- **F6 permission UI gating deferred**. The backend enforces every permission via REST + Hocuspocus auth; the frontend currently hands every authenticated user the full editor UI. Editing UI gating per role lands in F6.
- **Deploy stack (D2) not implemented**. `docker-compose.deploy.yml` is a stub. The dev stack is the only supported runtime in Stage 1.

## License

MIT (private repo).
