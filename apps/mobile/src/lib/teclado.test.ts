import { MARGEM_DO_CAMPO, rolagemParaVerCampo, sobreposicaoDoTeclado } from './teclado';

describe('teclado: sobreposição', () => {
  test('CT-TEC-01: o teclado cobre a distância entre o seu topo e o fundo do quadro', () => {
    expect(sobreposicaoDoTeclado(800, 500)).toBe(300);
  });

  test('CT-TEC-02: quadro acima do teclado, ou janela já encolhida pelo sistema, não é coberto', () => {
    expect(sobreposicaoDoTeclado(480, 500)).toBe(0);
    expect(sobreposicaoDoTeclado(500, 500)).toBe(0);
  });

  test('CT-TEC-03: o resultado é inteiro', () => {
    expect(sobreposicaoDoTeclado(800.4, 500)).toBe(300);
  });
});

describe('teclado: rolar até o campo', () => {
  test('CT-TEC-04: campo já à vista não rola', () => {
    expect(rolagemParaVerCampo(200, 56, 0, 400)).toBeNull();
  });

  test('CT-TEC-05: campo abaixo da área visível rola o bastante para aparecer, com folga', () => {
    // Visível de 0 a 400; o campo vai de 500 a 556.
    expect(rolagemParaVerCampo(500, 56, 0, 400)).toBe(500 + 56 + MARGEM_DO_CAMPO - 400);
  });

  test('CT-TEC-06: campo acima da área visível rola de volta até ele', () => {
    expect(rolagemParaVerCampo(100, 56, 300, 400)).toBe(100 - MARGEM_DO_CAMPO);
  });

  test('CT-TEC-07: nunca rola para posição negativa', () => {
    expect(rolagemParaVerCampo(10, 56, 50, 400)).toBe(0);
  });
});
