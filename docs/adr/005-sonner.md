# ADR 005: Sonner as the Single Toast Library

- Status: Accepted
- Date: 2026-05-02

## Context

The application accumulated multiple notification surfaces over time:

- Inline error banners inside forms.
- `window.alert` / `window.confirm` for confirmations.
- A custom `useToast` hook in `@/editor/shell/useToast.ts` that stored toast
  state in React and rendered it from the editor shell.
- Isolated `sonner` calls in a few newer components.

This produced inconsistent visuals (different stacking positions, durations,
and styles) and made it hard to test notification behavior (each approach
required different test setup).

The `useToast` hook in `@/editor/shell/useToast.ts` passed a `show` callback
through several component layers so toasts could be triggered from children
without access to a global — a prop-drilling smell that pointed to the lack
of a global toast API.

## Decision

**Standardize on `sonner` for all transient notifications.**

- All toast calls use `toast.success(...)` / `toast.error(...)` /
  `toast.info(...)` from the `sonner` package.
- The `<Toaster>` component is mounted once at the app root.
- `useFormDialog`'s `toastSuccess` / `toastError` helpers are the standard
  entry point for form-level toasts; they resolve i18n keys from the `common`
  namespace before calling `sonner`.
- `@/editor/shell/useToast.ts` is kept for the editor's internal `onToast`
  prop interface (bridging imperative callbacks from deep child components to
  the toast surface), but its implementation delegates to `sonner`.

**Modal confirmations and prompts** use `ConfirmDialog` and `LinkPromptDialog`
components (Radix-based) instead of `window.confirm` / `window.prompt`. These
are not toast notifications and are out of scope for this ADR.

## Consequences

**Positive:**
- One visual toast surface; consistent position, duration, and styling across
  the app.
- Tests mock `sonner` once at the module level to assert notification
  behavior across all features.
- i18n integration is centralized in `useFormDialog`; ad-hoc `t()` calls
  before `toast()` are no longer needed at each call site.

**Negative / Trade-offs:**
- `sonner` toasts are fire-and-forget. Features that need the user to
  acknowledge a message (destructive actions) must use `ConfirmDialog`, not
  a toast.
- The `onToast` prop on some editor components is still present as a
  compatibility shim; it can be removed once all callers migrate to calling
  `sonner` directly or through `useFormDialog`.
