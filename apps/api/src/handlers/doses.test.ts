import { apiErrorSchema, doseListResponseSchema, doseResponseSchema } from '@vacina/shared';
import { createInMemoryDoseRepository } from '../repositories/in-memory-dose-repository';
import { SAMPLE_CALENDAR_SOURCE, createSampleDoses } from '../seed/sample-doses';
import { createDoseService } from '../services/dose-service';
import { createDoseHandlers } from './doses';

const handlers = () =>
  createDoseHandlers(
    createDoseService({
      repository: createInMemoryDoseRepository(createSampleDoses()),
      clock: () => '2026-10-06T15:00:00.000Z',
      source: SAMPLE_CALENDAR_SOURCE,
    }),
  );

describe('handlers de doses', () => {
  test('CT-API-H01: GET /doses devolve 200 conforme o esquema', async () => {
    const res = await handlers().list();
    expect(res.status).toBe(200);
    expect(doseListResponseSchema.safeParse(res.jsonBody).success).toBe(true);
  });

  test('CT-API-H02: GET /doses/{id} devolve 200 conforme o esquema', async () => {
    const res = await handlers().get('ex-2');
    expect(res.status).toBe(200);
    expect(doseResponseSchema.safeParse(res.jsonBody).success).toBe(true);
  });

  test('CT-API-H03: GET /doses/{id} com id inexistente devolve 404', async () => {
    const res = await handlers().get('zzz');
    expect(res.status).toBe(404);
    expect(apiErrorSchema.parse(res.jsonBody).code).toBe('NOT_FOUND');
  });

  test.each([undefined, '', 'ID MAIOR', "x'; DROP TABLE dose;--"])(
    'CT-API-H04: id inválido %p devolve 400 sem repetir o valor enviado',
    async (id) => {
      const res = await handlers().get(id);
      expect(res.status).toBe(400);
      expect(apiErrorSchema.parse(res.jsonBody)).toMatchObject({
        code: 'VALIDATION_ERROR',
        fields: ['id'],
      });
      expect(JSON.stringify(res.jsonBody)).not.toContain('DROP');
    },
  );

  test('CT-API-H05: POST válido devolve 200 com o novo estado', async () => {
    const res = await handlers().applyEvent('ex-4', { type: 'APPLY', date: '2026-10-06' });
    expect(res.status).toBe(200);
    expect(doseResponseSchema.parse(res.jsonBody).status).toBe('APPLIED');
  });

  test.each([
    ['corpo ausente', undefined],
    ['tipo desconhecido', { type: 'EXPLODE' }],
    ['MARK_OVERDUE enviado pelo cliente', { type: 'MARK_OVERDUE' }],
    ['data inexistente', { type: 'SCHEDULE', date: '2026-02-30' }],
    ['data ausente', { type: 'APPLY' }],
  ])('CT-API-H06: corpo inválido (%s) devolve 400', async (_nome, body) => {
    const res = await handlers().applyEvent('ex-4', body);
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(res.jsonBody).code).toBe('VALIDATION_ERROR');
  });

  test('CT-API-H07: POST em dose inexistente devolve 404', async () => {
    const res = await handlers().applyEvent('zzz', { type: 'UNSCHEDULE' });
    expect(res.status).toBe(404);
  });

  test('CT-API-H08: transição inválida devolve 409', async () => {
    const res = await handlers().applyEvent('ex-1', { type: 'CANCEL', confirmed: true });
    expect(res.status).toBe(409);
    expect(apiErrorSchema.parse(res.jsonBody).code).toBe('INVALID_TRANSITION');
  });

  test('CT-API-H09: regra de data violada devolve 422', async () => {
    const res = await handlers().applyEvent('ex-4', { type: 'SCHEDULE', date: '2026-10-05' });
    expect(res.status).toBe(422);
    expect(apiErrorSchema.parse(res.jsonBody).code).toBe('GUARD_VIOLATION');
  });
});
