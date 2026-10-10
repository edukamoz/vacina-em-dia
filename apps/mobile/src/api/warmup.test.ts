import { aquecerServidor, reiniciarAquecimentoParaTeste } from './warmup';

describe('aquecimento do servidor (CT-APP-WU)', () => {
  beforeEach(reiniciarAquecimentoParaTeste);

  test('CT-APP-WU01: chama GET /warmup uma única vez, mesmo se pedirem de novo', () => {
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });
    aquecerServidor('https://api.test/api', fetchFn);
    aquecerServidor('https://api.test/api', fetchFn);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('https://api.test/api/warmup');
  });

  test('CT-APP-WU02: falha de rede é ignorada, sem erro para a pessoa', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('sem rede'));
    expect(() => aquecerServidor('https://api.test/api', fetchFn)).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});
