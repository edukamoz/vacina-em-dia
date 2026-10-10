import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AccessibilityInfo, Text } from 'react-native';
import { AtalhoDeMovimento, SeletorDeMovimento } from '../components/seletor-de-movimento';
import { SeletorDeTamanhoDoTexto } from '../components/seletor-de-tamanho-do-texto';
import { Texto } from '../components/texto';
import { CHAVE_DE_PREFERENCIAS, guardarPreferencias, lerPreferencias } from './preferencias';
import { ThemeProvider, useMovimentoReduzido, useTheme } from './theme-provider';

function Sonda() {
  const { movimentoReduzido, movimento, setMovimento, theme } = useTheme();
  return (
    <>
      <Text>{`efetivo=${movimentoReduzido} escolha=${movimento} tema=${theme}`}</Text>
      <Text onPress={() => setMovimento('reduzir')}>ligar</Text>
      <Text onPress={() => setMovimento('sistema')}>sistema</Text>
    </>
  );
}

describe('preferências de movimento e de texto (CT-PREF)', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('CT-PREF-01: sem nada guardado, lê preferências vazias', async () => {
    await expect(lerPreferencias()).resolves.toEqual({});
  });

  test('CT-PREF-02: guarda e relê as preferências', async () => {
    await guardarPreferencias({ movimento: 'reduzir', tamanhoDoTexto: 'grande' });
    await expect(lerPreferencias()).resolves.toEqual({
      movimento: 'reduzir',
      tamanhoDoTexto: 'grande',
    });
  });

  test.each([
    ['texto que não é JSON', 'isto não é json'],
    ['valor que não é objeto', '42'],
    [
      'tamanho desconhecido',
      JSON.stringify({ tamanhoDoTexto: 'gigante', movimento: 'turbo', reduzirMovimento: 'sim' }),
    ],
  ])('CT-PREF-03: %s vira "sem preferência"', async (_nome, bruto) => {
    await AsyncStorage.setItem(CHAVE_DE_PREFERENCIAS, bruto);
    await expect(lerPreferencias()).resolves.toEqual({});
  });

  test.each([
    ['true vira "reduzir"', true, 'reduzir'],
    ['false vira "animar"', false, 'animar'],
  ])('CT-PREF-03b: preferência antiga (booleano) %s', async (_nome, antigo, esperado) => {
    await AsyncStorage.setItem(CHAVE_DE_PREFERENCIAS, JSON.stringify({ reduzirMovimento: antigo }));
    await expect(lerPreferencias()).resolves.toEqual({ movimento: esperado });
  });

  test('CT-PREF-04: ligar "Reduzir movimento" vale na hora e fica guardado', async () => {
    await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByText(/efetivo=false escolha=animar/)).toBeTruthy();
    await fireEvent.press(screen.getByText('ligar'));
    expect(screen.getByText(/efetivo=true escolha=reduzir/)).toBeTruthy();
    await waitFor(async () =>
      expect(await lerPreferencias()).toMatchObject({ movimento: 'reduzir' }),
    );
  });

  test('CT-PREF-05: a escolha guardada volta ao abrir o app', async () => {
    await guardarPreferencias({ movimento: 'reduzir', tamanhoDoTexto: 'maior' });
    await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    await waitFor(() => expect(screen.getByText(/escolha=reduzir/)).toBeTruthy());
  });

  test('CT-PREF-06: o Alto contraste para o movimento mesmo com a chave desligada', async () => {
    await render(
      <ThemeProvider initialPreference="highContrast">
        <Sonda />
      </ThemeProvider>,
    );
    expect(screen.getByText(/efetivo=true escolha=animar tema=highContrast/)).toBeTruthy();
  });

  test('CT-PREF-06b: "Animar sempre" vale mesmo que o aparelho peça menos movimento', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(
      <ThemeProvider>
        <Sonda />
      </ThemeProvider>,
    );
    await act(async () => undefined);
    expect(screen.getByText(/efetivo=false escolha=animar/)).toBeTruthy();
    await fireEvent.press(screen.getByText('sistema'));
    await waitFor(() => expect(screen.getByText(/efetivo=true escolha=sistema/)).toBeTruthy());
  });

  test('CT-PREF-06c: o atalho e o seletor trocam o modo de movimento', async () => {
    await render(
      <ThemeProvider>
        <AtalhoDeMovimento />
        <SeletorDeMovimento />
      </ThemeProvider>,
    );
    expect(screen.getByRole('radio', { name: 'Animar sempre', checked: true })).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByRole('switch', { name: 'Reduzir movimento' }));
    });
    expect(screen.getByRole('radio', { name: 'Reduzir movimento', checked: true })).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByRole('switch', { name: 'Reduzir movimento' }));
    });
    expect(screen.getByRole('radio', { name: 'Animar sempre', checked: true })).toBeTruthy();
  });

  test('CT-PREF-07: fora do ThemeProvider o movimento fica parado', async () => {
    function Fora() {
      return <Text>{String(useMovimentoReduzido())}</Text>;
    }
    await render(<Fora />);
    expect(screen.getByText('true')).toBeTruthy();
  });

  test('CT-PREF-08: "Grande" e "Maior" aumentam o corpo e a altura da linha do texto', async () => {
    await render(
      <ThemeProvider initialTextSize="maior">
        <Texto testID="t">Olá</Texto>
      </ThemeProvider>,
    );
    const estilo = screen.getByTestId('t').props.style as unknown;
    expect(JSON.stringify(estilo)).toContain(`"fontSize":${18 * 1.3}`);
    expect(JSON.stringify(estilo)).toContain(`"lineHeight":${27 * 1.3}`);
  });

  test('CT-PREF-09: o seletor troca o tamanho e anuncia a opção marcada', async () => {
    await render(
      <ThemeProvider>
        <SeletorDeTamanhoDoTexto />
        <Texto testID="t">Olá</Texto>
      </ThemeProvider>,
    );
    expect(screen.getByRole('radio', { name: 'Normal', checked: true })).toBeTruthy();
    await act(async () => {
      await fireEvent.press(screen.getByRole('radio', { name: 'Grande' }));
    });
    expect(screen.getByRole('radio', { name: 'Grande', checked: true })).toBeTruthy();
    expect(JSON.stringify(screen.getByTestId('t').props.style)).toContain('"fontSize":20.7');
  });
});
