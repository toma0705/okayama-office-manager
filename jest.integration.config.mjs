// @ts-check
// 結合テスト（本物の Postgres を使う）の設定。npm run test:integration で実行する
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/__tests__/integration/**/*.test.ts'],
  setupFiles: ['<rootDir>/__tests__/integration/setup.ts'],
  // 1 つの DB を使い回すので、テストファイルを順番に実行する
  maxWorkers: 1,
};

export default createJestConfig(config);
