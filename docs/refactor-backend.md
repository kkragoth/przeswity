# Backend Refactor Plan

Status: draft v1 (2026-05-03)
Scope: `backend/src/**` and `backend/tests/**`. Frontend untouched.
Goal: tighten types, remove dead/duplicate code, harden security boundaries, remove process-local state from anything that pretends to be persistent, and split god routers (>200 LOC) per CLAUDE.md.

The numbered "Issues" list is the source of truth — every section below references it. We will not start refactoring until this doc has had a Codex adverse-review pass and the disagreements are resolved (see §"Open questions" at the end, populated by the review round).

---

## 1. Stack snapshot

| Layer | Choice |
|---|---|
| HTTP | Express + `asyncHandler` |
| Validation | Zod, surfaced via `@asteasolutions/zod-to-openapi` registry |
| DB | Postgres + Drizzle ORM (`pg.Pool`) |
| Auth | better-auth (email+password) + `requireSession` middleware |
| Realtime | Hocuspocus (Yjs) over `ws`, single-process |
| Logging | minimal `lib/log.ts` wrapper around pino-style API |
| Tests | vitest, ~15 spec files |

Total `src/` LOC: ~3k. Hot files: `modules/comments/router.ts` (350), `modules/books/router.ts` (308), `seed/seed.ts` (242), `modules/assignments/router.ts` (150), `modules/users/router.ts` (147).

---

## 2. Issues (74)

Severity legend: **H** = high (security/data-loss/correctness), **M** = medium (DX, perf, future risk), **L** = low (cleanup).
Category: SEC / ARCH / TYPE / PERF / VALID / ERR / TEST / DEAD / LOG / SCHEMA / CONCUR.

### Architecture & topology

1. [ARCH/H] `collab/server.ts`, `collab/presence.ts`, `collab/lastEditor.ts` keep state in process-local `Map`s. Multi-process deploy silently loses presence + last-editor metadata. **Fix:** assert single-process at boot via env (`COLLAB_SINGLE_PROCESS=1`) and refuse to start otherwise; document in README. Long-term ticket: redis-backed presence.
2. [ARCH/H] `lastEditorByBook` is never persisted, so `bookYjsState.updatedById` is wrong after restart for any book whose first post-restart write happens before a fresh focus event. **Fix:** stamp `updatedById` from the Hocuspocus `context.user.id` directly inside `persistence.store()`, drop the side-channel Map.
3. [ARCH/M] `modules/books/service.ts:listVisibleBooks` does 2 separate queries (owned + assigned ids → inArray). **Fix:** one query with `LEFT JOIN assignment ON book.id = assignment.book_id AND assignment.user_id = $me` filtered by `ownerId = $me OR assignment.user_id IS NOT NULL`.
4. [ARCH/M] Permissions duplicated: `modules/assignments/schemas.ts` defines `RoleEnum` independently of `lib/permissions.ts:ROLES`. **Fix:** export a single `RoleEnum = z.enum(ROLES)` from `lib/permissions.ts`; import everywhere.
5. [ARCH/M] `lib/permissions.ts:mergePermissions` OR-merges flag-by-flag with hand-written booleans — adding a new flag silently defaults to `false` if you forget a row. **Fix:** drive merge from `Object.keys(zeroPerms)` so adding a key is a one-place change.
6. [ARCH/M] `modules/ai/router.ts` is a hardcoded Polish stub returning a fake suggestion. Couples HTTP shape to a future provider that doesn't exist. **Fix:** behind `AI_PROVIDER=stub|none` env; default `none` returns `501 Not Implemented`. Move the canned response into `seed/data` for tests only.
7. [ARCH/M] `modules/comments/router.ts` is 350 LOC — over the 200-LOC ceiling in CLAUDE.md. **Fix:** split into `router.ts` (HTTP wiring + OpenAPI), `service.ts` (load/build DTO, list filter), `policy.ts` (resolve/delete authority checks).
8. [ARCH/M] `modules/books/router.ts` (308 LOC) likewise. **Fix:** extract `service.ts` (visible list, projection, stage transitions) and `policy.ts` (who can change stage).
9. [ARCH/M] `seed/seed.ts` (242 LOC) mixes user creation, book creation, thread seeding, mark insertion. **Fix:** split per-domain seed modules (`seedUsers.ts`, `seedBooks.ts`, `seedThreads.ts`) called from a thin orchestrator.
10. [ARCH/L] `auth/betterAuth.ts` is a 1-line re-export with no purpose. **Fix:** delete and import from `betterAuth.config.ts` directly.
11. [ARCH/L] `lib/dto.ts` (`toIso`, `toIsoOrThrow`) is reasonable but `toIsoOrThrow` is called on values the type system already says are non-null (`book.createdAt`, `commentThread.createdAt`). **Fix:** keep the helper but drop call sites where Drizzle already infers `Date`.

### Type safety

12. [TYPE/H] `index.ts:21` — `(ws: any) => …` for the WS upgrade callback. **Fix:** `import type { WebSocket } from 'ws'`.
13. [TYPE/H] All `commentsRouter.<verb>(…, asyncHandler(async (req: any, res) => …))` (every handler in `modules/comments/router.ts`, also `books`, `assignments`, `users`, `versions`). **Fix:** define `AuthedRequest = Request & { user: SessionUser }` in `auth/session.ts`; type handlers with it. Remove every `req: any`.
14. [TYPE/H] `buildThreadDto(thread: any, messages: any[]): any` and `loadThreadWithMessages(): Promise<any>` in `modules/comments/router.ts:106`. **Fix:** infer with `InferSelectModel<typeof commentThread>` and return `z.infer<typeof CommentThreadDto>`.
15. [TYPE/H] `projectAssignment(a: any)` in `modules/assignments/router.ts:47`. Same fix.
16. [TYPE/M] `collab/server.ts:onAuthenticate(data: any)` and `collab/presence.ts` extension callbacks. **Fix:** import `onAuthenticatePayload`, `onConnectPayload`, `onDisconnectPayload` types from `@hocuspocus/server`.
17. [TYPE/M] `collab/auth.ts:26` `const u: any = session?.user`. **Fix:** type as `SessionUser | null`.
18. [TYPE/L] `lib/bytes.ts` casts `Uint8Array` ↔ `Buffer` via `any`. **Fix:** explicit `Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength)` round-trip.

### Security

19. [SEC/H] `seed/devPassword.ts` exports a hardcoded `"devseed1234"` literal that is *also* used by tests. If the seed is ever run against a non-dev DB the resulting accounts have a known password. **Fix:** require `DEV_SEED_PASSWORD` env in seed and tests; fail loudly if unset; refuse seed when `NODE_ENV === 'production'`.
20. [SEC/H] `auth/devSignIn.ts` mounts `/api/auth/dev/users` (lists every user) and `/api/auth/dev/sign-in` (sign in as anyone by id/email) gated on `NODE_ENV !== 'production' && ENABLE_DEV_AUTH`. A single misconfigured prod env (`ENABLE_DEV_AUTH=true`) fully bypasses auth. **Fix:** AND with `process.env.NODE_ENV === 'development'` *and* refuse to start the server if both flags disagree (e.g., `NODE_ENV=production` && `ENABLE_DEV_AUTH=true`).
21. [SEC/H] No rate limiting anywhere. `/api/auth/*`, `/api/auth/dev/sign-in`, `/api/pdf/extract`, `/api/ai/*` are all wide open. **Fix:** `express-rate-limit` per route group with sane defaults; stricter on auth.
22. [SEC/H] `users/router.ts:93-99` and `seed/seed.ts:38-42` detect "user already exists" by `String(err).includes('exists')`. If better-auth changes the message we silently treat real errors as success. **Fix:** assert on `err.code === 'USER_ALREADY_EXISTS'` (or whatever the library actually emits — confirm in the bump PR), else rethrow.
23. [SEC/M] `app.ts:cors({ origin: env.CORS_ORIGINS, credentials: true })` — `cors` accepts an array of allowed origins, but if `CORS_ORIGINS` is empty or `'*'` plus `credentials: true`, we get either reflection-off-origin or credentialed wildcard which browsers reject silently. **Fix:** validate in `env.ts` (`min(1)`, no `*` when credentials), log allowed origins on boot.
24. [SEC/M] `pdf/router.ts` uses `multer.memoryStorage()` with 25 MB cap and no per-IP/per-user throttle. Trivial OOM via concurrent uploads. **Fix:** `multer.diskStorage` with stream parse, plus rate limit (#21).
25. [SEC/M] `lib/access.ts:getBookAccessByUserId` does not check `user.banned/disabled` — a session whose user row was banned post-login still passes. **Fix:** join `user.banned = false` (better-auth supplies that column).
26. [SEC/M] `auth/betterAuth.config.ts:trustedOrigins = env.CORS_ORIGINS`. Same input as CORS so any misconfig is doubly bad. **Fix:** validate in `env.ts` (#23) so this is fine by construction; add an assertion test.
27. [SEC/L] `comments/router.ts:165` builds `EXISTS (... WHERE author_id = ${query.author})` via Drizzle `sql` template — parameterised so safe today, but this is the only place we hand-write SQL fragments. **Fix:** replace with Drizzle's `inArray`+subquery builder so reviewers don't pattern-match it as risky.
28. [SEC/L] `app.ts` lacks `helmet`, `hpp`, and `compression` middleware. **Fix:** add `helmet({ contentSecurityPolicy: false })` (frontend serves its own CSP) plus `hpp`.

### Validation / boundaries

29. [VALID/M] `comments/schemas.ts:CreateThreadBody.anchorId` uses `z.string().min(1)` with no max. Same for `quote`, `body`. **Fix:** `.max(256)` for ids, `.max(8000)` for body, `.max(2000)` for quote — match DB column expectations and document.
30. [VALID/M] `users/schemas.ts:CreateUserBody.password` `.min(8)` but no max → `Argon2`/`bcrypt` will happily hash a 1 MB string. **Fix:** `.max(72)` (bcrypt's hard limit) or `.max(256)` if better-auth uses scrypt; verify and pin.
31. [VALID/M] `comments/schemas.ts:ResolveBody.mentions` array unbounded. **Fix:** `.max(50)` per array.
32. [VALID/M] `books/schemas.ts:CreateBookBody.initialAssignments` allows up to 50 entries but does not deduplicate `(userId, role)` pairs. The `onConflictDoNothing()` saves us at the DB layer but client gets 200 with silently dropped data. **Fix:** `.refine(unique by tuple)` and 400 on dup.
33. [VALID/M] No content-type assertion on `pdf/router.ts`. Multer accepts `multipart/form-data`, but a sender can attach an executable as `application/pdf`. **Fix:** sniff magic bytes (`%PDF-`) in addition to content-type.
34. [VALID/L] `versions/router.ts` snapshot label has no validation — a 100k-char label gets stored. **Fix:** `.max(200)`.

### Concurrency / correctness

35. [CONCUR/M] `books/router.ts:137-165` — book create transaction: existence check on `userIds` then insert assignments. A concurrent user delete between check and insert produces an opaque FK error mapped to 500. **Fix:** wrap the FK error and translate to 409, OR run the existence check inside the same `tx` with `FOR SHARE` lock on `user`.
36. [CONCUR/M] `collab/persistence.ts:store()` updates `bookYjsState` and `book.updatedAt` in a tx but reads `lastEditorByBook` from process memory just before the tx — see #2.
37. [CONCUR/L] `comments/router.ts:301-310` — atomic delete-then-conditional-thread-cleanup is already correct (good), keep the comment but note the assumption (no other "thread is empty" reader exists).

### Performance

38. [PERF/M] `books/service.ts:listVisibleBooks` non-admin path does 2 round-trips per call (#3).
39. [PERF/M] `users/router.ts:66-72` `buildMeResponse` issues a `count(distinct bookId)` then a separate `select role` → could be one `select role, count(distinct book_id) group by role`.
40. [PERF/M] `comments/router.ts:list` runs the EXISTS subquery for `query.author` instead of a JOIN. For large books this triggers a per-row probe. **Fix:** rewrite as `INNER JOIN comment_message ON ... WHERE author_id = $author` with `DISTINCT` on thread.
41. [PERF/L] `users/router.ts:list` returns *all* users with no pagination. Fine at 50 users; not at 5k. **Fix:** `limit/offset` with `max(limit) = 200`.

### Schema / DB

42. [SCHEMA/M] `bookYjsState` uses `bytea` with PK `(book_id)`. No size cap, no compression, no rotation. A pathological binge can grow this row to GBs. **Fix:** track size in a sibling column, log warning over 5 MB, document plan to LZ4-compress.
43. [SCHEMA/M] `book.stage` is `text` with check constraint added in migration `0003`. Drizzle `.$type<BookStage>()` is purely cosmetic. **Fix:** Postgres `enum` type via Drizzle's `pgEnum`, then drop the check constraint.
44. [SCHEMA/M] `assignment` PK is `(book_id, user_id, role)` — fine. But missing `(book_id)` index for "assignments for this book" lookups. **Fix:** `create index assignment_book_id_idx on assignment(book_id)` (composite PK only helps `(book_id, *, *)` prefix).
45. [SCHEMA/M] `commentThread` lacks `(book_id, created_by_id)` composite index for the author filter (#40). **Fix:** add the index after rewriting the query.
46. [SCHEMA/L] `commentThread` has no unique constraint on `(book_id, anchor_id)`. Today multiple threads per anchor is intentional (we test for it?), but undocumented. **Fix:** add a comment on the column or a check constraint that asserts the intent.
47. [SCHEMA/L] `bookYjsState` PK on `book_id` precludes future branches/snapshots. Acceptable for now but call it out in an ADR.

### Error handling / logging

48. [ERR/M] `lib/errors.ts:errorMiddleware` only `log.error`s the `unhandled` branch. `AppError` and `ZodError` go through silently. **Fix:** debug-log AppError with `code+status`, info-log ZodError with the failing path. No PII.
49. [ERR/M] `comments/router.ts:loadThreadOrThrow` throws a generic `'thread not found'` without the threadId. Same in `messages` lookup. **Fix:** include `{ threadId }` in the AppError details so it ends up in structured logs (not in the response body).
50. [ERR/L] `seed/seed.ts` peppers `console.log/warn` (lines 40, 189, 202, 205, 214, 231, 234, 236) and `db/migrate.ts` + `db/reset.ts` likewise. **Fix:** route through `lib/log.ts`.
51. [ERR/L] `collab/server.ts:27` `console.log('[collab] extensions:…')` runs at module load. **Fix:** `log.info('collab extensions loaded', { count })` inside `start()`.
52. [LOG/L] `collab/auth.ts:16-18` returns a generic "forbidden: origin" with no log line. Hides misconfigured allow-list during incidents. **Fix:** `log.warn('collab origin rejected', { origin })`.

### Dead / duplicate / leftover

53. [DEAD/L] `auth/betterAuth.ts` (1 LOC re-export) — see #10.
54. [DEAD/L] `seed/devPassword.ts` (1 LOC) — fold into `env.ts` once #19 lands.
55. [DEAD/L] `db/projections.ts` (`userPublicCols`) duplicates Drizzle's `getTableColumns` selection pattern. Keep, but document so the next dev knows where to add new public columns.
56. [DEAD/L] `lib/openapi.ts` exports two helpers (`paramsObj`, `errorResponses`) used by ~3 routers. Keep, but verify there are no other ad-hoc inline param objects (there are: `comments/router.ts` registrations all inline them). **Fix:** convert all `request.params: z.object({...})` to `paramsObj(...)`.

### Testing gaps

57. [TEST/H] No tests for permission escalation (translator trying to resolve, proofreader trying to delete a thread, non-owner deleting a book).
58. [TEST/H] No tests for dev-auth gating: `ENABLE_DEV_AUTH=false` must return 404 on `/api/auth/dev/*`.
59. [TEST/M] No concurrency tests on book creation (#35) or comment delete-vs-reply.
60. [TEST/M] No tests for comment list filters: `mentionsMe`, `mentionsRole`, `author`, `status` cross-product.
61. [TEST/M] No tests for size limits (post a 1 MB body, expect 400 / 413). Will land alongside #29-31.
62. [TEST/L] No assertion on rate-limit headers (lands with #21).
63. [TEST/L] No snapshot-roundtrip test (write Yjs state, read it back, apply update, ensure no corruption). Important once compression lands (#42).

### Stage-transition / workflow

64. [ARCH/M] `modules/books/workflow.ts` (41 LOC) defines stage transitions as object literals; the rules aren't shared with the frontend. **Fix:** keep here as the source of truth; emit through OpenAPI as a const enum; don't duplicate in FE.

### CLAUDE.md compliance

65. [ARCH/M] CLAUDE.md mandates ADTs with `kind` discriminators; `lib/access.ts:BookAccess` returns `{ isAdmin, isOwner, roles, permissions }` flag-bag instead. **Fix:** discriminated union: `{ kind: 'admin' } | { kind: 'owner', roles, permissions } | { kind: 'assigned', roles, permissions } | { kind: 'none' }`. Routes pattern-match on `kind`.
66. [ARCH/M] CLAUDE.md mandates string-valued enums over union types. `BookStage`, `Role` are `z.enum([...])` (string union). **Fix:** export TS `enum` mirroring the zod enum (or accept that `z.enum` is the project standard and update CLAUDE.md — escalate, don't unilaterally change).
67. [ARCH/L] No "godlike" classes today (good).

### Misc

68. [VALID/L] `books/router.ts` PATCH validates body via Zod but does *not* re-check title max(200) is consistent with create. **Fix:** share a single `BookFields` zod object, derive create+update via `.partial()`.
69. [ERR/L] `versions/router.ts:67` `Buffer.alloc(0)` for empty Yjs state — Yjs `applyUpdate(empty)` is a no-op (good) but the snapshot stored is meaningless. **Fix:** skip snapshot creation when state is null, return 409 with a descriptive code.
70. [ARCH/L] `modules/users/router.ts:buildMeResponse` belongs in a `service.ts`, not the router. Fold into the §"Architecture" cleanup wave.
71. [SEC/L] `app.ts` doesn't set `app.disable('x-powered-by')`. Trivial fingerprint leak.
72. [DEAD/L] Confirm `dist/` is git-ignored and not stale-shipped (repo has `dist/` tracked? `git status` is silent on it but verify). If not ignored, add to `.gitignore`.
73. [LOG/L] `lib/log.ts` is 22 LOC of bespoke wrapper. If we ever want request-id propagation we'll regret not using `pino-http`. Keep for now but flag.
74. [TEST/L] `vitest.config.ts` should set `pool: 'forks'` if any test mutates module-level state in `collab/presence.ts` (which it does). Otherwise tests can interleave and present spurious failures.

---

## 3. Refactor waves

Each wave is a self-contained PR. Stop and run `npm test` + `npm run build` between waves.

### Wave A — Type safety + dead code (issues #10, #12-18, #53-55, #71)
- Add `AuthedRequest` type, replace every `req: any`.
- Type all Hocuspocus callbacks.
- Type `buildThreadDto` and `projectAssignment` against zod-inferred DTOs.
- Delete `auth/betterAuth.ts`, fold `seed/devPassword.ts` into env once Wave C lands.
- `app.disable('x-powered-by')`.
- No behavior change. PR diff ~400 lines, mostly type annotations.

### Wave B — Split god routers (issues #7, #8, #9, #65, #70)
- `modules/comments/` → `router.ts | service.ts | policy.ts | dto.ts`.
- `modules/books/` → same shape; move `buildMeResponse` out of `users/router.ts`.
- `modules/access` → introduce `BookAccess` ADT (`kind` discriminator), update call sites.
- `seed/seed.ts` → split per domain.
- Pure restructuring; tests stay green without modification.

### Wave C — Security hardening (issues #19-28, #71)
- `env.ts`: require `DEV_SEED_PASSWORD`; validate `CORS_ORIGINS` (≥1, no `*` with credentials); refuse `ENABLE_DEV_AUTH=true` when `NODE_ENV=production`.
- `app.ts`: `helmet`, `hpp`, `express-rate-limit` (auth: 5/min/ip; pdf: 10/min/user; default: 200/min/ip).
- `users/router.ts` + `seed/seed.ts`: replace `String(err).includes('exists')` with `err.code === 'USER_ALREADY_EXISTS'`.
- `lib/access.ts`: filter out banned users.
- `pdf/router.ts`: disk storage + magic-byte sniff.
- `comments/router.ts:list`: rewrite EXISTS as JOIN (folds into #40).
- New tests for dev-auth gating (#58) and rate-limit headers (#62).

### Wave D — Validation + concurrency (issues #29-37, #68, #69)
- Add `.max()` to all string fields and array bounds.
- Dedup `initialAssignments`, return 409 on FK race.
- Drop `lastEditorByBook`; thread `userId` through Hocuspocus context into `persistence.store()` (#2).
- Versions router: 409 on empty Yjs state.
- New size-limit tests (#61).

### Wave E — Schema + perf (issues #38-47)
- Migration: `pgEnum` for `book.stage`; drop check constraint.
- Migration: `assignment_book_id_idx`, `comment_thread_book_author_idx`.
- Rewrite `listVisibleBooks` as one query.
- `buildMeResponse` single GROUP BY.
- `users/router.ts` pagination.
- ADR for `bookYjsState` future-proofing.
- Test: snapshot roundtrip (#63).

### Wave F — Permissions matrix + AI stub (issues #4, #5, #6, #66)
- Single `RoleEnum` source of truth in `lib/permissions.ts`.
- `mergePermissions` driven by `Object.keys(zeroPerms)`.
- AI router behind `AI_PROVIDER` env, default 501.
- Decide on `enum` vs `z.enum` per CLAUDE.md (#66) — escalate to user before coding.

### Wave G — Tests (remaining test gaps)
- Permission escalation matrix (#57).
- Concurrency: book create FK race, comment delete vs reply (#59).
- Comment list filter cross-product (#60).
- `vitest pool: forks` if needed (#74).

### Wave H — Logging cleanup (#48-52, #73)
- `errorMiddleware` logs all branches at appropriate levels.
- AppError carries structured details (threadId, bookId).
- Replace remaining `console.*` in seed/migrate/reset/collab.
- `collab/auth.ts` warns on rejected origin.

---

## 4. Out of scope (this doc)

- Frontend changes (separate plan exists).
- Migrating off Express. Hono/Fastify is a bigger conversation; flagged but not planned.
- Redis-backed presence. Single-process is fine for now per #1.
- Full pino-http adoption (#73).
- Auth provider swap. better-auth stays.

---

## 5. Adverse-review corrections (Codex pass, 2026-05-03)

### Drop — claim was wrong (verified against code)

- **Drop #65** (BookAccess ADT). `lib/access.ts:13` already defines `BookAccess = { kind: 'notFound' } | { kind: 'forbidden' } | { kind: 'visible', ... }`. Plan misread it. **Wave B** loses this scope.
- **Drop #68** (PATCH book title bound). `modules/books/schemas.ts:39` already has `title.min(1).max(200)` on `UpdateBookBody`. **Wave D** loses this item.
- **Drop #34** (snapshot label bound). `modules/versions/schemas.ts:15` already has `.min(1).max(120)`. **Wave D** loses this item.
- **Refine #58** (dev-auth tests). `tests/collab.dev-fallback.test.ts` covers the WS dev-auth fallback path. The HTTP `/api/auth/dev/*` 404-when-disabled test is still missing — keep #58 narrowed to that.
- **Drop #74** (vitest pool: forks). `vitest.config.ts` already sets `fileParallelism: false` and `sequence.concurrent: false`. The presence-Map race can't happen with the current config.

### Soften — proposed fix was worse than status quo

- **Revise #1** (single-process guardrail). `env.ts:18` already exposes `PRESENCE_API_ENABLED` with an explicit INVARIANT comment pointing at `collab/server.ts`, and the endpoint can return 501 in multi-process mode. Hard-failing boot via `COLLAB_SINGLE_PROCESS=1` is over-engineering. **New plan:** drop the boot assertion; keep #2 (persisting `updatedById` directly from collab context — that's the actual correctness bug).
- **Revise #43** (book stage → pgEnum). Codex flag: enums are *harder* to extend than CHECK constraints (Postgres enum alters are awkward; `add value if not exists` is fine but reordering/removing values needs a rebuild). Status quo: `text + CHECK` constraint is editable in one migration. **New plan:** keep `text + CHECK`; the real fix is sharing one `BookStage` constant between Drizzle, Zod, and the CHECK migration so they can't drift. Folds into wave F (#4/#5).
- **Revise #11** (drop `toIsoOrThrow` call sites). Centralised conversion is a feature when Drizzle types vary across drivers (`Date` vs `string`). **New plan:** drop the issue entirely.
- **Revise #28** (helmet/hpp/compression bundle). Adopt `helmet` only (CSP off — frontend handles it); skip `compression` (reverse proxy does it) and `hpp` (no array-style query parsing in routers today). Smaller surface, fewer surprises.
- **Revise #56** (convert all OpenAPI params to `paramsObj`). Style churn. **New plan:** opportunistic only — don't open a PR for it.

### Wave reshuffle

- **Wave B** (#7-9 splits + #70) is now genuinely "pure restructuring" since #65 is gone. Keep tests untouched.
- **#40** (rewrite EXISTS → JOIN) appeared in both Wave C and Wave E. **Owner:** Wave C, alongside the rate-limit + comments-list test work. Remove from Wave E.

### Add — issues the plan missed

- **75 [SEC/H]** `modules/users/router.ts:82` `GET /api/users` returns the entire user table (no pagination, no projection). Today fine; at any meaningful user count it's an unbounded read + privacy footgun. **Fix:** `limit/offset` with `max(limit) = 200`, projection through `userPublicCols`. Folds into Wave C.
- **76 [ARCH/M]** `modules/users/schemas.ts:4` defines `SystemRoleEnum = z.enum(['admin', 'project_manager']).nullable()` as a literal that duplicates the canonical `SystemRole` typing implied by `lib/permissions.ts:isAdmin`. Drift risk identical to #4. **Fix:** export one `SystemRole` constant + zod enum from `lib/permissions.ts`; import in users/schemas. Folds into Wave F.
- **77 [LOG/L]** Already partially captured by #51 — Codex confirmed the `collab/server.ts:27` `console.log` still fires at module load. No new issue, but #51 stays as-written.

### Net effect

- Issue count: 74 − 5 dropped + 2 added = **71 active issues**.
- Waves: A unchanged; B leaner (no #65); C bigger (gains #40, #75); D smaller (loses #34, #68); E smaller (loses #43 reshape, #40); F gains #76; G smaller (loses #58 wide form, keeps narrow form); H unchanged.

### Still open (not resolved by this pass)

- **#66** (TS `enum` vs `z.enum` per CLAUDE.md). Needs user input. Don't code Wave F until we agree.
- **#42** (Yjs state size cap / compression). Codex didn't push back, but no decision on the threshold. Defer to ADR.

