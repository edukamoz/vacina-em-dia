import { apiErrorSchema } from '@vacina/shared';
import { internalErrorResult, toErrorResult, unauthorizedResult } from './http-errors';

describe('mapeamento de erros para HTTP', () => {
  test.each([
    ['NOT_FOUND', { code: 'NOT_FOUND' as const }, 404],
    ['CONSENT_REQUIRED', { code: 'CONSENT_REQUIRED' as const }, 403],
    ['GUARDIAN_DECLARATION_REQUIRED', { code: 'GUARDIAN_DECLARATION_REQUIRED' as const }, 422],
    ['INVALID_BIRTH_DATE', { code: 'INVALID_BIRTH_DATE' as const }, 422],
    ['LIMIT_REACHED', { code: 'LIMIT_REACHED' as const }, 422],
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

  test('CT-API-E03: sessão ausente devolve 401 no formato de erro da API', () => {
    const res = unauthorizedResult();
    expect(res.status).toBe(401);
    expect(apiErrorSchema.safeParse(res.jsonBody).success).toBe(true);
  });
});
