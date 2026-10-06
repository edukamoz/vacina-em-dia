import { apiErrorSchema } from '@vacina/shared';
import { internalErrorResult, toErrorResult } from './http-errors';

describe('mapeamento de erros para HTTP', () => {
  test.each([
    ['NOT_FOUND', { code: 'NOT_FOUND' as const }, 404],
    [
      'INVALID_TRANSITION',
      {
        code: 'INVALID_TRANSITION' as const,
        from: 'APPLIED' as const,
        event: 'CANCEL' as const,
        message: 'm',
      },
      409,
    ],
    [
      'GUARD_VIOLATION',
      {
        code: 'GUARD_VIOLATION' as const,
        reason: 'DATE_IN_PAST' as const,
        from: 'PENDING' as const,
        event: 'SCHEDULE' as const,
        message: 'm',
      },
      422,
    ],
  ])('CT-API-E01: %s vira HTTP %d', (_nome, error, status) => {
    const res = toErrorResult(error);
    expect(res.status).toBe(status);
    expect(apiErrorSchema.safeParse(res.jsonBody).success).toBe(true);
  });

  test('CT-API-E02: erro interno devolve 500 sem detalhes', () => {
    const res = internalErrorResult();
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.jsonBody)).not.toMatch(/stack|Error:|at /);
  });
});
