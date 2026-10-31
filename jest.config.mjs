// @ts-check
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // 結合テストは jest.integration.config.mjs で別に実行する
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/__tests__/integration/'],
  collectCoverageFrom: [
    'src/app/api/**/*.ts',
    'src/lib/**/*.ts',
    'src/utils/**/*.ts',
    '!**/*.d.ts',
    '!src/generated/**',
  ],
  coverageReporters: ['text-summary', 'html', 'lcov'],
  // テストを書かずにコードを増やすと CI が落ちるようにする（今の値より少し低め）
  coverageThreshold: {
    global: { statements: 90, branches: 80, functions: 90, lines: 90 },
  },
};

export default createJestConfig(config);
