import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [{
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

        // Phase 2 — ban relative cross-directory imports (../ only; same-dir ./ is allowed)
        // Phase 3 — warn on hardcoded JSX text
        // NOTE: no-restricted-syntax takes a single severity for all selectors.
        // Both rules are set to 'warn' here; Phase 24 will promote the import ban to 'error'
        // once the i18n sweep (phases 5-23) is complete and the JSX-text rule is also promoted.
        "no-restricted-syntax": [
            "warn",
            {
                "selector": "ImportDeclaration[source.value=/^\\.\\.\\//]",
                "message": "Use @/ alias instead of ../ for cross-directory imports.",
            },
            {
                "selector": "JSXText[value=/[A-Z][a-z]+ /]",
                "message": "Hardcoded text in JSX — wrap in t().",
            },
        ],
    }
}];
