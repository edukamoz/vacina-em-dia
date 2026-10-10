import { defineConfig } from '@playwright/test';

/**
 * Testes de ponta a ponta do app web (Playwright). Eles rodam sobre o build web (`npm run build`,
 * pasta `dist`) servido em `localhost:4173`, com uma API falsa instalada no navegador
 * (`e2e/api-falsa.ts`): não precisam de Azure, banco nem rede.
 *
 * Localmente, `E2E_CANAL=chrome` usa o Chrome instalado no computador; no CI, o Chromium baixado
 * pelo `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'e2e/relatorio', open: 'never' }]],
  outputDir: 'e2e/resultados',
  use: {
    baseURL: 'http://localhost:4173',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    viewport: { width: 1280, height: 800 },
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...(process.env.E2E_CANAL ? { channel: process.env.E2E_CANAL } : {}),
  },
  webServer: {
    command: 'node e2e/servidor-estatico.mjs',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
