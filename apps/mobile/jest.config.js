/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/src/jest-setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/jest-setup-depois.ts'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // Em teste o domínio compartilhado vem do código-fonte, sem exigir `npm run build`.
    '^@vacina/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/test-utils.tsx',
    '!src/jest-setup.ts',
    '!src/jest-setup-depois.ts',
    '!src/**/test-fixtures.ts',
  ],
  coverageThreshold: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } },
};
