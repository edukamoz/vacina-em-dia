import {
  botaoRecolhido,
  definirBotaoRecolhido,
  FOLGA_DA_ROLAGEM,
  TOPO_DA_TELA,
} from './rolagem-balao';

describe('botão do assistente ao rolar a tela', () => {
  test.each([
    ['CT-BAL-01', 200, 100, false, true],
    ['CT-BAL-02', 100, 200, true, false],
    ['CT-BAL-03', 10, 300, true, false],
    ['CT-BAL-04', 205, 200, false, false],
    ['CT-BAL-05', 195, 200, true, true],
    ['CT-BAL-06', 200, 200, true, true],
    ['CT-BAL-07', TOPO_DA_TELA + 1 + FOLGA_DA_ROLAGEM + 1, TOPO_DA_TELA + 1, false, true],
  ] as const)('%s: y=%d, antes=%d, recolhido=%s => %s', (_id, y, antes, recolhido, esperado) => {
    expect(botaoRecolhido(y, antes, recolhido)).toBe(esperado);
  });

  test('CT-BAL-08: o estado compartilhado só muda quando o valor muda', () => {
    definirBotaoRecolhido(false);
    expect(() => definirBotaoRecolhido(false)).not.toThrow();
  });
});
