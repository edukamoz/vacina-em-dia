/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  // Em teste o domínio compartilhado vem do código-fonte, sem exigir `npm run build`.
  moduleNameMapper: { '^@vacina/shared$': '<rootDir>/../../packages/shared/src/index.ts' },
  testMatch: ['**/*.test.ts'],
  // As funções em src/functions só registram o handler no SDK; a regra está em src/handlers.
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts', '!src/functions/**'],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 },
  },
};
