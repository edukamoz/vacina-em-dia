import type { NearbyUnitsResponse } from '@vacina/shared';

/** Resposta de exemplo de `GET /api/units/nearby`, usada nos testes. */
export const RESPONSE: NearbyUnitsResponse = {
  items: [
    {
      cnes: '0000001',
      name: 'Unidade Básica de Saúde Rio Acima',
      address: 'Avenida Otávio Augusto Rangel, 120',
      neighborhood: 'Rio Acima',
      municipalityCode: '355700',
      latitude: -23.53511,
      longitude: -47.4359,
      distanceMeters: 450,
      phone: '(15) 3243-1513',
      shift: 'Manhã e tarde',
      updatedAt: '2025-09-03',
    },
  ],
  source: {
    name: 'UBS (CNES)',
    publisher: 'Ministério da Saúde',
    url: 'https://dadosabertos.saude.gov.br/',
    dataVersion: '2026-10-07',
    live: true,
  },
  notice: 'Nem todas têm sala de vacina: ligue antes de ir.',
};
