import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Platform, Text } from 'react-native';
import { CONSULTA_DE_CONTRASTE, observarContrasteDoSistema } from './contraste-do-sistema';
import { ThemeProvider, useTheme } from './theme-provider';

type Ouvinte = (evento: { matches: boolean }) => void;

/** `matchMedia` falso: guarda o ouvinte para o teste disparar a mudança. */
function falsoMatchMedia(inicial: boolean) {
  const ouvintes = new Set<Ouvinte>();
  const consulta = {
    matches: inicial,
    addEventListener: jest.fn((_tipo: string, ouvinte: Ouvinte) => ouvintes.add(ouvinte)),
    removeEventListener: jest.fn((_tipo: string, ouvinte: Ouvinte) => ouvintes.delete(ouvinte)),
  };
  const matchMedia = jest.fn(() => consulta);
  Object.defineProperty(globalThis, 'matchMedia', {
    value: matchMedia,
    configurable: true,
    writable: true,
  });
  return {
    matchMedia,
    consulta,
    mudar: (matches: boolean) => ouvintes.forEach((ouvinte) => ouvinte({ matches })),
  };
}

function Sonda() {
  const { theme } = useTheme();
  return <Text>{`tema=${theme}`}</Text>;
}

describe('alto contraste pedido pelo sistema (CT-TEMA)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'matchMedia');
  });

  test('CT-TEMA-03: na web, lê a consulta de contraste e avisa a cada mudança', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const falso = falsoMatchMedia(true);
    const aoMudar = jest.fn();
    const parar = observarContrasteDoSistema(aoMudar);
    expect(falso.matchMedia).toHaveBeenCalledWith(CONSULTA_DE_CONTRASTE);
    expect(aoMudar).toHaveBeenLastCalledWith(true);
    falso.mudar(false);
    expect(aoMudar).toHaveBeenLastCalledWith(false);
    parar();
    expect(falso.consulta.removeEventListener).toHaveBeenCalled();
  });

  test('CT-TEMA-04: na web sem matchMedia, não pede contraste e não quebra', () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    Reflect.deleteProperty(globalThis, 'matchMedia');
    const aoMudar = jest.fn();
    expect(() => observarContrasteDoSistema(aoMudar)()).not.toThrow();
    expect(aoMudar).not.toHaveBeenCalled();
  });

  test('CT-TEMA-05: no iOS, segue "Aumentar contraste" do sistema', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest.spyOn(AccessibilityInfo, 'isDarkerSystemColorsEnabled').mockResolvedValue(true);
    const aoMudar = jest.fn();
    observarContrasteDoSistema(aoMudar);
    await act(async () => undefined);
    expect(aoMudar).toHaveBeenCalledWith(true);
  });

  test('CT-TEMA-06: no Android, uma falha da plataforma vira "sem pedido"', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    jest.spyOn(AccessibilityInfo, 'isHighTextContrastEnabled').mockRejectedValue(new Error('x'));
    const aoMudar = jest.fn();
    observarContrasteDoSistema(aoMudar);
    await act(async () => undefined);
    expect(aoMudar).not.toHaveBeenCalled();
  });

  test('CT-TEMA-07: "Seguir o aparelho" abre em Alto contraste quando o sistema pede', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    falsoMatchMedia(true);
    await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByText('tema=highContrast')).toBeTruthy();
  });

  test('CT-TEMA-08: quem fixou o tema Claro não é afetado pelo pedido do sistema', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    falsoMatchMedia(true);
    await render(
      <ThemeProvider initialPreference="light">
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByText('tema=light')).toBeTruthy();
  });
});
