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
        "react-hooks/exhaustive-deps": "warn"
    }
}];
