import type { NewsItem } from '@vacina/shared';
import type { OfficialNewsClient } from '../clients/official-news-client';
import { createNewsHandlers } from '../handlers/news';
import { createFixedWindowLimiter } from './rate-limiter';
import { createNewsService, NEWS_NOTICE, NEWS_SOURCE } from './news-service';

const NEWS: NewsItem[] = [
  {
    title: 'Campanha de vacinação',
    url: 'https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/outubro/a',
    publishedAt: '2026-10-19',
    vaccineRelated: true,
  },
];

function setup(fetchLatest: OfficialNewsClient['fetchLatest']) {
  const clock = { now: '2026-10-21T12:00:00.000Z' };
  const client = { fetchLatest: jest.fn(fetchLatest) };
  const reportError = jest.fn();
  const service = createNewsService({
    client,
    limiter: createFixedWindowLimiter(() => clock.now),
    clock: () => clock.now,
    timeoutMs: 50,
    reportError,
  });
  return { service, clock, client, reportError };
}

describe('serviço de novidades de saúde', () => {
  test('CT-NEW-10: devolve as notícias com fonte, data da leitura e aviso', async () => {
    const { service } = setup(async () => NEWS);
    const result = await service.latest('dono');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toEqual(NEWS);
    expect(result.value.source).toEqual(NEWS_SOURCE);
    expect(result.value.notice).toBe(NEWS_NOTICE);
    expect(result.value.updatedAt).toBe('2026-10-21T12:00:00.000Z');
  });

  test('CT-NEW-11: lê o feed uma vez por hora (cópia) e de novo depois disso', async () => {
    const { service, clock, client } = setup(async () => NEWS);
    await service.latest('dono');
    await service.latest('outro');
    expect(client.fetchLatest).toHaveBeenCalledTimes(1);
    clock.now = '2026-10-21T12:59:59.000Z';
    await service.latest('dono');
    expect(client.fetchLatest).toHaveBeenCalledTimes(1);
    clock.now = '2026-10-21T13:00:01.000Z';
    await service.latest('dono');
    expect(client.fetchLatest).toHaveBeenCalledTimes(2);
  });

  test('CT-NEW-12: chamadas ao mesmo tempo compartilham uma única leitura', async () => {
    const { service, client } = setup(async () => NEWS);
    await Promise.all([service.latest('a'), service.latest('b'), service.latest('c')]);
    expect(client.fetchLatest).toHaveBeenCalledTimes(1);
  });

  test('CT-NEW-13: se o feed falha sem cópia, responde lista vazia e registra só o tipo do erro', async () => {
    const { service, reportError } = setup(async () => {
      throw new TypeError('detalhe interno');
    });
    const result = await service.latest('dono');
    expect(result.ok && result.value.items).toEqual([]);
    expect(result.ok && result.value.updatedAt).toBeNull();
    expect(reportError).toHaveBeenCalledWith('TypeError');
  });

  test('CT-NEW-14: se o feed falha depois de uma leitura boa, mantém a última cópia', async () => {
    let falhar = false;
    const { service, clock } = setup(async () => {
      if (falhar) throw new Error('fora do ar');
      return NEWS;
    });
    await service.latest('dono');
    falhar = true;
    clock.now = '2026-10-21T14:00:00.000Z';
    const result = await service.latest('dono');
    expect(result.ok && result.value.items).toEqual(NEWS);
    expect(result.ok && result.value.updatedAt).toBe('2026-10-21T12:00:00.000Z');
  });

  test('CT-NEW-15: passando de 30 consultas em 10 minutos, bloqueia com o tempo de espera', async () => {
    const { service } = setup(async () => NEWS);
    for (let i = 0; i < 30; i += 1) expect((await service.latest('dono')).ok).toBe(true);
    const result = await service.latest('dono');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatchObject({ code: 'RATE_LIMITED', scope: 'news' });
    expect(result.error.retryAfterSeconds).toBeGreaterThan(0);
    expect((await service.latest('outra-pessoa')).ok).toBe(true);
  });

  test('CT-NEW-16: o handler responde 200 com o corpo e 429 com a mensagem de novidades', async () => {
    const { service } = setup(async () => NEWS);
    const handlers = createNewsHandlers(service);
    const ok = await handlers.latest('dono');
    expect(ok.status).toBe(200);
    for (let i = 0; i < 29; i += 1) await handlers.latest('dono');
    const limite = await handlers.latest('dono');
    expect(limite.status).toBe(429);
    expect(JSON.stringify(limite.jsonBody)).toContain('novidades');
  });
});
