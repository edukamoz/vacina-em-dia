/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    // Em teste o domínio compartilhado vem do código-fonte, sem exigir `npm run build`.
    '^@vacina/shared$': '<rootDir>/../../packages/shared/src/index.ts',
  },
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/test-utils.tsx'],
  coverageThreshold: { global: { branches: 80, functions: 80, lines: 80, statements: 80 } },
};
