import { fireEvent, render, screen } from '@testing-library/react-native';
import { DoseCard, doseHint } from '../features/doses/dose-card';
import { SAMPLE_DOSES, SAMPLE_SOURCE } from '../features/doses/sample-doses';
import { ThemeProvider, useTheme } from '../theme/theme-provider';
import { AvisoFonte } from './aviso-fonte';
import { Botao } from './botao';
import { SELO_POR_ESTADO, SeloEstadoDose } from './selo-estado-dose';

describe('Botao', () => {
  test('CT-UI-01: expõe papel, rótulo e dispara o toque', async () => {
    const onPress = jest.fn();
    await render(<Botao titulo="Aceito" onPress={onPress} />);
    const botao = screen.getByRole('button', { name: 'Aceito' });
    await fireEvent.press(botao);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('CT-UI-02: botão desativado informa o estado e não dispara o toque', async () => {
    const onPress = jest.fn();
    await render(<Botao titulo="Salvar" disabled onPress={onPress} />);
    const botao = screen.getByRole('button', { name: 'Salvar' });
    await fireEvent.press(botao);
    expect(botao).toBeDisabled();
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('SeloEstadoDose', () => {
  test.each(Object.entries(SELO_POR_ESTADO))(
    'CT-UI-03: o selo %s tem rótulo de acessibilidade com o estado',
    async (status, selo) => {
      await render(<SeloEstadoDose status={status as keyof typeof SELO_POR_ESTADO} />);
      expect(screen.getByLabelText(`Dose ${selo.rotulo.toLowerCase()}`)).toBeOnTheScreen();
    },
  );
});

describe('DoseCard', () => {
  test.each([
    ['PENDING', 'Ainda sem data marcada'],
    ['SCHEDULED', 'Marcada para 04/11/2026'],
    ['OVERDUE', 'Era para 04/11/2026'],
    ['APPLIED', 'Aplicada em 04/11/2026'],
    ['CANCELLED', 'Não é mais necessária'],
  ] as const)('CT-UI-04: dica de leitura da dose %s', (status, expected) => {
    expect(doseHint({ status, date: '2026-11-04' })).toBe(expected);
  });

  test('CT-UI-05: mostra vacina, dose, selo e dica', async () => {
    const dose = SAMPLE_DOSES[1]!;
    await render(<DoseCard dose={dose} />);
    expect(screen.getByText(`${dose.vaccine}, ${dose.doseLabel}`)).toBeOnTheScreen();
    expect(screen.getByLabelText('Dose atrasada')).toBeOnTheScreen();
    expect(screen.getByText('Era para 15/09/2026')).toBeOnTheScreen();
  });

  test('CT-UI-06: o conjunto de exemplo cobre os cinco estados', () => {
    expect(new Set(SAMPLE_DOSES.map((d) => d.status)).size).toBe(5);
  });
});

describe('AvisoFonte', () => {
  test('CT-UI-07: dados fictícios são marcados como calendário de exemplo e citam fonte e versão', async () => {
    await render(<AvisoFonte fonte={SAMPLE_SOURCE} />);
    expect(screen.getByText(/Calendário de exemplo/)).toBeOnTheScreen();
    expect(screen.getByText(/versão 0\.0-exemplo/)).toBeOnTheScreen();
    expect(screen.getByText(/não substitui a caderneta oficial/)).toBeOnTheScreen();
  });

  test('CT-UI-08: dados reais não levam a marca de exemplo', async () => {
    await render(<AvisoFonte fonte={{ nome: 'Fonte X', versao: '1', ficticio: false }} />);
    expect(screen.queryByText(/Calendário de exemplo/)).not.toBeOnTheScreen();
  });
});

describe('ThemeProvider', () => {
  function Probe() {
    const { theme, setPreference } = useTheme();
    return <Botao titulo={`tema:${theme}`} onPress={() => setPreference('highContrast')} />;
  }

  test('CT-TEMA-02: segue o sistema por padrão e troca para alto contraste por escolha', async () => {
    await render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'tema:light' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button'));
    expect(screen.getByRole('button', { name: 'tema:highContrast' })).toBeOnTheScreen();
  });

  test('CT-TEMA-03: useTheme fora do provedor lança erro claro', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<Probe />)).rejects.toThrow(
      'useTheme deve ser usado dentro do ThemeProvider',
    );
    spy.mockRestore();
  });
});
