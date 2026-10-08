import { createFixedWindowLimiter } from './rate-limiter';
import type { OfficialUnitInfo, OfficialUnitsClient } from '../clients/official-units-client';
import type { UnitRecord, UnitsDataset } from './units-dataset';
import { createUnitsService, UNITS_NOTICE } from './units-service';

const unit = (cnes: string, lat: number, lon: number, municipalityCode = '355700'): UnitRecord => ({
  cnes,
  name: `Unidade ${cnes}`,
  address: 'Rua das Acácias',
  neighborhood: 'Centro',
  municipalityCode,
  latitude: lat,
  longitude: lon,
});

const DATASET: UnitsDataset = {
  version: '2026-10-07',
  source: { name: 'UBS (CNES)', publisher: 'Ministério da Saúde', url: 'https://exemplo.gov.br' },
  units: [
    unit('0000001', -23.5466, -47.4378), // ~0 m do centro de teste
    unit('0000002', -23.5566, -47.4378), // ~1,1 km ao sul
    unit('0000003', -23.6466, -47.4378), // ~11 km ao sul
    unit('0000004', -23.5466, -47.4678, '355220'), // ~3 km a oeste, outro município
    unit('0000005', -10, -50, '172100'), // longe
  ],
};
const CENTER = { lat: -23.5466, lon: -47.4378 };

const INFO: OfficialUnitInfo = {
  cnes: '0000001',
  phone: '(15) 3243-1513',
  shift: 'Manhã e tarde',
  number: '120',
  updatedAt: '2025-09-03',
};

function setup(official?: Partial<OfficialUnitsClient>, now = '2026-10-07T12:00:00.000Z') {
  const clock = { now };
  const fetchMunicipality = jest.fn(async (code: string) => (code === '355700' ? [INFO] : []));
  const service = createUnitsService({
    dataset: DATASET,
    official: { fetchMunicipality, ...official },
    limiter: createFixedWindowLimiter(() => clock.now),
    clock: () => clock.now,
    officialTimeoutMs: 50,
  });
  return { service, clock, fetchMunicipality };
}

const query = (overrides = {}) => ({ ...CENTER, radiusKm: 10, limit: 15, ...overrides });

describe('serviço de postos de saúde (RF10)', () => {
  test('CT-UNI-01: lista só o que está no raio, da mais perto para a mais longe', async () => {
    const { service } = setup();
    const result = await service.nearby('dono', query({ radiusKm: 5 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items.map((u) => u.cnes)).toEqual(['0000001', '0000002', '0000004']);
    expect(result.value.items[0]?.distanceMeters).toBeLessThan(5);
    expect(result.value.items[1]?.distanceMeters).toBeGreaterThan(1000);
    expect(result.value.notice).toBe(UNITS_NOTICE);
  });

  test('CT-UNI-02: respeita o limite de itens e o raio máximo', async () => {
    const { service } = setup();
    const um = await service.nearby('dono', query({ limit: 1 }));
    expect(um.ok && um.value.items).toHaveLength(1);
    const todas = await service.nearby('dono', query({ radiusKm: 50, limit: 30 }));
    expect(todas.ok && todas.value.items.map((u) => u.cnes)).toEqual([
      '0000001',
      '0000002',
      '0000004',
      '0000003',
    ]);
  });

  test('CT-UNI-03: sem unidades no raio devolve lista vazia, não erro', async () => {
    const { service } = setup();
    const result = await service.nearby('dono', query({ lat: -5, lon: -40 }));
    expect(result.ok && result.value.items).toEqual([]);
  });

  test('CT-UNI-04: acrescenta telefone, turno e número do endereço da API oficial', async () => {
    const { service } = setup();
    const result = await service.nearby('dono', query({ radiusKm: 2 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [primeira, segunda] = result.value.items;
    expect(primeira).toMatchObject({
      address: 'Rua das Acácias, 120',
      phone: '(15) 3243-1513',
      shift: 'Manhã e tarde',
      updatedAt: '2025-09-03',
    });
    expect(segunda).toMatchObject({ address: 'Rua das Acácias', phone: null, shift: null });
    expect(result.value.source).toMatchObject({ live: true, dataVersion: '2026-10-07' });
  });

  test('CT-UNI-05: se a API oficial falha, responde com o arquivo local e live=false', async () => {
    const reportError = jest.fn();
    const service = createUnitsService({
      dataset: DATASET,
      official: { fetchMunicipality: () => Promise.reject(new TypeError('rede')) },
      limiter: createFixedWindowLimiter(() => '2026-10-07T12:00:00.000Z'),
      clock: () => '2026-10-07T12:00:00.000Z',
      reportError,
    });
    const result = await service.nearby('dono', query({ radiusKm: 2 }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(2);
    expect(result.value.items[0]?.phone).toBeNull();
    expect(result.value.source.live).toBe(false);
    expect(reportError).toHaveBeenCalledWith('TypeError');
    expect(JSON.stringify(reportError.mock.calls)).not.toMatch(/-23\.|-47\./);
  });

  test('CT-UNI-06: API oficial lenta além do tempo máximo é abandonada', async () => {
    const { service } = setup({
      fetchMunicipality: (_code, signal) =>
        new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('abortada')));
        }),
    });
    const result = await service.nearby('dono', query({ radiusKm: 2 }));
    expect(result.ok && result.value.source.live).toBe(false);
    expect(result.ok && result.value.items).toHaveLength(2);
  });

  test('CT-UNI-07: o resultado da API oficial vale por 12 horas por município', async () => {
    const { service, clock, fetchMunicipality } = setup();
    await service.nearby('dono', query({ radiusKm: 2 }));
    await service.nearby('dono', query({ radiusKm: 2 }));
    expect(fetchMunicipality).toHaveBeenCalledTimes(1);

    clock.now = '2026-10-08T01:00:00.000Z'; // 13 h depois
    await service.nearby('dono', query({ radiusKm: 2 }));
    expect(fetchMunicipality).toHaveBeenCalledTimes(2);
  });

  test('CT-UNI-08: consulta a API oficial só pelos municípios da resposta, sem enviar a posição', async () => {
    const { service, fetchMunicipality } = setup();
    await service.nearby('dono', query({ radiusKm: 5 }));
    expect(fetchMunicipality.mock.calls.map((c) => c[0]).sort()).toEqual(['355220', '355700']);
    expect(JSON.stringify(fetchMunicipality.mock.calls)).not.toMatch(/-23\.|-47\./);
  });

  test('CT-UNI-09: depois de 60 buscas em 10 minutos responde limite de uso (429)', async () => {
    const { service } = setup({ fetchMunicipality: async () => [] });
    for (let i = 0; i < 60; i++) await service.nearby('dono', query({ radiusKm: 1 }));
    const bloqueada = await service.nearby('dono', query({ radiusKm: 1 }));
    expect(bloqueada).toMatchObject({ ok: false, error: { code: 'RATE_LIMITED', scope: 'units' } });
    const outra = await service.nearby('outro', query({ radiusKm: 1 }));
    expect(outra.ok).toBe(true);
  });
});
