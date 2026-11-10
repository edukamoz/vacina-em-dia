import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard, Text, View } from 'react-native';
import { ThemeProvider } from '../theme/theme-provider';
import { CampoTexto } from './campo-texto';
import { RolagemComTeclado } from './rolagem-com-teclado';

type Ouvinte = (evento: { endCoordinates: { screenY: number } }) => void;

describe('rolagem com teclado', () => {
  afterEach(() => jest.restoreAllMocks());

  test('CT-TEC-10: mostra o conteúdo e escuta o teclado só enquanto está na tela', async () => {
    const remover = jest.fn();
    const escutar = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation(() => ({ remove: remover }) as never);
    const tela = await render(
      <RolagemComTeclado>
        <Text>Conteúdo</Text>
      </RolagemComTeclado>,
    );
    expect(screen.getByText('Conteúdo')).toBeOnTheScreen();
    expect(escutar).toHaveBeenCalledTimes(2);
    await tela.unmount();
    expect(remover).toHaveBeenCalledTimes(2);
  });

  test('CT-TEC-11: com o teclado aberto, a área de rolagem ganha folga embaixo; ao fechar, perde', async () => {
    const ouvintes: Record<string, Ouvinte> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((nome: string, f: Ouvinte) => {
      ouvintes[nome] = f;
      return { remove: jest.fn() };
    }) as never);
    // O quadro mede 100 a 700 na janela; o teclado começa em 500, então cobre 200.
    jest
      .spyOn(View.prototype as unknown as { measureInWindow: () => void }, 'measureInWindow')
      .mockImplementation(((chamada: (x: number, y: number, l: number, a: number) => void) =>
        chamada(0, 100, 300, 600)) as never);
    const { toJSON } = await render(
      <RolagemComTeclado>
        <Text>Conteúdo</Text>
      </RolagemComTeclado>,
    );
    const folga = () => JSON.stringify(toJSON()).match(/"paddingBottom":(\d+)/)?.[1];
    expect(folga()).toBe('0');
    const mostrar = Object.entries(ouvintes).find(([nome]) => /Show|ChangeFrame/.test(nome));
    const esconder = Object.entries(ouvintes).find(([nome]) => /Hide/.test(nome));
    if (!mostrar || !esconder) throw new Error('ouvintes do teclado não registrados');
    await act(async () => mostrar[1]({ endCoordinates: { screenY: 500 } }));
    expect(folga()).toBe('200');
    await act(async () => esconder[1]({ endCoordinates: { screenY: 800 } }));
    expect(folga()).toBe('0');
  });

  test('CT-TEC-12: o campo de texto aceita o foco dentro e fora da rolagem', async () => {
    await render(
      <ThemeProvider>
        <RolagemComTeclado>
          <CampoTexto rotulo="Nome" />
        </RolagemComTeclado>
        <CampoTexto rotulo="Sobrenome" />
      </ThemeProvider>,
    );
    await fireEvent(screen.getByLabelText('Nome'), 'focus');
    await fireEvent(screen.getByLabelText('Sobrenome'), 'focus');
    expect(screen.getByLabelText('Sobrenome')).toBeOnTheScreen();
  });
});
