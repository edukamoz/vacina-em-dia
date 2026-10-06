import { ApiRequestError, fetchDoses } from './doses-client';

const source = { name: 'x', version: '1', isFictitious: true, notice: 'aviso' };
const dose = {
  id: 'ex-1',
  vaccine: 'Vacina de exemplo A',
  doseLabel: '1ª dose',
  status: 'PENDING',
  dueDate: '2026-11-04',
  scheduledDate: null,
  appliedDate: null,
};
const respond = (status: number, body: unknown) =>
  jest
    .fn()
    .mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('fetchDoses', () => {
  test('CT-APP-A04: devolve a lista validada e chama a URL certa', async () => {
    const fetchFn = respond(200, { source, items: [dose] });
    const result = await fetchDoses({ baseUrl: 'http://api.test/api', fetchFn });
    expect(result.items).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledWith(
      'http://api.test/api/doses',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    );
  });

  test('CT-APP-A05: falha de rede vira ApiRequestError "network"', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(fetchDoses({ baseUrl: 'http://x', fetchFn })).rejects.toMatchObject({
      kind: 'network',
    });
  });

  test.each([404, 500, 503])(
    'CT-APP-A06: HTTP %d vira ApiRequestError "server"',
    async (status) => {
      const fetchFn = respond(status, { code: 'INTERNAL_ERROR', message: 'detalhe interno' });
      await expect(fetchDoses({ baseUrl: 'http://x', fetchFn })).rejects.toMatchObject({
        kind: 'server',
      });
    },
  );

  test.each([
    ['formato inesperado', { items: 'nada' }],
    ['dose com estado desconhecido', { source, items: [{ ...dose, status: 'LATE' }] }],
    ['sem fonte do calendário', { items: [dose] }],
  ])('CT-APP-A07: resposta com %s vira "invalid-response"', async (_nome, body) => {
    await expect(
      fetchDoses({ baseUrl: 'http://x', fetchFn: respond(200, body) }),
    ).rejects.toMatchObject({
      kind: 'invalid-response',
    });
  });

  test('CT-APP-A08: corpo que não é JSON vira "invalid-response"', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('x');
      },
    });
    await expect(fetchDoses({ baseUrl: 'http://x', fetchFn })).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  test('CT-APP-A09: a mensagem do erro é amigável e não repete detalhes técnicos', async () => {
    const fetchFn = respond(500, { code: 'INTERNAL_ERROR', message: 'stack trace secreto' });
    const error = await fetchDoses({ baseUrl: 'http://x', fetchFn }).catch((e: unknown) => e);
    expect((error as Error).message).toMatch(/não foi possível/i);
    expect((error as Error).message).not.toMatch(/stack|secreto|500/);
  });
});
