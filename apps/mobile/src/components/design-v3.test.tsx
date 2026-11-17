import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { ThemeProvider } from '../theme/theme-provider';
import { Atalho } from './atalho';
import { AzulejoDeMarca } from './azulejo-de-marca';
import { BlocoResumo } from './bloco-resumo';
import { Botao, classesDoBotao } from './botao';
import { Cartao } from './cartao';
import { Chip } from './chip';
import { EstadoVazio } from './estados';
import { Segmentado } from './segmentado';
import { AzulejoDeEstado, SELO_POR_ESTADO } from './selo-estado-dose';
import { Texto, linhasDoTruncamento } from './texto';

// O mock de dimensões do React Native usa fonte do aparelho a 200%, que desliga o truncamento;
// aqui o aparelho tem a fonte normal, como a maioria das pessoas.
beforeEach(() => {
  Dimensions.set({ window: { width: 390, height: 844, scale: 1, fontScale: 1 } });
});

describe('Texto: truncar (ADR-036)', () => {
  test.each([
    ['sem pedir truncamento, nunca trunca', undefined, 1, 1, undefined],
    ['texto normal e fonte do aparelho normal: trunca', 1, 1, 1, 1],
    ['duas linhas pedidas valem com texto normal', 2, 1, 1, 2],
    ['tamanho do texto Grande desliga o truncamento', 1, 1.15, 1, undefined],
    ['tamanho do texto Maior desliga o truncamento', 2, 1.3, 1, undefined],
    ['fonte do aparelho a 130% ainda trunca (limite)', 1, 1, 1.3, 1],
    ['fonte do aparelho acima de 130% desliga o truncamento', 1, 1, 1.31, undefined],
    ['fonte do aparelho a 200% desliga o truncamento', 3, 1, 2, undefined],
  ] as const)('CT-UI-16: %s', (_nome, truncar, escalaApp, escalaAparelho, esperado) => {
    expect(linhasDoTruncamento(truncar, escalaApp, escalaAparelho)).toBe(esperado);
  });

  test('CT-UI-16b: com `truncar`, o componente limita as linhas e usa reticências', async () => {
    await render(
      <Texto truncar={1} testID="t">
        um-email-muito-longo-que-nao-cabe@exemplo.com.br
      </Texto>,
    );
    const texto = screen.getByTestId('t');
    expect(texto.props.numberOfLines).toBe(1);
    expect(texto.props.ellipsizeMode).toBe('tail');
  });

  test('CT-UI-16c: sem `truncar`, o texto quebra livremente (nome de vacina, estado, data)', async () => {
    await render(<Texto testID="t">Pneumocócica 23-valente, 1ª dose</Texto>);
    expect(screen.getByTestId('t').props.numberOfLines).toBeUndefined();
  });

  test('CT-UI-16d: com o tamanho do texto Grande na Conta, o truncamento é desligado', async () => {
    function Probe() {
      return (
        <Texto truncar={1} testID="t">
          nome comprido
        </Texto>
      );
    }
    await render(
      <ThemeProvider initialTextSize="grande">
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('t').props.numberOfLines).toBeUndefined();
  });
});

describe('Botao: hierarquia (ADR-036)', () => {
  test('CT-UI-17: texto e texto de perigo não têm fundo nem contorno e usam 48 dp', () => {
    for (const variante of ['texto', 'perigoTexto'] as const) {
      const { caixa } = classesDoBotao(variante, false);
      expect(caixa).toContain('bg-transparent');
      expect(caixa).toContain('border-transparent');
      expect(caixa).toContain('min-h-toque');
      expect(caixa).not.toContain('min-h-principal');
    }
    expect(classesDoBotao('texto', false).texto).toBe('text-primaria');
    expect(classesDoBotao('perigoTexto', false).texto).toBe('text-erro');
  });

  test('CT-UI-17b: o tamanho compacto usa 48 dp; o padrão mantém 56 dp', () => {
    expect(classesDoBotao('principal', false, true).caixa).toContain('min-h-toque');
    expect(classesDoBotao('principal', false, true).caixa).not.toContain('min-h-principal');
    expect(classesDoBotao('principal', false).caixa).toContain('min-h-principal');
  });

  test('CT-UI-17c: botão de texto de perigo é um botão com rótulo e dispara o toque', async () => {
    const onPress = jest.fn();
    await render(<Botao titulo="Cancelar dose" variante="perigoTexto" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar dose' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('Chip', () => {
  test('CT-UI-18: anuncia o estado selecionado e dispara o toque', async () => {
    const onPress = jest.fn();
    await render(<Chip rotulo="Helena" selecionado onPress={onPress} />);
    const chip = screen.getByRole('button', { name: 'Helena' });
    expect(chip).toBeSelected();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('CT-UI-18b: o aviso é decoração; o motivo vai no rótulo de acessibilidade', async () => {
    await render(<Chip rotulo="Pedro" aviso rotuloAcessivel="Pedro, 1 dose atrasada" />);
    expect(screen.getByRole('button', { name: 'Pedro, 1 dose atrasada' })).toBeOnTheScreen();
  });

  test('CT-UI-18c: nome muito longo trunca em uma linha (texto normal)', async () => {
    await render(<Chip rotulo="Maria da Conceição Aparecida de Oliveira Santos" />);
    expect(screen.getByText(/Maria da Conceição/).props.numberOfLines).toBe(1);
  });
});

describe('Chip em escolha múltipla', () => {
  test('CT-UI-22: papel checkbox anuncia o estado ligado e mostra o visto', async () => {
    const onPress = jest.fn();
    await render(<Chip papel="checkbox" rotulo="7 dias antes" selecionado onPress={onPress} />);
    const chip = screen.getByRole('checkbox', { name: '7 dias antes' });
    expect(chip).toBeChecked();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('CT-UI-22b: desligado, o chip checkbox não está marcado', async () => {
    await render(<Chip papel="checkbox" rotulo="3 dias antes" />);
    expect(screen.getByRole('checkbox', { name: '3 dias antes' })).not.toBeChecked();
  });
});

describe('Segmentado', () => {
  const opcoes = [
    { valor: 'a', rotulo: 'Claro' },
    { valor: 'b', rotulo: 'Escuro' },
    { valor: 'c', rotulo: 'Alto contraste' },
  ] as const;

  test('CT-UI-19: é um grupo de rádios com a opção escolhida anunciada', async () => {
    await render(<Segmentado rotulo="Tema" valor="b" opcoes={opcoes} aoEscolher={jest.fn()} />);
    expect(screen.getByLabelText('Tema')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Claro' })).not.toBeChecked();
  });

  test('CT-UI-19b: tocar em uma opção chama aoEscolher com o valor', async () => {
    const aoEscolher = jest.fn();
    await render(<Segmentado rotulo="Tema" valor="a" opcoes={opcoes} aoEscolher={aoEscolher} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Alto contraste' }));
    expect(aoEscolher).toHaveBeenCalledWith('c');
  });

  test('CT-UI-19c: o texto da opção não é truncado (quebra de linha)', async () => {
    await render(<Segmentado rotulo="Tema" valor="a" opcoes={opcoes} aoEscolher={jest.fn()} />);
    expect(screen.getByText('Alto contraste').props.numberOfLines).toBeUndefined();
  });
});

describe('BlocoResumo', () => {
  test('CT-UI-20: mostra legenda, título e o conteúdo abaixo', async () => {
    await render(
      <BlocoResumo legenda="Calendário de Helena, 3 anos" titulo="1 dose para resolver">
        <Texto>2 aplicadas</Texto>
      </BlocoResumo>,
    );
    expect(screen.getByText('Calendário de Helena, 3 anos')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '1 dose para resolver' })).toBeOnTheScreen();
    expect(screen.getByText('2 aplicadas')).toBeOnTheScreen();
  });
});

describe('Cartao e azulejo de estado', () => {
  test('CT-UI-21: o cartão suave usa o fundo suave e o padrão usa a superfície', async () => {
    await render(
      <>
        <Cartao testID="padrao" />
        <Cartao testID="suave" suave />
      </>,
    );
    expect(screen.getByTestId('padrao').props.className).toContain('bg-superficie ');
    expect(screen.getByTestId('suave').props.className).toContain('bg-superficieSuave');
  });

  test.each(Object.keys(SELO_POR_ESTADO))(
    'CT-UI-21b: o azulejo do estado %s é decorativo para o leitor de tela',
    async (status) => {
      await render(<AzulejoDeEstado status={status as keyof typeof SELO_POR_ESTADO} />);
      expect(screen.queryByRole('image')).toBeNull();
      expect(screen.queryByLabelText(/Dose /)).toBeNull();
    },
  );

  test('CT-UI-21c: o estado vazio mostra título e descrição, e o ícone é decorativo', async () => {
    await render(
      <EstadoVazio
        titulo="Nenhuma pessoa cadastrada"
        descricao="Adicione alguém."
        icone="familia"
      />,
    );
    expect(screen.getByRole('header', { name: 'Nenhuma pessoa cadastrada' })).toBeOnTheScreen();
    expect(screen.getByText('Adicione alguém.')).toBeOnTheScreen();
  });
});

describe('Atalho e azulejo da marca', () => {
  test('CT-UI-23: o atalho é um link com rótulo completo e abre ao tocar', async () => {
    const aoAbrir = jest.fn();
    await render(
      <Atalho
        icone="local"
        titulo="Vou viajar"
        apoio="Veja o que conferir antes da viagem."
        aoAbrir={aoAbrir}
      />,
    );
    const link = screen.getByRole('link', {
      name: 'Vou viajar. Veja o que conferir antes da viagem.',
    });
    await fireEvent.press(link);
    expect(aoAbrir).toHaveBeenCalledTimes(1);
  });

  test('CT-UI-23b: o rótulo de acessibilidade pode ser trocado e o texto do atalho não é truncado', async () => {
    await render(
      <Atalho
        icone="historico"
        titulo="Painel de gráficos"
        apoio="Veja a situação das vacinas da família em gráficos."
        rotuloAcessivel="Painel de gráficos, abre os gráficos da família"
        aoAbrir={jest.fn()}
      />,
    );
    expect(
      screen.getByRole('link', { name: 'Painel de gráficos, abre os gráficos da família' }),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Veja a situação das vacinas da família em gráficos.', {
        includeHiddenElements: true,
      }).props.numberOfLines,
    ).toBeUndefined();
  });

  test('CT-UI-23c: o azulejo da marca é decorativo para o leitor de tela', async () => {
    await render(<AzulejoDeMarca icone="familia" />);
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.queryByLabelText(/.+/)).toBeNull();
  });
});
