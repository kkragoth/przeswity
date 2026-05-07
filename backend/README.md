# Backend

Node 22 + TypeScript + Express + Drizzle/Postgres + BetterAuth + Hocuspocus.

For architecture and the cross-cutting "how it all fits together", see
`docs/architecture.md`. This README covers what's specific to running and
extending the backend.

---

## Run

The backend is intended to run in the dev compose stack. From the repo root:

```sh
just dev          # db + shared sidecar + backend
just dev-down
```

Native run (rare — use it only if you've broken the compose stack):

```sh
just db-up                  # only the database
cp -n .env.example .env     # in backend/
npm -w backend run dev      # tsx watch
```

`backend` listens on `:8080`. WebSocket collab on `:8080/collaboration`.
Swagger UI on `:8080/docs`.

---

## Scripts

```
npm -w backend run dev          tsx watch src/index.ts
npm -w backend run build        tsc -p tsconfig.build.json
npm -w backend run start        node dist/index.js
npm -w backend run lint
npm -w backend test             vitest run

npm -w backend run db:generate  drizzle-kit generate (from schema.ts)
npm -w backend run db:migrate   apply pending migrations
npm -w backend run db:seed      idempotent re-seed
npm -w backend run db:reset     drop all + migrate + seed
npm -w backend run openapi:emit emit openapi.json (CI checks committed copy)
```

`just db-migrate` / `just db-seed` / `just db-reset` run the same scripts
inside the dev compose `backend` container.

---

## Layout

```
src/
├─ index.ts                bootstrap (HTTP server + WS upgrade)
├─ app.ts                  Express app wiring (CORS, body, auth, routers)
├─ env.ts                  zod-validated env (NODE_ENV, DATABASE_URL, …)
│
├─ auth/
│   betterAuth.config.ts   BetterAuth instance configuration
│   session.ts             AuthUser type + session helpers
│   devSignIn.ts           dev quick-login endpoint (gated by ENABLE_DEV_AUTH)
│
├─ collab/
│   server.ts              Hocuspocus instance + extensions
│   auth.ts                onAuthenticate: cookie → CollabContext
│   persistence.ts         load/store book_yjs_state
│   presence.ts            in-memory presence + heartbeat
│
├─ db/
│   schema.ts              Drizzle table definitions
│   auth-schema.ts         BetterAuth tables (user, session, account, …)
│   client.ts              pg pool + drizzle wrapper
│   projections.ts         Yjs → SQL projections (comments)
│   migrate.ts / reset.ts  scripts
│   migrations/            *.sql migrations
│
├─ lib/
│   permissions.ts         BookRole + Permissions, mergePermissions, …
│   access.ts              loadBookAccess + requireBookAccess (auth helper)
│   errors.ts              AppError + global error handler
│   errorCodes.ts          enum of error codes returned to clients
│   rateLimits.ts          express-rate-limit setups
│   openapi.ts             route registration helpers
│   log.ts                 pino logger
│   bytes.ts dto.ts        small utilities
│
├─ modules/<feature>/      every REST feature follows this shape:
│   router.ts              Express router; mounts handlers
│   service.ts             drizzle calls, business logic
│   policy.ts              assertCanXxx — permission checks
│   schemas.ts             zod request/response schemas
│   openapi.ts             OpenAPI registrations
│   dto.ts                 (optional) DB row → API payload mappers
│
├─ openapi/
│   registry.ts            zod-to-openapi registry singleton
│   docs.ts                Swagger UI mount
│   generate.ts            emit openapi.json
│
├─ seed/                   dev users, books, threads
└─ types/ws.d.ts           WebSocket type augmentation
```

Existing modules: `books`, `assignments`, `comments`, `users`, `versions`,
`ai`, `pdf`.

---

## Module pattern

The fully-developed shape (used by `modules/books/` and `modules/comments/`):

| File          | Owns                                                          |
|---------------|---------------------------------------------------------------|
| `schemas.ts`  | zod schemas — single source of truth for request/response     |
| `router.ts`   | Express handlers, validation glue, auth middleware            |
| `policy.ts`   | `assertCanXxx` helpers — permission checks throw `AppError`   |
| `service.ts`  | the only file that touches drizzle in this feature            |
| `openapi.ts`  | wires schemas into the OpenAPI registry, sets `operationId`   |

Why split: lets us regenerate the OpenAPI client cleanly, mock services in
tests, and keep auth logic out of route bodies.

Smaller modules carry only what they need. Today's reality:

| Module        | Files                                                  |
|---------------|--------------------------------------------------------|
| `books`       | router, service, policy, schemas, openapi, workflow    |
| `comments`    | router, service, policy, schemas, openapi, dto         |
| `users`       | router, service, schemas                               |
| `versions`    | router, schemas                                        |
| `assignments` | router, schemas                                        |
| `ai`          | router only                                            |
| `pdf`         | router only                                            |

If you find yourself adding more than ~150 LOC of business logic to a
`router.ts`, split it out — start with `service.ts`, add `policy.ts` once
permission checks become non-trivial.

---

## Auth model

Two transports, one identity:

- **REST** (`/api/*`) — BetterAuth issues a session cookie. Every mutating
  route resolves the cookie, calls `loadBookAccess(bookId, me)`, then
  `requireBookAccess(access)`. See `docs/permissions.md`.
- **Hocuspocus WS** (`/collaboration`) — reuses the same cookie at upgrade
  time via `collab/auth.ts::authenticate`. Returns
  `{ user, roles, readOnly }`. The connection's `readOnly` flag controls
  whether updates are accepted at the WS layer.

Dev quick-login (`auth/devSignIn.ts`) is gated by `ENABLE_DEV_AUTH=true` AND
`NODE_ENV !== 'production'`. Make sure both are unset in production.

---

## Database

Drizzle migrations live in `src/db/migrations/`. Workflow:

1. Edit `src/db/schema.ts`.
2. `npm -w backend run db:generate` — emits a new SQL migration file.
3. Review the generated SQL. Hand-edit if drizzle-kit produced something
   destructive (rename = drop+create by default).
4. `just db-migrate` (or `db:reset` if you're in early dev and don't care
   about data).

Important tables:

| Table                | Stores                                              |
|----------------------|-----------------------------------------------------|
| `book`               | books with stage, progress, ownership               |
| `book_stage_history` | append-only stage transitions                       |
| `assignment`         | (book, user, role) tuples — composite PK            |
| `book_yjs_state`     | latest Y.Doc binary state, one row per book         |
| `book_snapshot`      | labelled snapshots                                  |
| `comment_thread`     | projection of Y.Doc 'comments'                      |
| `comment_message`    | projection of replies                               |

`book_yjs_state.size_bytes` is tracked alongside the blob to flag pathological
growth without scanning the bytea on list pages. (`schema.ts` and
`collab/persistence.ts` reference an ADR `docs/adr/006-…` for the rationale;
the ADR file isn't checked in yet.)

---

## Environment

See root `README.md` for the full table. Critical ones:

| Variable             | Notes |
|----------------------|-------|
| `BETTER_AUTH_SECRET` | Required. ≥32 chars. `openssl rand -base64 32`. |
| `DATABASE_URL`       | Compose default uses `db:5432`; native uses `localhost:5433`. |
| `CORS_ORIGINS`       | Comma-separated. WS auth also checks Origin. |
| `COOKIE_DOMAIN`      | Empty on localhost. Browsers reject `Domain=localhost`. |
| `ENABLE_DEV_AUTH`    | **Must be unset in production**, also gated by NODE_ENV. |

`env.ts` validates with zod; the process refuses to start on bad env.

---

## OpenAPI

- Spec served at `:8080/openapi.json`, Swagger UI at `:8080/docs`.
- Every registered route MUST have an `operationId` — enforced by a vitest.
- Frontend client lives in `frontend/src/api/generated/` and is regenerated
  by `just gen-api` (requires backend to be running).

Adding a route — checklist:
1. Define request/response schemas in `modules/<feature>/schemas.ts`.
2. Register the route + schemas in `modules/<feature>/openapi.ts` with an
   `operationId`.
3. Implement the handler in `router.ts`.
4. `just gen-api`. Commit both backend and frontend changes together.

---

## Testing

```sh
npm -w backend test
```

Layout:
- `tests/<feature>.test.ts` — supertest against the Express app for REST.
- Permission tests cover at least one allow + one deny per gated action.
- Hocuspocus auth tested via `tests/collab/`.

---

## Stage-1 invariants & gotchas

- **Single backend process** — see comment at the top of `collab/server.ts`.
  Presence and the Hocuspocus document store are process-local. Don't
  scale horizontally without a Redis-backed store.
- **WS suggest-only trust** — connection `readOnly` is the only WS-side
  check. Suggest-only roles are NOT read-only; they rely on the client's
  `SuggestionMode` to wrap edits. Server validation that rejects bare
  edits is a Stage-2 deliverable.
- **Comments projection lag** — `db/projections.ts` materializes Yjs into
  SQL for list/search. Y is authoritative; SQL can lag briefly.
- **Cookies on `localhost`** — never use `127.0.0.1`. BetterAuth cookies
  are scoped to `localhost`; mixing the two silently drops auth.
