# ADR 003: useFormDialog Standardizes Form Modal State

- Status: Accepted
- Date: 2026-05-02

## Context

Form modals (create user, edit user, add glossary entry, etc.) each needed:
- An `open` boolean.
- A `values` state object pre-populated for edit flows.
- A way to open with or without pre-filled values (`open` vs `openWith`).
- A `close` that resets values.
- Toast notifications on success and error.

Each dialog implemented this ad-hoc. Toast keys were inconsistent — some used
`t('saved')`, others `t('error')`, others had no toast at all. Tests had to
mock sonner per-file. The pattern was copy-pasted and diverged across dialogs.

## Decision

`@/hooks/useFormDialog<T>(initial, opts?)` provides a single implementation:

    const { open, values, setValues, openWith, close, reset,
            toastSuccess, toastError } = useFormDialog(initial, opts);

- `openWith(partial?)` merges partial into `initial` and sets `open = true`.
- `close()` sets `open = false` and resets values to `initial`.
- `toastSuccess()` calls `sonner.toast.success(t(opts.successKey ?? 'messages.success'))`.
- `toastError()` calls `sonner.toast.error(t(opts.errorKey ?? 'messages.error'))`.
- Pass `successKey: false` or `errorKey: false` to suppress the respective
  toast entirely.

All i18n keys are resolved from the `common` namespace, so toast messages are
translatable and centrally catalogued.

## Consequences

**Positive:**
- All form dialogs have consistent open/close/reset/toast behaviour.
- Toast policy is explicit at each call site; suppression is opt-in not
  forgotten.
- Tests mock `sonner` once at the module level and cover all dialogs.
- Adding a new dialog is a one-liner: `useFormDialog<MyForm>({ field: '' })`.

**Negative / Trade-offs:**
- `openWith` always merges into `initial`, so deeply nested default values
  require explicit spread at the call site if partial overrides don't cover
  nested keys.
- Dialogs that need async validation or multi-step flows must layer additional
  state on top; `useFormDialog` only handles the open/values/toast lifecycle.
