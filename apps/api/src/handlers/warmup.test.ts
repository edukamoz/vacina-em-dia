import { createWarmupHandler } from './warmup';

describe('createWarmupHandler (CT-API-W)', () => {
  test('CT-API-W05: devolve 200 com o estado do banco e nada mais', async () => {
    const handler = createWarmupHandler({ warm: async () => 'waking' });
    const response = await handler();
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({ status: 'ok', database: 'waking' });
  });
});
