// @ts-check
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  collectCoverageFrom: [
    'src/app/api/**/*.ts',
    'src/lib/**/*.ts',
    'src/utils/**/*.ts',
    '!**/*.d.ts',
    '!src/generated/**',
  ],
  coverageReporters: ['text-summary', 'html', 'lcov'],
};

export default createJestConfig(config);
