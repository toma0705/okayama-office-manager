import nextJest from 'next/jest';

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

  reporters: (process.env.CI
    ? ([
        'default',
        [
          'jest-junit',
          {
            outputDirectory: '.',
            outputName: 'junit.xml',
            ancestorSeparator: ' › ',
            usePathForSuiteName: 'true',
          },
        ],
      ] as [string, any] | (string | [string, any])[])
    : undefined) as unknown as import('@jest/types').Config.InitialOptions['reporters'],
};

export default createJestConfig(customJestConfig);
