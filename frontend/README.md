# Frontend — Developer Onboarding

## Overview

Przeswity is a collaborative book-editing platform. The frontend is built with
React + Vite, routing via TanStack Router (file-based), data fetching via
TanStack Query (react-query), and rich-text editing via Tiptap + Yjs for
real-time collaboration. UI primitives come from shadcn/ui (Radix-based).
Internationalization covers Polish, English, and Ukrainian (pl is canonical).

---

## Directory Layout

```
src/
    api/                  Generated API client + fetch interceptors
        client.ts         Configured @hey-api/client-fetch instance
        interceptors.ts   Auth token injection, 401 handling
        generated/        Auto-generated types + react-query helpers (do not edit)

    app/
        queryClient.ts    Global TanStack Query client
        router.ts         TanStack Router instance with auth context

    auth/
        client.ts         Session fetch + token refresh
        types.ts          SessionUser, UserRole enum

    components/           Shared UI components (not page-specific)
        badges/           Status / stage badge chips
        feedback/         ConfirmDialog, LinkPromptDialog, EmptyState, PresenceDot
        forms/            Reusable form field wrappers
        layout/           Page shell, sidebar, topbar primitives
        people/           Avatar, user-name display
        tables/           Sortable / paginated table primitives
        ui/               shadcn/Radix primitives (Button, Dialog, Input, …)

    containers/           Page-scoped feature modules
        admin/            User management, role assignment
        auth/             Login, logout pages
        books/            Book list, book card, book detail
        coordinator/      Coordinator dashboard
        editor/           Editor page shell (delegates to src/editor/)
        settings/         Profile / account settings

    editor/               Tiptap + Yjs collaboration engine
        ai/               AI-assist feature
        app/              EditorApp context + provider
        collab/           Hocuspocus provider, presence awareness
        comments/         Inline comment threads
        constants.ts      Editor-level magic numbers (see Constants section)
        diff/             Version diff renderer
        glossary/         Glossary lookup extension
        identity/         Local user identity for Yjs awareness
        io/               Import/export: markdown, DOCX, typography presets
        meta/             Document metadata (title, author, …)
        outline/          Heading outline panel
        shell/            Editor chrome (toolbar, sidebars)
        suggestions/      Track-changes / suggestion mode
        tiptap/           Tiptap extensions, EditorView, EditorCanvas, toolbar
        types.ts          Editor-level shared types
        versions/         Version snapshots, auto-save
        workflow/         Stage workflow integration
        yjs/              Y.Doc helpers, sync utilities

    hooks/
        api/              Feature-scoped react-query hooks
            cache/        Invalidation helpers (see Cache section)
            useBookActions.ts
            useBooksDashboard.ts
            useLoginForm.ts
            useNewBookForm.ts
            useProfileSettings.ts
            useSessionPing.ts
            useBookContext.ts
        useFormDialog.ts  Generic dialog + form state hook

    i18n/
        index.ts          i18next initialisation
        i18next.d.ts      Type augmentation for namespace keys
        LanguageSwitcher.tsx
        useT.ts           Thin re-export of useTranslation

    lib/                  Pure helpers (no React)
        assert.ts         assertNever for exhaustive ADT switches
        auth.ts           Role predicates + requireRole
        constants.ts      App-level constants
        dates.ts          Date formatting helpers
        roleI18n.ts       Role -> display-label map
        routes.ts         Typed route-path builders
        stage.ts          Book-stage helpers
        status.ts         Booking-status helpers
        user.ts           User display-name helpers
        wordTarget.ts     Word-count target helpers

    locales/              i18n translation files (source of truth in src/)
        en/               common.json, admin.json, auth.json, coordinator.json,
                          editor.json, errors.json
        pl/               (same set — pl is canonical)
        ua/               (same set)

    routes/               TanStack Router file-based routes
        __root.tsx        Root layout, auth context injection
        _app.tsx          Authenticated layout
        _app/             Protected pages (books, coordinator, admin, settings, editor)
        _public.tsx       Unauthenticated layout
        _public/          Login page
        routeTree.gen.ts  AUTO-GENERATED — do not edit

    utils/
        react/            useDebouncedEffect, useStableCallback, withStop
        storage/          useLocalStorageState

    main.tsx              Vite entry point
    styles/globals.css    Tailwind base + CSS custom properties
```

---

## i18n Workflow

Translation files live in `src/locales/{pl,en,ua}/`. **Polish is canonical** —
add keys to `pl/` first, then mirror to `en/` and `ua/`.

Each locale has multiple namespaces (files): `common`, `admin`, `auth`,
`coordinator`, `editor`, `errors`.

**Key naming convention**

```
pages.<pageName>.<section>.<element>
components.<componentName>.<element>
global.<action>             # save, cancel, delete, confirm, close …
global.labels.<label>       # name, email, date …
global.messages.<type>      # success, error, loading …
```

**Usage in components**

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

<Button>{t('global.save')}</Button>
<p>{t('components.deleteDialog.confirmMessage')}</p>
```

**Parity check** — run `npm run check-locales` to verify that every key present
in `pl/` also exists in `en/` and `ua/`.

---

## Forms Pattern

`useFormDialog<T>` (`@/hooks/useFormDialog`) manages open state, form values,
and toast feedback for modal forms.

```ts
import { useFormDialog } from '@/hooks/useFormDialog';

const dialog = useFormDialog({ title: '' }, { successKey: 'global.messages.success' });

// Open with pre-filled values
dialog.openWith({ title: 'Existing title' });

// On submit
await mutate(dialog.values);
dialog.toastSuccess();   // shows i18n toast (pass successKey: false to suppress)
dialog.close();
```

API: `{ open, values, setValues, openWith, close, reset, toastSuccess, toastError }`.

For imperative confirm/prompt replacements use:
- `useConfirmDialog` + `<ConfirmDialogHost>` (`@/components/feedback/`)
- `useLinkPromptDialog` + `<LinkPromptDialog>` (`@/components/feedback/`)

---

## Cache Invalidation

react-query is the client-side source of truth. Do **not** write to the query
cache directly. After mutations, call the appropriate invalidation hook from
`@/hooks/api/cache/`:

| Hook | Invalidates |
|------|-------------|
| `useInvalidateBooks` | book list + book detail queries |
| `useInvalidateBookAssignments` | assignment queries |
| `useInvalidateUsers` | user list queries |
| `useInvalidateMe` | current session/profile queries |

**Mutation hook pattern**

```ts
import { bookPatchStageMutation } from '@/api/generated/@tanstack/react-query.gen';
import { useInvalidateBooks } from '@/hooks/api/cache/useInvalidateBooks';

export function useBookStageActions() {
    const invalidateBooks = useInvalidateBooks();

    const patchStage = useMutation({
        ...bookPatchStageMutation(),
        onSuccess: async () => {
            await invalidateBooks();
        },
    });

    return { patchStage };
}
```

---

## Role / Permission Matrix

| Role | canAccessAdmin | canAccessCoordinator | canCreateBooks |
|------|----------------|----------------------|----------------|
| Admin | yes | yes | yes |
| ProjectManager | no | yes | yes |
| (other) | no | no | no |

Helpers in `@/lib/auth.ts`: `isAdmin`, `isProjectManager`,
`canAccessCoordinator`, `canAccessAdmin`, `canCreateBooks`, `requireRole`.

**Route gating**

```ts
export const Route = createFileRoute('/_app/coordinator')({
    beforeLoad: ({ context }) => {
        requireRole(context, canAccessCoordinator);
    },
    component: CoordinatorPage,
});
```

`requireRole` throws a redirect to login when the condition is not met.

---

## Constants

Do not put magic numbers inline in components or hooks.

| File | What lives there |
|------|-----------------|
| `@/lib/constants.ts` | App-level constants |
| `@/editor/constants.ts` | `RECONNECT_RETRY_INTERVAL_MS`, `AWARENESS_ACTIVITY_THROTTLE_MS`, `VERSIONS_AUTO_KEEP`, `VERSIONS_PERSIST_DEBOUNCE_MS`, `A4_PAGE_HEIGHT_PX`, `A4_PAGE_WIDTH_PX`, `A4_MARGIN_PX`, `BLOCK_DROP_MIDPOINT_RATIO` |
| `@/editor/io/typography/constants.ts` | `BLOCK_TYPOGRAPHY_PRESETS`, `FONT_FAMILIES`, `PAGE` |

---

## How to Add X

### A new page

1. Create `src/routes/_app/<path>.tsx`:

```ts
import { createFileRoute } from '@tanstack/react-router';
import { MyPage } from '@/containers/myFeature/MyPage';

export const Route = createFileRoute('/_app/my-path')({
    component: MyPage,
});
```

2. Container at `src/containers/<feature>/MyPage.tsx`.
3. Add i18n keys to all three locales under `pages.myPage.*`.

### A new mutation

Derive from the generated helpers; wrap in a hook under `@/hooks/api/`:

```ts
import { myResourceCreateMutation } from '@/api/generated/@tanstack/react-query.gen';
import { useInvalidateBooks } from '@/hooks/api/cache/useInvalidateBooks';

export function useCreateResource() {
    const invalidate = useInvalidateBooks();
    return useMutation({
        ...myResourceCreateMutation(),
        onSuccess: async () => { await invalidate(); },
    });
}
```

### A gated route

```ts
beforeLoad: ({ context }) => { requireRole(context, canAccessAdmin); },
```

### A new editor extension

1. Create the extension file under `src/editor/tiptap/extensions/`.
2. Register it in `src/editor/tiptap/hooks/useEditorInit.ts`.
3. Toolbar / bubble-menu UI goes in `src/editor/tiptap/`.
4. Cross-cutting state (Yjs, collab) goes in the relevant `src/editor/<domain>/` module.

---

## Code Conventions

Full guidelines: [/CLAUDE.md](../CLAUDE.md).

- **Imports**: always use the `@/` alias. Never use `../` or `./` for
  cross-directory imports.
- **Formatting**: 4-space indent, semicolons, ESLint clean (`npm run lint`).
- **Enums**: use TypeScript string enums for related constants instead of raw
  string literals.
- **ADTs**: use a `kind` discriminator field and `assertNever` (`@/lib/assert`)
  for exhaustive switches. Avoid optional `| undefined` sibling fields.
- **File size**: keep files under 600 LOC; split by domain when they grow.
- **Strings**: all user-visible text via `t()` — no hardcoded strings in JSX.
- **Comments**: only for non-obvious behaviour, browser quirks, or non-trivial
  domain logic.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server on port 3000 |
| `npm run build` | Type-check + production Vite build |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm run lint` | ESLint across the project |
| `npm run test` | Vitest run (single pass) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run check-locales` | Verify i18n key parity across pl / en / ua |
| `npm run gen-api` | Regenerate API client from OpenAPI spec |

---

## Testing

Framework: **vitest** + **@testing-library/react**.

- Test files live next to source as `*.test.ts` or `*.test.tsx`.
- Use `new Y.Doc()` directly — do not mock Yjs.
- Mock external side-effect libraries (e.g. `sonner`, `react-i18next`) only
  when the test is not about their behaviour.
- Pure helpers in `@/lib/` and `@/editor/io/` should have unit tests with no
  DOM or React setup needed.
