import { buildHealthResponse } from './health';

describe('buildHealthResponse', () => {
  test('devolve 200 com o estado do serviço e a hora do relógio injetado', () => {
    const clock = () => '2026-10-15T12:00:00.000Z';
    const response = buildHealthResponse(clock);
    expect(response.status).toBe(200);
    expect(response.jsonBody).toEqual({
      status: 'ok',
      service: 'vacina-em-dia-api',
      time: '2026-10-15T12:00:00.000Z',
    });
  });

  test('não expõe segredos nem detalhes internos', () => {
    const body = JSON.stringify(buildHealthResponse(() => 'x').jsonBody);
    expect(body).not.toMatch(/key|secret|password|token|connection/i);
  });
});
