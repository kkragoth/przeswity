# Permissions

How authorization works end-to-end. Required reading before touching any
route handler, Hocuspocus auth hook, or UI gating logic.

---

## Identity model

There are two orthogonal role axes:

### 1. System role (global, on `user.system_role`)

```ts
enum SystemRole {
  Admin          = 'admin',
  ProjectManager = 'project_manager',
}
```

`null` (the default) means "regular user — no system-wide privileges".

- **Admin** — full access to every book, every settings panel, every user.
- **ProjectManager** — can manage stage transitions and progress on books
  they coordinate; otherwise treated as a regular user.

### 2. Book role (per-book, in `assignment` table)

```ts
const BookRole = {
  Editor:      'editor',
  Proofreader: 'proofreader',
  Translator:  'translator',
  Author:      'author',
  Typesetter:  'typesetter',
  Coordinator: 'coordinator',
} as const;
```

A user can hold multiple roles on the same book; their effective
permissions are the **union** (`mergePermissions`).

The book's `createdById` user is the **owner** — implicit full
collaborative access regardless of assignments.

---

## Permission flags

`backend/src/lib/permissions.ts` defines a single shape consumed by both
backend authorization and frontend UI gating:

```ts
type Permissions = {
  canEdit:           boolean   // direct write to the document
  canSuggest:        boolean   // write track-changes only
  canComment:        boolean   // post / reply / react
  canResolve:        boolean   // resolve & reopen comment threads
  canManagePeople:   boolean   // assign roles to a book
  canDeleteBook:     boolean   // delete the book entirely
};
```

> Adding a permission: add a field to `zeroPerms` and grant it in
> `ROLE_PERMS` for the relevant roles. `mergePermissions` is data-driven so
> no fold logic to update.

---

## Role × permission matrix

| Role          | canEdit | canSuggest | canComment | canResolve | canManagePeople | canDeleteBook |
|---------------|:-------:|:----------:|:----------:|:----------:|:---------------:|:-------------:|
| editor        | ✓       |            | ✓          | ✓          |                 |               |
| typesetter    | ✓       |            | ✓          |            |                 |               |
| coordinator   |         |            | ✓          | ✓          | ✓               |               |
| proofreader   |         | ✓          | ✓          |            |                 |               |
| translator    |         | ✓          | ✓          |            |                 |               |
| author        |         | ✓          | ✓          |            |                 |               |

Special cases:

| Identity                         | Effective permissions |
|----------------------------------|-----------------------|
| **Admin** (system role)          | All flags `true` |
| **Book owner** (created the book) | All flags except `canDeleteBook` (kept admin-only at the route level) |
| **ProjectManager**               | Per-book role permissions PLUS stage/progress mutations |

> **`canEdit` vs `canSuggest` is mutually exclusive at the role level.** A
> user is either a "direct editor" (editor, typesetter) or a "suggest-only"
> contributor (proofreader, translator, author). Suggesting mode is forced
> on for proofreaders and authors (`useSuggestingMode`).

---

## Enforcement points

```
                         ┌──────────────────────────────┐
                         │  PermissionsForUser(roles)   │  ← single source of truth
                         └──────────────┬───────────────┘
                                        │
              ┌─────────────────────────┼──────────────────────────┐
              ▼                         ▼                          ▼
   ┌──────────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐
   │ REST routers         │  │ Hocuspocus onAuthent.  │  │ Frontend UI          │
   │ (modules/*/policy.ts)│  │ (collab/auth.ts)       │  │ (cosmetic only)      │
   │                      │  │ → readOnly flag        │  │                      │
   │ THROWS AppError      │  │ → roles in CollabCtx   │  │                      │
   └──────────────────────┘  └────────────────────────┘  └──────────────────────┘
```

### REST (the authoritative boundary)

- Every mutating route resolves session → loads book access via
  `loadBookAccess(bookId, user)` from `lib/access.ts`.
- `requireBookAccess(access)` narrows the union: throws `AppError(404)` for
  `notFound`, `AppError(403)` for `forbidden`, otherwise the visible arm is
  available.
- Policy helpers under each module's `policy.ts` (e.g.
  `assertCanManageStageOrProgress`, `assertCanEditBook`) implement the
  finer-grained checks.
- Errors emerge as `{ code, message }` envelopes via `lib/errors.ts`.

### Hocuspocus (WS) auth

`backend/src/collab/auth.ts::authenticate`:

1. Verifies request `Origin` against `CORS_ORIGINS`.
2. Reads BetterAuth cookie from upgrade headers.
3. Calls `getBookAccessByUserId(bookId, userId, systemRole)`.
4. Returns `{ user, roles, readOnly }`. The connection's `readOnly` flag is
   set so writes from this client are rejected at the WS layer.

> **`readOnly` is the only WS-side check** for mutation. Suggest-only roles
> are NOT read-only — they can write any update, and rely on the client's
> `SuggestionMode` to wrap edits into `insertion`/`deletion` marks. Server
> validation that rejects bare edits is a Stage-2 deliverable.

### Frontend (cosmetic only)

`useEditorSession().perms` is the `Permissions` shape returned from the
backend's `GET /books/:id` (or equivalent). Components hide buttons,
disable inputs, and pre-flight transitions based on this shape.

> **Never assume the UI gating is a security boundary.** A determined user
> can flip a flag in DevTools. Every action they invoke must still pass a
> backend check.

---

## Stage-1 caveats

1. **Suggest-only trust gap** — see above. Tracked.
2. **Role UI gating is incomplete** — F6 will gate panels per role. Today
   most users see the full editor UI.
3. **`canDeleteBook` is currently route-only**: only admins delete books;
   the owner-flag does NOT grant deletion. The Permissions shape just
   records this asymmetry; if you add a delete UI, gate it on
   `me.systemRole === 'admin'` rather than `canDeleteBook` until the
   ownership policy is finalised.

---

## Adding a permission — checklist

1. Add a field to `zeroPerms` in `lib/permissions.ts`.
2. Set it `true` in `ROLE_PERMS` for the appropriate roles.
3. If admins/owners should always have it, add it to the override returns
   at the bottom of `permissionsForUser`.
4. Add a backend assertion in the relevant module's `policy.ts` and call it
   from the route handler before the mutation.
5. Mirror the gating in the relevant frontend container as a UX nicety
   (disable buttons, pre-flight redirect) — but the backend assertion is
   what actually protects you.
6. Update the matrix above.

---

## Testing

- `backend/tests` covers permission checks per module (book mutations, stage
  transitions, comment ops, etc.).
- Each new permission MUST come with at least one allow + one deny test in
  the relevant module's test file.
