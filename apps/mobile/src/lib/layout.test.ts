import { modoDeLayout, posicaoDaBarra } from './layout';

describe('layout responsivo (design system, seção 2.5)', () => {
  test.each([
    [320, 'compacto'],
    [599, 'compacto'],
    [600, 'medio'],
    [1023, 'medio'],
    [1024, 'expandido'],
    [1920, 'expandido'],
  ] as const)('CT-LAY-01: largura %i usa o modo %s', (largura, modo) => {
    expect(modoDeLayout(largura)).toBe(modo);
  });

  test.each([
    ['compacto', 'bottom'],
    ['medio', 'left'],
    ['expandido', 'left'],
  ] as const)('CT-LAY-02: no modo %s a barra fica em %s', (modo, posicao) => {
    expect(posicaoDaBarra(modo)).toBe(posicao);
  });
});
