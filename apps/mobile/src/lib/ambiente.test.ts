import { escolherAmbiente } from './ambiente';

describe('escolherAmbiente', () => {
  test.each([
    ['android', 400, false, 'app'],
    ['ios', 1200, false, 'app'],
    ['web', 1440, true, 'app'],
    ['web', 390, true, 'app'],
    ['web', 1440, false, 'web-grande'],
    ['web', 1024, false, 'web-grande'],
    ['web', 1023, false, 'web-pequena'],
    ['web', 820, false, 'web-pequena'],
    ['web', 390, false, 'web-pequena'],
  ] as const)(
    'CT-APP-AMB01: %s a %i px (instalado: %s) usa %s',
    (plataforma, largura, instalado, esperado) => {
      expect(escolherAmbiente(plataforma, largura, instalado)).toBe(esperado);
    },
  );
});
