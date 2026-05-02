# Frontend Refactor — Baseline (Phase 0)

Captured 2026-05-02 against branch `main` HEAD.

## Scripts

- `npm run typecheck` — **FAIL** (2 pre-existing `TS2589` errors in `containers/coordinator/components/BooksList.tsx:16,61` — type instantiation excessively deep). Tracked as a known issue; refactor will eliminate.
- `npm run lint` — **PASS** (no warnings, no errors at baseline rule set).
- `npm run test` — **PASS** (35 tests across 11 files).
- `npm run check-locales` — **PASS** ("[locales] all namespaces match").
- `npm run build` — **FAIL** (same `tsc -b` errors as typecheck; vite build not reached).

## Bundle sizes (gzip, current `dist/assets/`)

| File | gzip bytes |
|---|---:|
| BookEditorPage-*.js | 258,881 |
| index-EOP-*.js | 212,141 |
| index-Cqbi-*.js | 130,078 |
| index-BdO2-*.js | 100,270 |
| BookEditorPage-*.css | 10,289 |
| index-xWmW-*.css | 7,005 |

## Cleanup

- Deleted `frontend/openapi-ts-error-1777375863881.log` and `frontend/openapi-ts-error-1777385091361.log`.
- Added `openapi-ts-error-*.log` to `frontend/.gitignore`.
- Added `test:watch` script to `frontend/package.json`.

## Known issues to fix during refactor

1. `BooksList.tsx` `formatLastActivity` typing recursion — Phase 46 (dedupe) and Phase 72 (`BookCardModel`) will refactor away the offending generic.
2. Many hardcoded user-visible strings — Wave B / Phases 5–23.
3. Two avatar / role / toast / import implementations — Waves D/E.
