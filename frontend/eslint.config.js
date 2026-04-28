import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [{
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
        "indent": ["error", 4, { "SwitchCase": 1 }],
        "@typescript-eslint/array-type": "off",
        "@typescript-eslint/no-unnecessary-condition": "off",
        "@typescript-eslint/consistent-type-imports": "off",
        "semi": ["error", "always"]
    }
}];
