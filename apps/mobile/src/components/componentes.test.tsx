import type { DoseResponse } from '@vacina/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DoseCard, doseHint } from '../features/doses/dose-card';
import { ThemeProvider, useTheme } from '../theme/theme-provider';
import { AvisoFonte } from './aviso-fonte';
import { Botao } from './botao';
import { EstadoCarregando, EstadoErro, EstadoVazio } from './estados';
import { SeletorDeTema } from './seletor-de-tema';
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

const FONTE = {
  name: 'conjunto de exemplo do projeto (FICTITIOUS)',
  version: '0.0-exemplo',
  isFictitious: true,
  notice:
    'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
};
const DOSE: DoseResponse = {
  id: 'ex-2',
  vaccine: 'Vacina de exemplo B',
  doseLabel: '2ª dose',
  status: 'OVERDUE',
  dueDate: '2026-09-15',
  scheduledDate: null,
  appliedDate: null,
};

describe('DoseCard', () => {
  test.each([
    ['PENDING', {}, 'Ainda sem data marcada'],
    ['SCHEDULED', { scheduledDate: '2026-11-04' }, 'Marcada para 04/11/2026'],
    ['OVERDUE', { dueDate: '2026-09-15' }, 'Era para 15/09/2026'],
    ['APPLIED', { appliedDate: '2026-03-10' }, 'Aplicada em 10/03/2026'],
    ['CANCELLED', {}, 'Não é mais necessária'],
  ] as const)('CT-UI-04: dica de leitura da dose %s', (status, dates, expected) => {
    expect(doseHint({ ...DOSE, status, ...dates })).toBe(expected);
  });

  test('CT-UI-05: mostra vacina, dose, selo e dica', async () => {
    await render(<DoseCard dose={DOSE} />);
    expect(screen.getByText('Vacina de exemplo B, 2ª dose')).toBeOnTheScreen();
    expect(screen.getByLabelText('Dose atrasada')).toBeOnTheScreen();
    expect(screen.getByText('Era para 15/09/2026')).toBeOnTheScreen();
  });
});

describe('AvisoFonte', () => {
  test('CT-UI-07: dados fictícios são marcados como calendário de exemplo e citam fonte e versão', async () => {
    await render(<AvisoFonte fonte={FONTE} />);
    expect(screen.getByText(/Calendário de exemplo/)).toBeOnTheScreen();
    expect(screen.getByText(/versão 0\.0-exemplo/)).toBeOnTheScreen();
    expect(screen.getByText(/não substitui a caderneta oficial/)).toBeOnTheScreen();
  });

  test('CT-UI-08: dados reais não levam a marca de exemplo', async () => {
    await render(<AvisoFonte fonte={{ ...FONTE, isFictitious: false }} />);
    expect(screen.queryByText(/Calendário de exemplo/)).not.toBeOnTheScreen();
  });
});

describe('estados', () => {
  test('CT-UI-09: carregando anuncia o rótulo ao leitor de tela', async () => {
    await render(<EstadoCarregando rotulo="Carregando as doses" />);
    expect(screen.getByLabelText('Carregando as doses')).toBeOnTheScreen();
  });

  test('CT-UI-10: erro mostra a mensagem e dispara "Tentar de novo"', async () => {
    const onTentarDeNovo = jest.fn();
    await render(<EstadoErro mensagem="Sem conexão." onTentarDeNovo={onTentarDeNovo} />);
    expect(screen.getByText('Sem conexão.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onTentarDeNovo).toHaveBeenCalledTimes(1);
  });

  test('CT-UI-11: vazio mostra título e descrição', async () => {
    await render(<EstadoVazio titulo="Nenhuma dose" descricao="Volte depois." />);
    expect(screen.getByRole('header', { name: 'Nenhuma dose' })).toBeOnTheScreen();
  });
});

describe('SeletorDeTema', () => {
  test('CT-TEMA-04: marca o tema em uso e troca ao tocar', async () => {
    await render(
      <ThemeProvider initialPreference="light">
        <SeletorDeTema />
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Claro' })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: 'Escuro' }));
    expect(screen.getByRole('button', { name: 'Escuro' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'Claro' })).not.toBeSelected();
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
