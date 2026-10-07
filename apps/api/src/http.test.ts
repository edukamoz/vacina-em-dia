import { SECURITY_HEADERS, withSecurityHeaders } from './http';

describe('cabeçalhos de segurança da API', () => {
  test('CT-SEG-10: toda resposta ganha nosniff, no-store e HSTS', () => {
    const result = withSecurityHeaders({ status: 200, jsonBody: { ok: true } });
    expect(result.headers).toEqual(SECURITY_HEADERS);
    expect(result.headers?.['x-content-type-options']).toBe('nosniff');
    expect(result.headers?.['cache-control']).toBe('no-store');
    expect(result.headers?.['strict-transport-security']).toMatch(/max-age=\d+/);
  });

  test('CT-SEG-11: o que o handler já definiu é mantido, e o corpo e o status não mudam', () => {
    const original = {
      status: 201,
      jsonBody: { a: 1 },
      headers: { 'cache-control': 'private', 'x-extra': '1' },
    };
    const result = withSecurityHeaders(original);
    expect(result.status).toBe(201);
    expect(result.jsonBody).toEqual({ a: 1 });
    expect(result.headers).toMatchObject({
      'cache-control': 'private',
      'x-extra': '1',
      'x-content-type-options': 'nosniff',
    });
    expect(original.headers).toEqual({ 'cache-control': 'private', 'x-extra': '1' });
  });
});
