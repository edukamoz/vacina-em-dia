import { Text } from 'react-native';
import type * as React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AssistenteProvider, useAssistente } from '../features/assistant/assistente-contexto';
import { createFakeFetch, memorySessionStore, renderScreen, STORED_SESSION } from '../test-utils';
import type { SessionStore } from '../session/auth-storage';
import { ABAS, BarraDeNavegacao } from './barra-de-navegacao';

const SEM_FOTO = { status: 404, body: { code: 'NOT_FOUND', message: 'Não encontramos.' } };
const abrir = (ui: React.ReactElement, store?: SessionStore) =>
  renderScreen(
    ui,
    createFakeFetch({ 'GET /account/photo': SEM_FOTO }).fetchFn,
    store ? { store } : {},
  );

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
    await abrir(
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
    await abrir(
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
    await abrir(
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
      await abrir(
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
    'CT-LAY-10: com %i px o assistente é um botão da barra (não um link de página) que abre a janela',
    async (largura) => {
      await abrir(
        <AssistenteProvider>
          <BarraDeNavegacao largura={largura} />
          <Estado />
        </AssistenteProvider>,
      );
      expect(screen.queryByRole('link', { name: /Assistente/ })).not.toBeOnTheScreen();
      expect(screen.getByText('janela fechada')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Abrir o assistente' }));
      expect(screen.getByText('janela aberta')).toBeOnTheScreen();
    },
  );

  test('CT-LAY-27: no celular o microfone fica no centro, entre as duas primeiras e as duas últimas abas', async () => {
    await abrir(
      <AssistenteProvider>
        <BarraDeNavegacao largura={390} />
      </AssistenteProvider>,
    );
    const ordem = screen
      .getAllByRole(/link|button/)
      .map((item) => item.props.accessibilityLabel as string);
    expect(ordem).toEqual(['Doses', 'Família', 'Abrir o assistente', 'Histórico', 'Conta']);
  });

  test('CT-LAY-28: o botão do assistente tem rótulo e dica para o leitor de tela', async () => {
    await abrir(
      <AssistenteProvider>
        <BarraDeNavegacao largura={390} />
      </AssistenteProvider>,
    );
    const botao = screen.getByRole('button', { name: 'Abrir o assistente' });
    expect(botao.props.accessibilityHint).toBe('Pergunte sobre vacinas por voz ou por texto');
  });

  test('CT-LAY-29: no computador o assistente ganha texto ("Assistente" e "Fale ou escreva")', async () => {
    await abrir(
      <AssistenteProvider>
        <BarraDeNavegacao largura={1280} />
      </AssistenteProvider>,
    );
    expect(screen.getByText('Assistente')).toBeOnTheScreen();
    expect(screen.getByText('Fale ou escreva')).toBeOnTheScreen();
  });

  test('CT-LAY-30: no tablet o assistente é só o círculo, sem texto que estoure a barra estreita', async () => {
    await abrir(
      <AssistenteProvider>
        <BarraDeNavegacao largura={800} />
      </AssistenteProvider>,
    );
    expect(screen.queryByText('Fale ou escreva')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Abrir o assistente' })).toBeOnTheScreen();
  });
  test.each([800, 1280])(
    'CT-LAY-23: com %i px o Sair fica na barra lateral, junto da aba Conta',
    async (largura) => {
      await abrir(
        <AssistenteProvider>
          <BarraDeNavegacao largura={largura} />
        </AssistenteProvider>,
      );
      expect(screen.getByRole('button', { name: 'Sair' })).toBeOnTheScreen();
      expect(screen.getByRole('link', { name: 'Conta' })).toBeOnTheScreen();
    },
  );

  test('CT-LAY-24: no celular a barra de baixo não tem o botão Sair (ele fica na tela Conta)', async () => {
    await abrir(
      <AssistenteProvider>
        <BarraDeNavegacao largura={390} />
      </AssistenteProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeOnTheScreen();
  });

  test('CT-LAY-25: a aba Conta mostra a inicial do e-mail no lugar do ícone', async () => {
    const { store } = memorySessionStore(STORED_SESSION);
    await abrir(
      <AssistenteProvider>
        <BarraDeNavegacao largura={390} />
      </AssistenteProvider>,
      store,
    );
    expect(await screen.findByText('M', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  test('CT-LAY-26: tocar em Sair encerra a sessão', async () => {
    const { store, box } = memorySessionStore(STORED_SESSION);
    await abrir(
      <AssistenteProvider>
        <BarraDeNavegacao largura={1280} />
      </AssistenteProvider>,
      store,
    );
    await fireEvent.press(await screen.findByRole('button', { name: 'Sair' }));
    await waitFor(() => expect(box.clears).toBe(1));
  });
});
