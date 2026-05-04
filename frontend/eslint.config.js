import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { '@typescript-eslint': tseslint, 'react-hooks': reactHooks },
        rules: {
            "indent": ["error", 4, { "SwitchCase": 1 }],
            "@typescript-eslint/array-type": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/consistent-type-imports": "off",
            "semi": ["error", "always"],
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // Phase 1 — warn on dangerous patterns
            // NOTE: @typescript-eslint/no-floating-promises requires type-aware parserOptions.project,
            // which significantly slows down lint on this codebase. Skipped for now.
            // TODO: enable once parserOptions.project is configured (or tsc --noEmit covers it).
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "no-console": ["warn", { "allow": ["warn", "error"] }],

            // Ban relative cross-directory imports (../ only; same-dir ./ is allowed)
            // and ban hardcoded JSX text — all user-visible strings must go through t().
            // no-restricted-syntax takes a single severity for all selectors; both are 'error'.
            "no-restricted-syntax": [
                "error",
                {
                    "selector": "ImportDeclaration[source.value=/^\\.\\.\\//]",
                    "message": "Use @/ alias instead of ../ for cross-directory imports.",
                },
                {
                    "selector": "JSXText[value=/[A-Z][a-z]+ /]",
                    "message": "Hardcoded text in JSX — wrap in t().",
                },
            ],
        },
    },
    {
        // T-62 — guard against re-introducing deleted comment hooks/context.
        files: ['src/containers/editor/components/comments/**/*.{ts,tsx}'],
        languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
        plugins: { '@typescript-eslint': tseslint, 'react-hooks': reactHooks },
        rules: {
            "no-restricted-imports": ["error", {
                patterns: [
                    {
                        group: [
                            '**/hooks/useCommentCallbacks*',
                            '**/hooks/useCommentDrafts*',
                            '**/hooks/useCommentThreads*',
                            '**/components/comments/CommentsContext*',
                        ],
                        message: 'Use commentsStore (T-57). These hooks were deleted in Wave 4.',
                    },
                ],
            }],
        },
    },
];
