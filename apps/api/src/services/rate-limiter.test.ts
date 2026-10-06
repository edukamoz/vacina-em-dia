import type { RateRule } from './assistant-ports';
import { createFixedWindowLimiter } from './rate-limiter';

const HORA: RateRule = { name: 'hora', limit: 3, windowSeconds: 3600 };
const DIA: RateRule = { name: 'dia', limit: 5, windowSeconds: 86400 };

function build(start = '2026-10-07T12:00:00.000Z') {
  let now = start;
  const limiter = createFixedWindowLimiter(() => now);
  return {
    limiter,
    avancar: (segundos: number) => {
      now = new Date(Date.parse(now) + segundos * 1000).toISOString();
    },
  };
}

describe('limitador de uso (ADR-010)', () => {
  test('CT-RL-01: permite até o limite e nega a partir dele, dizendo quanto esperar', async () => {
    const { limiter } = build();
    for (let i = 0; i < 3; i += 1) {
      expect(await limiter.consume('a', [HORA])).toEqual({ allowed: true });
    }
    expect(await limiter.consume('a', [HORA])).toEqual({ allowed: false, retryAfterSeconds: 3600 });
  });

  test('CT-RL-02: ao virar a janela, o contador zera', async () => {
    const { limiter, avancar } = build();
    for (let i = 0; i < 3; i += 1) await limiter.consume('a', [HORA]);
    avancar(3599);
    expect(await limiter.consume('a', [HORA])).toEqual({ allowed: false, retryAfterSeconds: 1 });
    avancar(1);
    expect(await limiter.consume('a', [HORA])).toEqual({ allowed: true });
  });

  test('CT-RL-03: cada dono tem o seu contador', async () => {
    const { limiter } = build();
    for (let i = 0; i < 3; i += 1) await limiter.consume('a', [HORA]);
    expect(await limiter.consume('a', [HORA])).toMatchObject({ allowed: false });
    expect(await limiter.consume('b', [HORA])).toEqual({ allowed: true });
  });

  test('CT-RL-04: com várias regras, a mais restritiva vale e a negada não gasta as outras', async () => {
    const { limiter } = build();
    for (let i = 0; i < 3; i += 1) {
      expect(await limiter.consume('a', [HORA, DIA])).toEqual({ allowed: true });
    }
    // A regra da hora esgotou; a do dia não deve ter sido gasta pela tentativa negada.
    expect(await limiter.consume('a', [HORA, DIA])).toMatchObject({ allowed: false });
    expect(await limiter.consume('a', [DIA])).toEqual({ allowed: true }); // 4º do dia
    expect(await limiter.consume('a', [DIA])).toEqual({ allowed: true }); // 5º do dia
    expect(await limiter.consume('a', [DIA])).toMatchObject({ allowed: false });
  });

  test('CT-RL-05: a espera informada é a da regra que mais demora', async () => {
    const { limiter } = build();
    const apertada: RateRule = { name: 'apertada', limit: 1, windowSeconds: 86400 };
    await limiter.consume('a', [HORA, apertada]);
    expect(await limiter.consume('a', [HORA, apertada])).toEqual({
      allowed: false,
      retryAfterSeconds: 86400,
    });
  });

  test('CT-RL-06: contadores vencidos são descartados em limpeza (memória não cresce sem limite)', async () => {
    const { limiter, avancar } = build();
    const regra: RateRule = { name: 'r', limit: 1, windowSeconds: 1 };
    for (let i = 0; i < 5000; i += 1) await limiter.consume(`dono-${i}`, [regra]);
    avancar(5);
    expect(await limiter.consume('novo', [regra])).toEqual({ allowed: true });
    expect(await limiter.consume('dono-0', [regra])).toEqual({ allowed: true });
  });
});
