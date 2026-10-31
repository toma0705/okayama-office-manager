import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'coverage/**',
    'node_modules/**',
    'src/generated/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      // 使っていない変数・引数は消す。わざと受け取るだけの引数は `_` で始める
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    // テストではモックの型付けを簡単にするため any と require を許す
    files: ['__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
]);
