import { Text } from 'react-native';
import type * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AssistenteProvider, useAssistente } from '../features/assistant/assistente-contexto';
import { ABAS, BarraDeNavegacao } from './barra-de-navegacao';

function Estado() {
  const { aberto } = useAssistente();
  return <Text>{aberto ? 'janela aberta' : 'janela fechada'}</Text>;
}

const mockPush = jest.fn();
let mockPath = '/';
jest.mock('expo-router', () => {
  const { cloneElement } = jest.requireActual('react') as typeof React;
  return {
    usePathname: () => mockPath,
    Link: ({ href, children }: { href: string; children: React.ReactElement }) =>
      cloneElement(children, { onPress: () => mockPush(href) } as never),
  };
});

beforeEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
  mockPath = '/';
});

describe('navegação principal', () => {
  test('CT-LAY-03: tem as quatro abas, cada uma como link com o nome da página', async () => {
    await render(
      <AssistenteProvider>
        <BarraDeNavegacao largura={390} />
      </AssistenteProvider>,
    );
    expect(screen.getByLabelText('Menu principal')).toBeOnTheScreen();
    for (const { titulo } of ABAS) {
      expect(screen.getByRole('link', { name: titulo })).toBeOnTheScreen();
    }
  });

  test('CT-LAY-04: marca a página atual e leva ao caminho de cada aba ao tocar', async () => {
    mockPath = '/';
    await render(
      <AssistenteProvider>
        <BarraDeNavegacao largura={390} />
      </AssistenteProvider>,
    );
    expect(screen.getByRole('link', { name: 'Doses' })).toBeSelected();
    expect(screen.getByRole('link', { name: 'Família' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('link', { name: 'Histórico' }));
    expect(mockPush).toHaveBeenCalledWith('/historico');
  });

  test('CT-LAY-05: no computador mostra o logo com o nome do app e o texto de cada aba', async () => {
    await render(
      <AssistenteProvider>
        <BarraDeNavegacao largura={1280} />
      </AssistenteProvider>,
    );
    expect(screen.getByText('em Dia')).toBeOnTheScreen();
    expect(screen.getByText('Doses')).toBeOnTheScreen();
    expect(screen.getByText('Conta')).toBeOnTheScreen();
  });

  test.each([390, 800])(
    'CT-LAY-06: com %i px não mostra o cabeçalho nem o aviso da barra larga',
    async (largura) => {
      await render(
        <AssistenteProvider>
          <BarraDeNavegacao largura={largura} />
        </AssistenteProvider>,
      );
      expect(screen.queryByText('em Dia')).not.toBeOnTheScreen();
      expect(screen.queryByText(/Versão de demonstração/)).not.toBeOnTheScreen();
      expect(screen.getByRole('link', { name: 'Conta' })).toBeOnTheScreen();
    },
  );

  test.each([390, 800, 1280])(
    'CT-LAY-10: com %i px o assistente não é item do menu (o botão flutuante abre a janela)',
    async (largura) => {
      await render(
        <AssistenteProvider>
          <BarraDeNavegacao largura={largura} />
          <Estado />
        </AssistenteProvider>,
      );
      expect(screen.queryByRole('button', { name: 'Assistente' })).not.toBeOnTheScreen();
      expect(screen.queryByRole('link', { name: 'Assistente' })).not.toBeOnTheScreen();
      expect(screen.getByText('janela fechada')).toBeOnTheScreen();
    },
  );
});
