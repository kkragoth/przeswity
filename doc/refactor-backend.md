# Backend refactor plan — `backend/src`

Audit date: 2026-04-30. Stack: Node 20, Express 4, Drizzle ORM (Postgres), better-auth, Hocuspocus (Yjs), Zod + `@asteasolutions/zod-to-openapi`, vitest.

This document is self-contained: an agent picking it up should be able to read it top-to-bottom and execute the phases without going back to the original audit. Each item names exact files and line ranges, the problem, the fix, and a size estimate (S = <1h, M = 1–4h, L = ½–1 day).

---

## 0 — How to use this document

1. Work phase by phase. Do **not** mix mechanical cleanup with semantic changes — keep diffs reviewable.
2. After every phase: run `npm test --prefix backend` and `npm run build --prefix backend`. Both must stay green.
3. Do not push. Stop after each phase and ask the user to confirm.
4. Follow `CLAUDE.md` (project-root): DRY, files <200 LOC, ADTs over flag-bags, enums for related constants, no relative cross-dir imports — but the backend uses `.js` ESM-style relative imports as is its convention; **keep that convention**, only collapse duplication.
5. New files go under `backend/src/lib/` or per-module. Do not introduce frontend-style `@/` aliases unless `tsconfig.json` is updated and tests still pass.
6. Schema changes go through Drizzle migrations (`backend/src/db/migrations/`). Generate via `npm run drizzle:generate` and check the SQL by hand.

---

## A — Architecture issues

**A1. Per-module access-check duplication (~120 LOC, 4 modules).**
- `modules/comments/router.ts:107-137` (`getUserAssignmentRoles`, `hasReadAccess`, `canResolveThread`, `canDeleteThread`)
- `modules/assignments/router.ts:52-72` (`loadBook`, `isVisibleToUser`, `canManage`)
- `modules/versions/router.ts:39-47` (`visibilityCheck` — also returns roles + isOwner)
- `modules/books/service.ts:24-60` (`listVisibleBooks`, `getBookIfVisible`, `userOwnsBook`)
- `modules/books/router.ts:112-121, 230-237, 258-265, 275-281, 290-297` — same pattern five times: `getBookIfVisible` → on null `select id` to distinguish 404 vs 403.
- `collab/auth.ts:31-60` reimplements the same admin/owner/assigned-role decision tree.

**Fix:** introduce `backend/src/lib/access.ts` exposing one ADT-returning function:

```ts
type BookAccess =
    | { kind: 'notFound' }
    | { kind: 'forbidden' }
    | { kind: 'visible'; book: BookRow; isOwner: boolean; isAdmin: boolean; roles: BookRole[]; permissions: Permissions };

export async function loadBookAccess(bookId: string, me: AuthUser): Promise<BookAccess>;
export function requireBookAccess(access: BookAccess): asserts access is Extract<BookAccess, {kind:'visible'}>;
```

`permissions` is computed via `permissionsForUser(roles, { systemRole, isOwner })` from `lib/permissions.ts` — that function already exists and is currently underused. Replace every per-route `hasReadAccess`/`canResolveThread`/`canDeleteThread`/`isVisibleToUser`/`canManage`/`visibilityCheck` with `loadBookAccess(...)` + a permission check on the returned `permissions` object. **L**

**A2. Permission checks reimplemented as string literals despite `lib/permissions.ts` existing.**
- `modules/comments/router.ts:128-129`: `roles.includes('editor') || roles.includes('coordinator')` — duplicates `permissions.canResolve`.
- `modules/versions/router.ts:66-67`: `allowedRoles = new Set(['editor','proofreader','translator','author','typesetter','coordinator'])` — that is literally **all** book roles, i.e. "any assignee" — should be expressed as `roles.length > 0`, not a literal list.

**Fix:** route every "can X" decision that has a corresponding column in `Permissions` through `permissionsForUser`. Delete the literal-string copies.

**Do NOT extend the role matrix to cover thread deletion / snapshot creation.** Thread deletion (`comments/router.ts:132-137`) and book deletion (`books/router.ts:252-256`, currently `requireAdmin`) are explicit owner/admin policies — keep them outside `Permissions` so a future "we want translators to delete threads" change cannot silently flip the role matrix. Snapshot-create is "any assignee or higher", which is `roles.length > 0` — also not a role-matrix question. **M**

> **Codex review correction (2026-04-30):** the original draft proposed adding `canDeleteThread`/`canCreateSnapshot` to `Permissions`. That would extend deletion privilege through the matrix and is rejected. Books delete is admin-only at `books/router.ts:252-256` — there is no owner-delete drift to fix.

**A3. Role list defined in five places, drift inevitable.**
- `lib/permissions.ts:3-5` — `BookRole` type + `ROLES` const.
- `modules/books/schemas.ts:33` — zod enum literal.
- `modules/comments/schemas.ts:5,61` — zod enum literal (twice).
- `seed/seed.ts:20` — `type Role = ...` string-union.

**Fix:** export `ROLES` and a derived `BookRoleEnum = z.enum(ROLES as [BookRole, ...BookRole[]])` from `lib/permissions.ts`. Reuse everywhere. **S**

**A4. Stage list defined twice, untyped in DB.**
- `db/schema.ts:13` — `stage: text('stage').notNull().default('editing')` — no constraint.
- `modules/books/workflow.ts:3-12` — `BOOK_STAGES` literal.

**Fix (light):** add a Postgres CHECK constraint via migration; tighten Drizzle column type to `text<BookStage>`. **Fix (heavy, optional):** convert to a real `pgEnum`. The light fix is sufficient and reversible. **S**

**A5. OpenAPI registrations are 30%+ of every router file.**
Every router has 5–10 `registry.registerPath({ method, path, request: { params: z.object({ ... }) }, body: { content: { 'application/json': { schema: X } } }, responses: { 200: { ... } } })` blocks. Same boilerplate, inconsistent (e.g. `bookSnapshotState` has no response schema; `commentMessageDelete` has no response schema; some return 200 with descriptions, some 204).

**Fix:** add `lib/openapi.ts` with helpers:
```ts
registerJsonRoute({ method, path, operationId, params?, query?, body?, response, status?: 200|204 });
```
Cuts ~150 LOC and forces every path to declare params/response uniformly. **M**

**A6. Stage update + history insert not transactional.**
`modules/books/router.ts:194-208` updates `book.stage` then inserts `bookStageHistory` — if the second statement fails, history is missing. Wrap in `db.transaction`. Similar issue: book POST already wraps in tx (`router.ts:137-165`) — good. **S**

**A7. Comments-list filters applied in memory after a full SELECT** (`router.ts:225-247`).
`mentionsMe`, `mentionsRole`, `author`, `status` are filtered in JS over **all** threads + **all** messages of a book. At 1k threads this is fine; at 50k it isn't. Push `status` and `author` into the SQL `WHERE` (status uses `resolved` + `detachedAt` columns which exist; author needs an `EXISTS` on `comment_message`). Mentions filtering can stay in memory but should run **after** SQL has narrowed the set. **M**

**A8. `loadThreadWithMessages` is called after every mutation** (5 routes). It runs two queries (thread + messages with author join). Acceptable — but extract into `service.ts` so the router stays focused on HTTP. **S**

**A9. Comments-delete cascade is racy** (`router.ts:342-355`).
Sequence: `SELECT count → DELETE message → IF count==1 DELETE thread`. A concurrent insert between SELECT and DELETE-thread loses data. **Fix:** wrap in a single transaction, and replace the count-then-delete with: delete the message, then `DELETE FROM thread WHERE id=$1 AND NOT EXISTS (SELECT 1 FROM message WHERE thread_id=$1)`. **M**

**A10. Detach-thread idempotency is JS-side, not SQL-side** (`router.ts:364-368`).
Comment says `// Idempotent: COALESCE(detached_at, NOW())` but the code is `set({ detachedAt: thread.detachedAt ?? new Date() })` — fine for single writer, racy under concurrency. **Fix:** use `sql\`COALESCE(detached_at, NOW())\`` in the `SET` clause. **S**

**A11. `req: any` and `(req: any, res)` everywhere.**
Every route handler casts the request to `any`, dropping `requireSession`'s type contract. The contract is **already** wired via declaration merging at `auth/session.ts:17-25` (`req.user?: AuthUser`), so no new abstraction is needed.

**Fix (no wrapper):** type each handler directly:
```ts
booksRouter.get('/api/books/:id', requireSession, asyncHandler(async (
    req: Request<{ id: string }> & { user: AuthUser },
    res: Response,
) => { ... }));
```
After `requireSession`, `req.user` is non-optional — assert with a tiny helper `mustUser(req)` that returns `req.user!` and throws `errors.auth.unauthenticated` otherwise. Do **not** add a custom `authed()` HOF — it duplicates the global `Express.Request` type and adds indirection without removing a class of bug. **M**

> **Codex review correction:** the original draft proposed an `authed<P,B,Q>` wrapper. Removed in favor of direct typing using the existing global declaration merge.

**A12. Buffer ↔ Uint8Array dance repeated 3 places.**
`collab/persistence.ts:18,21`, `modules/books/router.ts:152`, `modules/versions/router.ts:75` — same `Buffer.from(x) as unknown as Uint8Array`. Wrap in `lib/bytes.ts:asByteaInput(state)`. **S**

**A13. `bulk assignments` response is over-specified** (`assignments/router.ts:130-153`).
Returns `created`, `existing`, **and** `all` — the union of the first two is a strict subset of the third. Caller can derive everything from `all`. **Fix:** return `{ assignments: AssignmentDto[]; createdIds: string[] }` and update frontend at the same time. **S**

**A14. Workflow validator throws AppError** (`workflow.ts:39-52`) — couples a pure module to HTTP errors. Either move it next to the router, or return `Result` and let the caller throw. **S**

**A14b. TOCTOU: ownership check then unscoped write.**
`modules/books/router.ts:172-181` (PATCH title/description), `:184-210` (PATCH stage), `:212-228` (PATCH progress) all `SELECT … WHERE id=?` to check ownership/admin, then `UPDATE … WHERE id=?` — the second statement does not re-assert the policy predicate. Two concurrent admin demotions or owner transfers can interleave such that an update lands after the policy decision changed.

**Fix:** every policy-gated `UPDATE` carries the policy predicate inline:
```ts
.update(book).set(...).where(and(eq(book.id, id), or(eq(book.createdById, me.id), sql`${isAdmin}`)))
.returning();
```
If `returning()` is empty after a successful policy check, the row was concurrently moved out from under us — return 409. Same pattern for stage/progress updates. **M**

**A15. Books-list query path is N+3.**
`modules/books/router.ts:84-110`:
1. Select my assignments (for `myRoles`).
2. `listVisibleBooks` (which does owned + assigned, so two more queries).
3. Select all `(book, user)` assignment rows for distinct count.

**Fix:** one parametrized query that left-joins:
```sql
SELECT b.*, ARRAY_AGG(DISTINCT a_me.role) FILTER (WHERE a_me.user_id=$me) AS my_roles,
       COUNT(DISTINCT a_all.user_id) AS assignee_count
FROM book b
LEFT JOIN assignment a_me ON a_me.book_id=b.id AND a_me.user_id=$me
LEFT JOIN assignment a_all ON a_all.book_id=b.id
WHERE $isAdmin OR b.created_by_id=$me OR EXISTS (SELECT 1 FROM assignment WHERE book_id=b.id AND user_id=$me)
GROUP BY b.id
ORDER BY b.updated_at DESC;
```
Drizzle supports this with `groupBy`/`sql\`\``. **M**

**Risk gate (Codex):** a naive join produces duplicate book rows, wrong `myRoles` aggregation, and ordering instability. Before merging the rewrite:
1. Add response-shape snapshot tests (`tests/books.list.snapshot.test.ts`) covering: admin path, owner-only path, multi-role assignee, empty `myRoles`, multi-assignee count.
2. Land Phase 5 indexes first (`assignment(user_id)`, `book(created_by_id)`).
3. Keep the existing 3-step query behind a `BOOKS_LIST_V2` env flag for one release; flip after a week of parity logging.

**A16. `getBookIfVisible` plus the "404 vs 403" follow-up query is in 5 places** (`books/router.ts:112-121, 230-237, 258-265, 275-281, 290-297`). Subsumed by A1. **(folded)**

**A17. Hocuspocus collab auth duplicates access logic** (`collab/auth.ts:31-60`).

**Fix:** extract a transport-agnostic primitive in `lib/access.ts`:
```ts
export async function getBookAccessByUserId(
    bookId: string,
    userId: string | null,
    systemRole: string | null | undefined,
): Promise<BookAccess>;
```
Both the HTTP path (`loadBookAccess(req)` resolves session, then delegates) and the WS path (`collab/auth.ts` already has the `better-auth` session — passes user id directly) call this primitive. **Do NOT** wrap the WS handler in a fake Express `Request`: `collab/auth.ts:23-29` deliberately constructs a `Headers` object for `better-auth` directly, and the WS auth layer must stay independent of Express middleware shape.

The dev-WS-anon fallback at `collab/auth.ts:36-46` is **already** gated by `env.ENABLE_DEV_AUTH && env.NODE_ENV !== 'production'` — leave it alone. Add a regression test that asserts the fallback is unreachable when `ENABLE_DEV_AUTH=false`. **S after A1**

> **Codex review correction:** the original draft proposed both a fake-Request wrapper (rejected) and a re-gating of the dev fallback (already done at `auth.ts:37`). Both items removed.

**A18. `devSignIn` body is `as { userId?: string }`** (`auth/devSignIn.ts:37`). Replace with `z.object({ userId: z.string().optional(), email: z.string().email().optional() }).refine(b => b.userId || b.email)`. **S**

**A19. Markdown export is CPU-unbounded.**
`books/router.ts:267-272` runs `yDocStateToMarkdown(...)` synchronously on the request thread; for a 5 MB Yjs state this can block the event loop for hundreds of ms. **Fix:** add a size guard (refuse if `state.length > 10 MB`, return 413). Cache-Control is a separate operational concern — *do not* slap `no-store` on under the banner of "safety"; if private caching by reverse proxies becomes a problem, address it with a measured policy (`private, max-age=0, must-revalidate`), not a refactor item. **S**

**A20. Presence is process-local — single-process deployment is a hard invariant.**
`collab/presence.ts:2` declares `const presence = new Map(...)`. The HTTP API at `books/router.ts:290-299` exposes this as authoritative. Behind any multi-process deployment (PM2 cluster, k8s replicas, two pods), `/api/books/:id/presence` returns the partial view of whichever pod handled the request — silent data loss.

**Fix (now):**
1. Document in `README.md` and as a `// INVARIANT:` comment at `collab/server.ts:1` that the backend must run as a **single process**.
2. Add an env-gated kill switch `env.PRESENCE_API_ENABLED` (default true). Multi-process deployments set it to `false` and the endpoint returns 501.
3. Open a follow-up ticket for a Redis-backed presence store. Do not start the migration in this refactor. **S**

---

## B — DRY / repetition

- **DTO mappers** all do the same `Date → ISO` dance: `projectBook` (`books/service.ts:7-22`), `projectUser` (`users/router.ts:49-58`), `projectAssignment` (`assignments/router.ts:45-50`), `buildThreadDto` (`comments/router.ts:145-168`), snapshot mappers (`versions/router.ts:57-62, 80-84`). Extract `lib/dto.ts:toIso(d)` (already exists locally in comments) and consider a tiny `mapDates(obj, keys)` helper. **S**
- **Author/user join projection** is repeated: `comments/router.ts:175-178`, `assignments/router.ts:80-84`, `versions/router.ts:51-54, 78-79`. Extract `db/projections.ts:userPublicCols`. **S**
- **`onConflictDoNothing` + dedup loop** for assignments is in two places: `books/router.ts:154-163` and `assignments/router.ts:107-147`. Extract `modules/assignments/service.ts:upsertAssignments(tx, bookId, list)`. **S**
- **`loadBookOrThrow` / `loadBook`** — same function, two names (`comments/router.ts:95-99`, `assignments/router.ts:52-56`). Move to `modules/books/service.ts`. **S**
- **`registry.registerPath` 200/json envelope** — see A5. **(folded)**

---

## C — Performance hotspots

- **Comments list:** see A7.
- **Books list:** see A15.
- **`buildMeResponse`** (`users/router.ts:60-69`) selects the user, then all assignments, just to compute `visibleBookCount = distinct bookIds`. SQL `COUNT(DISTINCT book_id)` would be one statement. **S**
- **Snapshot creation reads full Yjs state** (`versions/router.ts:70-77`) and inserts a copy. Acceptable for now (snapshots are explicit user actions); flag a future move to row-level deltas. **(no-op)**
- **Presence interval** (`collab/presence.ts:48`): O(connections); fine — leave as-is.
- **No DB indexes on hot lookups:**
  - `assignment(user_id)` — hot in `listVisibleBooks` and `buildMeResponse`. The composite PK starts with `book_id`, so `user_id` lookups are seq-scans. Add a single-col index on `assignment(user_id)`.
  - `comment_thread(book_id)` — already implicit via FK? Check. If not, add `(book_id, resolved, detached_at)` partial index for the active-status filter.
  - `book(created_by_id)` — needed by `listVisibleBooks` "owned" query and `userOwnsBook`.
  Migration: `0003_indexes.sql`. **S**

---

## D — Code-quality nits (CLAUDE.md compliance)

- Files >200 LOC: `modules/comments/router.ts (390)`, `modules/books/router.ts (299)`, `seed/seed.ts (502)`. After A1/A5/A7 the comments router should drop to ~180; books to ~200. Seed is data-heavy; split fixtures from logic (`seed/data/users.ts`, `seed/data/books.ts`, `seed/data/threads.ts`). **M**
- **No emojis in CLAUDE.md, but seed has emoji-free strings** — fine.
- **`as any` casts:** `versions/router.ts:75`, `seed/seed.ts` multiple, `assignments/router.ts:85,107` (`r.a`/`r.u`). After A11 most disappear; remaining ones get `// reason:` comments.
- **Stringly-typed `role: string`** in URL params: `assignments/router.ts:39-43, 156-166`. Validate with `BookRoleEnum` from A3.
- **`req.user as any`** is gone after A11.
- **Inconsistent error code namespacing:** `errors.book.forbidden`, `errors.comment.forbidden`, `errors.auth.forbidden`. Centralize in `lib/errorCodes.ts` as a const enum so typos are caught at compile time. **S**
- **`console.log/error` only:** add a thin `lib/log.ts` wrapper (no new deps; just JSON-line output gated by `env.NODE_ENV`). Keep it tiny — three functions: `info`, `warn`, `error`. **S**
- **OpenAPI server URL is hardcoded `'/'`** (`openapi/registry.ts:13`). Pull from env. **S**

---

## E — Phased execution plan

Each phase is independently shippable. Confirm with user between phases.

> **Codex review (2026-04-30) re-ordered the original 7 phases.** Phase 0 (safety) and Phase 4 (data audit) were inserted; query and OpenAPI passes were re-ordered so semantics stabilize before types are tightened. Do **not** revert to the original 1–7 ordering.

### Phase 0 — Safety guards before anything else (½ day, must-do)
None of these are refactors — they are invariants the rest of the work assumes.

1. **App invariant: BetterAuth mount order.** `app.ts:23-27` requires `devAuthRouter` and `app.all('/api/auth/*', toNodeHandler(auth))` to mount **before** `express.json()`. Any refactor that re-arranges middleware silently breaks auth. Add `tests/app.middleware-order.test.ts` that boots the app and asserts the relative order of (a) cookie-parser, (b) dev auth router, (c) better-auth wildcard, (d) `express.json`, (e) module routers. This test must exist before Phases 2+ touch `app.ts`.
2. **Multer fileFilter semantics.** `pdf/router.ts:13-15` returns `cb(null, false)` for non-PDFs, then the route reports the result as `errors.pdf.noFile / 400 "file required"` (`pdf/router.ts:29`). Wrong: invalid media type must be 415. Fix: `cb(new AppError('errors.pdf.unsupportedMediaType', 415, 'pdf only'), false)` and let the error middleware emit 415.
3. **Presence deployment constraint.** Per A20: env flag `PRESENCE_API_ENABLED`, `// INVARIANT: single-process` comment, README note.
4. **Dev WS anon regression test.** Per A17: assert that with `ENABLE_DEV_AUTH=false` the WS handshake without a session is rejected.

Run tests, commit, ask user.

### Phase 1 — Mechanical cleanup (1 day, low risk)
Goal: no behavior change, smaller diffs.

1. **B1**: extract `lib/dto.ts` (`toIso`, `mapDates`) and `db/projections.ts` (`userPublicCols`). Replace 5 inline copies.
2. **A12**: `lib/bytes.ts:asByteaInput`. Replace 3 sites.
3. **A18**: zod-validate `devSignIn` body.
4. **A14**: move `requireStageTransitionAllowed`/`validateProgress` thrown-error into router; workflow exports pure predicates.
5. **D-error-codes**: `lib/errorCodes.ts` (const enum). Migrate **only** the keys used by AppError, not every i18n string.
6. **D-log**: `lib/log.ts`. Replace `console.error` in `errors.ts` and `index.ts` only.

Run tests, commit, ask user.

### Phase 2 — Access layer (1 day, medium risk)
Goal: kill access-check duplication.

1. **A1**: `lib/access.ts` with `BookAccess` ADT, `loadBookAccess(req)`, and the transport-agnostic primitive `getBookAccessByUserId(bookId, userId, systemRole)` (per A17). Cover unit tests for ADT branches.
2. **A2**: route every "can X" with a column in `Permissions` through `permissionsForUser`. Thread/book deletion stay as explicit owner/admin policies — do not extend the matrix.
3. **A3**: single `BookRoleEnum` exported from `lib/permissions.ts`. Replace literals in:
   - `modules/books/schemas.ts:33`
   - `modules/comments/schemas.ts:5,61`
   - `seed/seed.ts:20`
4. Replace per-module access helpers across `comments/router.ts`, `assignments/router.ts`, `versions/router.ts`, `books/router.ts`.
5. **A17**: rewire `collab/auth.ts` to call `getBookAccessByUserId` directly with the user resolved from `better-auth`. No fake Express Request.

Tests must still pass (this is the highest-risk phase — review carefully).

### Phase 3 — Concurrency + query-shape fixes (1 day, medium risk)
Semantics first, types and schema after.

1. **A6**: tx wrap stage-update + history-insert.
2. **A9**: tx + `NOT EXISTS` on comment-delete.
3. **A10**: SQL `COALESCE` for detach idempotency.
4. **A7**: push `status` + `author` filters into SQL on comments list.
5. **A14b**: ownership predicate inline on every policy-gated `UPDATE`. 409 on empty `returning()`.
6. **A15**: single-query books list **only after** Phase 5 indexes land. Until then, leave the 3-step path. Snapshot tests required (see A15 risk gate).
7. **C-buildMeResponse**: `COUNT(DISTINCT)` for visible-book count.

### Phase 4 — Data audit + backfill (½ day, must-precede Phase 5)
**Required before any CHECK constraint migration runs.**

1. Run a read-only audit script `scripts/audit-stage-progress.ts` that reports:
   - `book` rows where `stage` is not in `BOOK_STAGES`.
   - `book` rows where `progress_mode` is not in `('auto','manual')`.
   - `book` rows where `progress` is outside `[0, 100]`.
   - `book` rows where `created_by_id` does not exist in `user`.
2. If counts are zero in dev/prod: proceed.
3. If non-zero: write a backfill migration `0003_backfill_stage_progress.sql` that maps known-bad values to safe defaults (`stage='editing'`, `progress=clamp(progress,0,100)`, `progress_mode='manual'`).
4. Re-run audit until clean.

### Phase 5 — Schema constraints + indexes (½ day, low risk after Phase 4)
Migration `0004_constraints_and_indexes.sql`:
- `CHECK (stage IN (...))` on `book.stage`.
- `CHECK (progress_mode IN ('auto','manual'))`.
- `CHECK (progress BETWEEN 0 AND 100)`.
- Indexes: `assignment(user_id)`, `book(created_by_id)`, `comment_thread(book_id)` partial WHERE NOT resolved AND detached_at IS NULL.
- Tighten Drizzle column types via `text<BookStage>`.

### Phase 6 — OpenAPI + types pass (½ day, low risk)
Run **after** Phases 2–5 — types should describe stable semantics, not chase moving ones.

1. **A5**: `lib/openapi.ts:registerJsonRoute`. Migrate every router.
2. **A11**: direct typed `Request<P, _, B, Q>` per route + `mustUser(req)` helper. No HOF wrapper. Net `any` count must drop.
3. **D-server-url**: env-driven `servers` list.

### Phase 7 — Seed/data split (½ day, low risk)
- `seed/data/users.ts`, `seed/data/books.ts`, `seed/data/threads.ts`.
- `seed/seed.ts` becomes orchestration only (~150 LOC).

### Phase 8 — API shape change (optional, requires frontend coordination)
- **A13**: simplify `bulk assignments` response. Update generated client + frontend usages.

---

## F — Out of scope

- Replacing Express with Fastify/Hono.
- Moving presence to Redis (A20).
- Switching from Drizzle to Kysely.
- Changing better-auth.
- AI module (`modules/ai/router.ts`) — it's a stub; leave alone until real provider lands.

---

## F.5 — Codex adverse-review trail (2026-04-30)

Eleven plan-level corrections were applied after a hostile review. Summary, in order of severity:

1. **Rejected:** adding `canDeleteThread`/`canCreateSnapshot` to `Permissions`. Books delete is admin-only and there is no owner-delete bug to fix (`books/router.ts:252-256`).
2. **Rejected:** wrapping the WS handler in a fake Express `Request` to share `loadBookAccess`. Replaced with a transport-agnostic `getBookAccessByUserId` primitive.
3. **Removed:** "gate dev WS anon fallback behind ENABLE_DEV_AUTH" — it is already gated at `collab/auth.ts:37`.
4. **Added:** Phase 0 invariant test for BetterAuth + JSON middleware order (`app.ts:23-27`).
5. **Added:** multer `fileFilter` 415 fix (`pdf/router.ts:13-15` returns silent 400 today).
6. **Hardened:** presence singleton — explicit `// INVARIANT: single-process` and `PRESENCE_API_ENABLED` kill switch.
7. **Replaced:** `authed<P,B,Q>` HOF (cosmetic indirection) with direct `Request<…> & { user }` typing using the existing global merge.
8. **Risk-gated:** A15 single-query books list — snapshot tests + Phase 5 indexes must land first.
9. **Inserted:** Phase 4 data audit before Phase 5 CHECK constraints (would otherwise fail-deploy).
10. **Added:** A14b TOCTOU on policy-gated UPDATEs — inline ownership predicate, 409 on empty `returning()`.
11. **Toned down:** A19 `Cache-Control: no-store` reframed as operational guardrail, not a safety fix; replaced with a 10 MB size guard.

## G — Acceptance criteria for each phase

- `npm test --prefix backend` green.
- `npm run build --prefix backend` green.
- `tsc --noEmit` clean.
- No new `any`. Net `any` count must decrease per phase.
- For phases that touch SQL: explain-plan posted in the PR description for the changed queries.
- File LOC budget: no router file >200 LOC after Phase 3 (excluding OpenAPI registrations if they cannot be inlined).

---

## H — Files most likely to be touched (cheat sheet)

```
backend/
  scripts/
    audit-stage-progress.ts                 (NEW, Phase 4)
  README.md                                 (presence invariant note, Phase 0)
  src/
    app.ts                                  # untouched (locked by middleware-order test, Phase 0)
    index.ts                                # untouched
    env.ts                                  # add PRESENCE_API_ENABLED, Phase 0
    lib/
      access.ts          (NEW, Phase 2 — exports loadBookAccess + getBookAccessByUserId)
      bytes.ts           (NEW, Phase 1)
      dto.ts             (NEW, Phase 1)
      errorCodes.ts      (NEW, Phase 1)
      errors.ts          (small edit, Phase 1)
      log.ts             (NEW, Phase 1)
      openapi.ts         (NEW, Phase 6)
      permissions.ts     (BookRoleEnum export, Phase 2)
    db/
      projections.ts     (NEW, Phase 1)
      schema.ts          (column type tightening, Phase 5)
      migrations/0003_backfill_*    (conditional, Phase 4)
      migrations/0004_constraints_* (NEW, Phase 5)
    modules/
      books/router.ts    (Phases 2,3,6 — TOCTOU fix in Phase 3)
      books/service.ts   (Phases 2,3)
      books/workflow.ts  (Phase 1)
      comments/router.ts (Phases 2,3,6)
      comments/service.ts (NEW, Phase 2 or 3)
      assignments/router.ts (Phases 1,2,6)
      assignments/service.ts (NEW, Phase 1)
      versions/router.ts (Phases 1,2,6)
      users/router.ts    (Phases 3,6)
      pdf/router.ts      (Phase 0 — fileFilter 415; Phase 6)
      ai/router.ts       (Phase 6 only)
    collab/
      auth.ts            (Phase 0 dev-fallback test; Phase 2 access primitive)
      presence.ts        (Phase 0 invariant comment)
      server.ts          (Phase 0 invariant comment)
    auth/
      devSignIn.ts       (Phase 1)
    seed/seed.ts         (Phase 7)
  tests/
    app.middleware-order.test.ts            (NEW, Phase 0)
    pdf.media-type.test.ts                  (NEW or extend, Phase 0)
    collab.dev-fallback.test.ts             (NEW, Phase 0)
    books.list.snapshot.test.ts             (NEW, Phase 3 — gates A15)
```
