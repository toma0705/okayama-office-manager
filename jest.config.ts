import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/src/generated/'],
  collectCoverageFrom: [
    'src/utils/**/*.{ts,tsx}',
    'src/app/api/**/*.{ts,tsx}',
    'src/lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!src/generated/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'] as unknown as NonNullable<
    import('@jest/types').Config.InitialOptions['coverageReporters']
  >,
};

export default createJestConfig(customJestConfig);
