import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/no-danger': 'off',
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Banned: XSS risk.' },
      ],
    },
  },
  { files: ['src/**/*.tsx'], ...jsxA11y.flatConfigs.strict },
  // Module boundaries (blueprint §4.1)
  {
    files: ['server/**/*.ts', 'api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: '(^|/)src/(?!shared/)', message: 'server/ may only import src/shared.' }] },
      ],
    },
  },
  {
    files: ['src/features/explorer/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ regex: 'features/(?!explorer)', message: 'Features must not import each other.' }] },
      ],
    },
  },
  {
    files: ['src/features/ticket-detail/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { regex: 'features/(?!ticket-detail)', message: 'Features must not import each other.' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            { name: 'react-router', message: 'src/ui is presentational: no router.' },
            { name: '@tanstack/react-query', message: 'src/ui is presentational: no data fetching.' },
          ],
        },
      ],
    },
  },
);
