# Refactor Baseline

Captured: 2026-04-29

---

## 1. typecheck (`npm run typecheck`)

**Exit code:** 0 (success)

**Summary:** No TypeScript errors.

```
> typecheck
> tsc -b --noEmit
```

---

## 2. lint (`npm run lint`)

**Exit code:** 1 (KNOWN EXISTING FAILURE)

**Summary:** 4 errors — all `react-hooks/exhaustive-deps` rule not found (ESLint plugin missing from config).

```
> lint
> eslint .

/Users/kkragoth/dev/przeswity/frontend/src/editor/comments/CommentAnchors.tsx
  80:5  error  Definition for rule 'react-hooks/exhaustive-deps' was not found  react-hooks/exhaustive-deps

/Users/kkragoth/dev/przeswity/frontend/src/editor/editor/slash/SlashMenu.tsx
  240:5  error  Definition for rule 'react-hooks/exhaustive-deps' was not found  react-hooks/exhaustive-deps

/Users/kkragoth/dev/przeswity/frontend/src/editor/versions/VersionsPanel.tsx
  118:5  error  Definition for rule 'react-hooks/exhaustive-deps' was not found  react-hooks/exhaustive-deps

/Users/kkragoth/dev/przeswity/frontend/src/routes/_app/settings/index.tsx
  54:19  error  Definition for rule 'react-hooks/exhaustive-deps' was not found  react-hooks/exhaustive-deps

✖ 4 problems (4 errors, 0 warnings)
```

---

## 3. test (`npm test -- --run`)

**Exit code:** 0 (success)

**Summary:** 1 test file, 14 tests — all passed.

```
> test
> vitest run --run

 RUN  v2.1.9 /Users/kkragoth/dev/przeswity/frontend

 ✓ src/editor/io/typography.test.ts (14 tests) 3ms

 Test Files  1 passed (1)
      Tests  14 passed (14)
   Start at  12:30:04
   Duration  443ms (transform 32ms, setup 0ms, collect 29ms, tests 3ms, environment 0ms, prepare 36ms)
```

---

## 4. build (`npm run build`)

**Exit code:** 0 (success)

**Summary:** Build succeeded. One chunk size warning (>500 kB) — pre-existing, not an error.

```
> build
> tsc -b && vite build

vite v5.4.21 building for production...
transforming...
(node:35074) ExperimentalWarning: Type Stripping is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
✓ 2609 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     0.79 kB │ gzip:   0.43 kB
dist/assets/index-c3Z1BP1z.css     80.48 kB │ gzip:  15.12 kB
dist/assets/index-BQ6rer7y.js   2,368.82 kB │ gzip: 701.17 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks
- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
✓ built in 4.51s
```
