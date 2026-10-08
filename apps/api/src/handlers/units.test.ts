import { createUnitsHandlers } from './units';
import type { UnitsService } from '../services/units-service';
import { loadBundledUnits, parseUnitsDataset } from '../services/units-dataset';
import { createFixedWindowLimiter } from '../services/rate-limiter';
import { createUnitsService } from '../services/units-service';
import { unavailableOfficialUnitsClient } from '../clients/official-units-client';

const VALIDA = { lat: '-23.5466', lon: '-47.4378' };

function handlersComFalso() {
  const nearby = jest.fn<ReturnType<UnitsService['nearby']>, Parameters<UnitsService['nearby']>>(
    async () => ({
      ok: true,
      value: {
        items: [],
        source: { name: 'n', publisher: 'p', url: 'u', dataVersion: 'v', live: false },
        notice: 'aviso',
      },
    }),
  );
  return { handlers: createUnitsHandlers({ nearby }), nearby };
}

describe('handler de postos de saúde', () => {
  test('CT-UNI-30: converte os parâmetros da URL e aplica os padrões (10 km, 15 itens)', async () => {
    const { handlers, nearby } = handlersComFalso();
    const result = await handlers.nearby('dono', VALIDA);
    expect(result.status).toBe(200);
    expect(nearby).toHaveBeenCalledWith('dono', {
      lat: -23.5466,
      lon: -47.4378,
      radiusKm: 10,
      limit: 15,
    });
  });

  test.each([
    [{ lat: '100', lon: '-47' }, 'query.lat'],
    [{ lat: '-23', lon: '10' }, 'query.lon'],
    [{ lat: '-23', lon: '-47', radiusKm: '51' }, 'query.radiusKm'],
    [{ lat: '-23', lon: '-47', limit: '31' }, 'query.limit'],
    [{ lon: '-47' }, 'query.lat'],
    [{ lat: 'abc', lon: '-47' }, 'query.lat'],
  ])('CT-UNI-31: parâmetros inválidos %j viram 400 sem chamar o serviço', async (query, campo) => {
    const { handlers, nearby } = handlersComFalso();
    const result = await handlers.nearby('dono', query);
    expect(result.status).toBe(400);
    expect(JSON.stringify(result.jsonBody)).toContain(campo);
    expect(nearby).not.toHaveBeenCalled();
  });

  test('CT-UNI-32: limite de uso vira 429 com Retry-After', async () => {
    const handlers = createUnitsHandlers({
      nearby: async () => ({
        ok: false,
        error: { code: 'RATE_LIMITED', scope: 'units', retryAfterSeconds: 30 },
      }),
    });
    const result = await handlers.nearby('dono', VALIDA);
    expect(result.status).toBe(429);
    expect(result.headers?.['retry-after']).toBe('30');
  });
});

describe('arquivo de unidades que acompanha a API', () => {
  test('CT-UNI-40: tem dezenas de milhares de unidades válidas, com fonte e versão', () => {
    const dataset = loadBundledUnits();
    expect(dataset.units.length).toBeGreaterThan(40_000);
    expect(dataset.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dataset.source.publisher).toBe('Ministério da Saúde');
    for (const u of dataset.units.slice(0, 2000)) {
      expect(u.cnes).toMatch(/^\d{7}$/);
      expect(u.municipalityCode).toMatch(/^\d{6}$/);
      expect(u.latitude).toBeGreaterThanOrEqual(-34);
      expect(u.latitude).toBeLessThanOrEqual(6);
      expect(u.longitude).toBeGreaterThanOrEqual(-74);
      expect(u.longitude).toBeLessThanOrEqual(-28);
    }
  });

  test('CT-UNI-41: Votorantim tem unidades básicas; a busca em Votorantim acha as de lá', async () => {
    const service = createUnitsService({
      dataset: loadBundledUnits(),
      official: unavailableOfficialUnitsClient,
      limiter: createFixedWindowLimiter(() => '2026-10-07T12:00:00.000Z'),
      clock: () => '2026-10-07T12:00:00.000Z',
    });
    const result = await service.nearby('dono', {
      lat: -23.5466,
      lon: -47.4378,
      radiusKm: 5,
      limit: 30,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.length).toBeGreaterThan(3);
    expect(result.value.items.some((u) => u.municipalityCode === '355700')).toBe(true);
  });

  test('CT-UNI-42: arquivo em formato inesperado é recusado', () => {
    expect(() => parseUnitsDataset('{"fonte":{},"rows":1}')).toThrow('formato inesperado');
  });
});
