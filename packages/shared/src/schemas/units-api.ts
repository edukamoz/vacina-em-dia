import { z } from 'zod';

/** Latitude do Brasil, com folga (de -34 a 6 graus). */
const latitudeSchema = z.coerce.number().min(-34).max(6);
/** Longitude do Brasil, com folga (de -74 a -28 graus). */
const longitudeSchema = z.coerce.number().min(-74).max(-28);

/** Raio máximo de busca, em quilômetros. */
export const MAX_UNITS_RADIUS_KM = 50;
/** Máximo de unidades por resposta. */
export const MAX_UNITS_LIMIT = 30;

/** Parâmetros de `GET /api/units/nearby` (vêm da URL, como texto). */
export const nearbyUnitsQuerySchema = z
  .object({
    lat: latitudeSchema.meta({
      example: -23.5466,
      description: 'Latitude da pessoa, em graus decimais (Brasil).',
    }),
    lon: longitudeSchema.meta({
      example: -47.4378,
      description: 'Longitude da pessoa, em graus decimais (Brasil).',
    }),
    radiusKm: z.coerce
      .number()
      .min(1)
      .max(MAX_UNITS_RADIUS_KM)
      .default(10)
      .meta({ example: 10, description: 'Raio da busca, em quilômetros (de 1 a 50).' }),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(MAX_UNITS_LIMIT)
      .default(15)
      .meta({ example: 15, description: 'Quantidade máxima de unidades (de 1 a 30).' }),
  })
  .meta({ id: 'NearbyUnitsQuery' });

/** Uma unidade básica de saúde. */
export const healthUnitSchema = z
  .object({
    cnes: z.string().meta({ example: '0023914', description: 'Código no CNES (7 dígitos).' }),
    name: z.string().meta({ example: 'Unidade Básica de Saúde Rio Acima' }),
    address: z.string().meta({ example: 'Rua das Acácias, 120' }),
    neighborhood: z.string().meta({ example: 'Centro' }),
    municipalityCode: z
      .string()
      .meta({ example: '355700', description: 'Código IBGE (6 dígitos).' }),
    latitude: z.number().meta({ example: -23.53511 }),
    longitude: z.number().meta({ example: -47.4359 }),
    distanceMeters: z
      .number()
      .int()
      .meta({ example: 450, description: 'Distância em linha reta até a posição informada.' }),
    phone: z
      .string()
      .nullable()
      .meta({ example: '(15) 3243-1513', description: 'Telefone do cadastro oficial, se houver.' }),
    shift: z
      .string()
      .nullable()
      .meta({ example: 'Manhã e tarde', description: 'Turno de atendimento do cadastro oficial.' }),
    updatedAt: z.string().nullable().meta({
      example: '2025-09-03',
      description: 'Data da última atualização do cadastro oficial.',
    }),
  })
  .meta({ id: 'HealthUnit' });

/** Resposta de `GET /api/units/nearby`. */
export const nearbyUnitsResponseSchema = z
  .object({
    items: z.array(healthUnitSchema).meta({ description: 'Da mais perto para a mais longe.' }),
    source: z.object({
      name: z.string().meta({ example: 'Cadastro Nacional de Estabelecimentos de Saúde (CNES)' }),
      publisher: z.string().meta({ example: 'Ministério da Saúde' }),
      url: z.string().meta({ example: 'https://dadosabertos.saude.gov.br/' }),
      dataVersion: z.string().meta({
        example: '2026-10-07',
        description: 'Data do arquivo de unidades que acompanha a API.',
      }),
      live: z.boolean().meta({
        description:
          'Verdadeiro quando telefone e turno vieram, nesta resposta, da API oficial do Ministério da Saúde.',
      }),
    }),
    notice: z.string().meta({
      example:
        'A lista traz unidades básicas de saúde. Nem todas têm sala de vacina: ligue antes de ir.',
    }),
  })
  .meta({ id: 'NearbyUnitsResponse' });

export type NearbyUnitsQuery = z.infer<typeof nearbyUnitsQuerySchema>;
export type HealthUnit = z.infer<typeof healthUnitSchema>;
export type NearbyUnitsResponse = z.infer<typeof nearbyUnitsResponseSchema>;
