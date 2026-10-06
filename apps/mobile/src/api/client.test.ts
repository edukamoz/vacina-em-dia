import { consentResponseSchema } from '@vacina/shared';
import { ApiRequestError, apiRequest, apiRequestNoContent } from './client';

const ctx = (fetchFn: typeof fetch) => ({
  baseUrl: 'http://api.test/api',
  sessionId: 's-1',
  fetchFn,
});
const respond = (status: number, body?: unknown) =>
  jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new Error('sem corpo');
      return body;
    },
  }) as unknown as typeof fetch;

const consent = {
  accepted: false,
  termVersion: null,
  acceptedAt: null,
  guardianDeclaration: false,
};

describe('cliente da API', () => {
  test('CT-APP-A01: envia a sessão e o formato, e devolve o corpo validado', async () => {
    const fetchFn = respond(200, consent);
    const result = await apiRequest(ctx(fetchFn), { path: '/consent' }, consentResponseSchema);
    expect(result.accepted).toBe(false);
    expect(fetchFn).toHaveBeenCalledWith(
      'http://api.test/api/consent',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json', 'x-demo-session': 's-1' },
      }),
    );
  });

  test('CT-APP-A02: com corpo, envia JSON e o tipo do conteúdo', async () => {
    const fetchFn = respond(200, consent);
    await apiRequest(
      ctx(fetchFn),
      { path: '/consent', method: 'PUT', body: { a: 1 }, signal: new AbortController().signal },
      consentResponseSchema,
    );
    expect(fetchFn).toHaveBeenCalledWith(
      'http://api.test/api/consent',
      expect.objectContaining({
        method: 'PUT',
        body: '{"a":1}',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  test('CT-APP-A05: falha de rede vira "network" com mensagem em linguagem simples', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    const error = await apiRequest(ctx(fetchFn), { path: '/x' }, consentResponseSchema).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ kind: 'network' });
    expect((error as Error).message).not.toMatch(/Network request failed/);
  });

  test('CT-APP-A06: erro conhecido da API traz o código e a mensagem dela', async () => {
    const fetchFn = respond(403, { code: 'CONSENT_REQUIRED', message: 'Aceite o termo.' });
    await expect(
      apiRequest(ctx(fetchFn), { path: '/members' }, consentResponseSchema),
    ).rejects.toMatchObject({
      kind: 'server',
      status: 403,
      code: 'CONSENT_REQUIRED',
      message: 'Aceite o termo.',
    });
  });

  test.each([404, 500, 503])(
    'CT-APP-A06b: HTTP %d sem corpo conhecido usa a mensagem genérica',
    async (status) => {
      const fetchFn = respond(status, { qualquer: 'coisa' });
      const error = await apiRequest(ctx(fetchFn), { path: '/x' }, consentResponseSchema).catch(
        (e: unknown) => e,
      );
      expect(error).toMatchObject({ kind: 'server', status });
      expect((error as Error).message).toMatch(/servidor/);
    },
  );

  test.each([
    ['formato inesperado', { accepted: 'sim' }],
    ['corpo que não é JSON', undefined],
  ])('CT-APP-A07: resposta com %s vira "invalid-response"', async (_nome, body) => {
    const fetchFn = respond(200, body);
    await expect(
      apiRequest(ctx(fetchFn), { path: '/consent' }, consentResponseSchema),
    ).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  test('CT-APP-A08: resposta 204 não exige corpo, e o erro continua sendo tratado', async () => {
    await expect(
      apiRequestNoContent(ctx(respond(204)), { path: '/account', method: 'DELETE' }),
    ).resolves.toBeUndefined();
    await expect(
      apiRequestNoContent(ctx(respond(401, { code: 'UNAUTHORIZED', message: 'Sessão.' })), {
        path: '/account',
        method: 'DELETE',
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
