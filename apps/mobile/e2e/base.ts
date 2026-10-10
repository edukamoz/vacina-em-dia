import { test as base, expect } from '@playwright/test';
import { HOJE, instalarApiFalsa, type EstadoDaApi } from './api-falsa';

/**
 * `test` dos testes de ponta a ponta: cada teste ganha uma API falsa nova (`api`) e um relógio
 * travado em `HOJE`, para as datas e os estados das doses não mudarem de um dia para o outro.
 */
export const test = base.extend<{ api: EstadoDaApi }>({
  // `auto`: toda página de teste ganha a API falsa e o relógio travado, mesmo sem pedir `api`.
  api: [
    async ({ page }, use) => {
      await page.clock.setFixedTime(new Date(`${HOJE}T12:00:00-03:00`));
      await use(await instalarApiFalsa(page));
    },
    { auto: true },
  ],
});

export { expect };

/** Senha usada nos testes (a API falsa só aceita esta no login). */
export const SENHA = 'uma frase longa é melhor';
