import { createWarmupService } from './warmup-service';

describe('aquecimento do banco (CT-API-W)', () => {
  test('CT-API-W01: banco que responde logo vira "ready"', async () => {
    const ping = jest.fn().mockResolvedValue(undefined);
    const service = createWarmupService({ ping, clock: () => 0 });
    await expect(service.warm()).resolves.toBe('ready');
    expect(ping).toHaveBeenCalledTimes(1);
  });

  test('CT-API-W02: banco que demora responde "waking" sem esperar, e a consulta segue', async () => {
    let resolve: () => void = () => undefined;
    const ping = jest.fn(() => new Promise<void>((r) => (resolve = r)));
    const service = createWarmupService({ ping, clock: () => 0, waitMs: 5 });
    await expect(service.warm()).resolves.toBe('waking');
    resolve();
    await new Promise((r) => setTimeout(r, 0));
    // Dentro do intervalo, devolve o último estado conhecido: o banco acordou.
    await expect(service.warm()).resolves.toBe('ready');
    expect(ping).toHaveBeenCalledTimes(1);
  });

  test('CT-API-W03: falha do banco vira "waking" e não propaga o erro', async () => {
    const ping = jest.fn().mockRejectedValue(new Error('conexão recusada com segredo'));
    const service = createWarmupService({ ping, clock: () => 0 });
    await expect(service.warm()).resolves.toBe('waking');
  });

  test('CT-API-W04: no máximo uma consulta real por intervalo; depois dele consulta de novo', async () => {
    let agora = 1000;
    const ping = jest.fn().mockResolvedValue(undefined);
    const service = createWarmupService({ ping, clock: () => agora, minIntervalMs: 60_000 });
    await service.warm();
    agora += 59_999;
    await service.warm();
    expect(ping).toHaveBeenCalledTimes(1);
    agora += 1;
    await service.warm();
    expect(ping).toHaveBeenCalledTimes(2);
  });
});
