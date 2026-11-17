import { deveMostrarConvite, ehIphoneOuIpad, formaDoConvite } from './instalar-app-comum';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_NOVO =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
const MAC = IPAD_NOVO;

describe('convite para instalar o app (B77)', () => {
  test.each([
    ['iPhone', IPHONE, 5, true],
    ['iPad novo (se apresenta como Mac, com toque)', IPAD_NOVO, 5, true],
    ['Mac de verdade (sem toque)', MAC, 0, false],
    ['Android', ANDROID, 5, false],
  ] as const)('CT-APP-PWA01: reconhece %s', (_nome, userAgent, toques, esperado) => {
    expect(ehIphoneOuIpad(userAgent, toques)).toBe(esperado);
  });

  test.each([
    ['já instalado: nenhum', true, true, true, 'nenhuma'],
    ['instalado, mesmo sem aviso: nenhum', true, false, false, 'nenhuma'],
    ['o navegador ofereceu a instalação: botão', false, true, false, 'botao'],
    ['o navegador ofereceu e é iPhone: botão', false, true, true, 'botao'],
    ['iPhone sem aviso: passo a passo', false, false, true, 'iphone'],
    ['sem aviso e sem iPhone: nenhum', false, false, false, 'nenhuma'],
  ] as const)('CT-APP-PWA02: %s', (_nome, instalado, aviso, iphone, esperado) => {
    expect(formaDoConvite(instalado, aviso, iphone)).toBe(esperado);
  });

  test.each([
    ['sem dose aplicada, não mostra', 'botao', 0, false, false],
    ['com a primeira dose aplicada, mostra', 'botao', 1, false, true],
    ['com várias doses aplicadas, mostra', 'iphone', 4, false, true],
    ['já dispensado, não mostra', 'botao', 3, true, false],
    ['sem convite possível, não mostra', 'nenhuma', 3, false, false],
  ] as const)('CT-APP-PWA03: %s', (_nome, forma, aplicadas, dispensado, esperado) => {
    expect(deveMostrarConvite(forma, aplicadas, dispensado)).toBe(esperado);
  });
});
