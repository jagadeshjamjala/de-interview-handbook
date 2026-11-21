import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/build/**',
      '**/.docusaurus/**',
      '.venv/**',
      '**/static/duckdb/**',
      '**/static/pyodide/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {'react-hooks': reactHooks},
    rules: reactHooks.configs.recommended.rules,
    languageOptions: {globals: {...globals.browser, ...globals.node}},
  },
  {
    // Module Web Worker for the Python playground.
    files: ['apps/website/static/*.mjs'],
    languageOptions: {globals: globals.worker},
  },
  prettier,
);
