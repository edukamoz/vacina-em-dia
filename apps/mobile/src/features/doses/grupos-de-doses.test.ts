import { aplicadasVisiveisAoAbrir } from './grupos-de-doses';
import { frasePrincipalDoResumo } from './resumo-doses';

describe('aplicadas recolhidas (ADR-036)', () => {
  test.each([
    ['com doses atrasadas, recolhe', { atencao: [1], proximas: [] }, false, false],
    ['com doses próximas, recolhe', { atencao: [], proximas: [1] }, false, false],
    ['sem nada a resolver, abre sozinha', { atencao: [], proximas: [] }, false, true],
    ['a pessoa abriu, fica aberta', { atencao: [1], proximas: [1] }, true, true],
  ] as const)('CT-APP-K18: %s', (_nome, grupos, escolha, esperado) => {
    expect(aplicadasVisiveisAoAbrir(grupos, escolha)).toBe(esperado);
  });
});

describe('frase principal do resumo', () => {
  const base = { aplicadas: 0, total: 3, atrasadas: 0, emSeteDias: 0 };
  test.each([
    ['uma atrasada', { ...base, atrasadas: 1 }, '1 dose para resolver'],
    ['várias atrasadas', { ...base, atrasadas: 3 }, '3 doses para resolver'],
    ['nenhuma atrasada', base, 'Nada atrasado por aqui'],
    ['sem doses', { ...base, total: 0 }, 'Nenhuma dose por enquanto'],
  ] as const)('CT-APP-K19: %s', (_nome, contagem, esperado) => {
    expect(frasePrincipalDoResumo(contagem)).toBe(esperado);
  });
});
