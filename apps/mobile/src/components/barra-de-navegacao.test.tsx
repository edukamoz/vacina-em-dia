import type * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ABAS, BarraDeNavegacao } from './barra-de-navegacao';

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
  test('CT-LAY-03: tem as cinco abas, cada uma como link com o nome da página', async () => {
    await render(<BarraDeNavegacao largura={390} />);
    expect(screen.getByLabelText('Menu principal')).toBeOnTheScreen();
    for (const { titulo } of ABAS) {
      expect(screen.getByRole('link', { name: titulo })).toBeOnTheScreen();
    }
  });

  test('CT-LAY-04: marca a página atual e leva ao caminho de cada aba ao tocar', async () => {
    mockPath = '/calendario';
    await render(<BarraDeNavegacao largura={390} />);
    expect(screen.getByRole('link', { name: 'Calendário' })).toBeSelected();
    expect(screen.getByRole('link', { name: 'Família' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('link', { name: 'Histórico' }));
    expect(mockPush).toHaveBeenCalledWith('/historico');
  });

  test('CT-LAY-05: no computador mostra o nome do app, o aviso e o texto de cada aba', async () => {
    await render(<BarraDeNavegacao largura={1280} />);
    expect(screen.getByRole('header', { name: 'Vacina em Dia' })).toBeOnTheScreen();
    expect(screen.getByText('Carteira de vacinação da família')).toBeOnTheScreen();
    expect(screen.getByText(/Versão de demonstração, sem login/)).toBeOnTheScreen();
  });

  test.each([390, 800])(
    'CT-LAY-06: com %i px não mostra o cabeçalho nem o aviso da barra larga',
    async (largura) => {
      await render(<BarraDeNavegacao largura={largura} />);
      expect(screen.queryByRole('header', { name: 'Vacina em Dia' })).not.toBeOnTheScreen();
      expect(screen.queryByText(/Versão de demonstração/)).not.toBeOnTheScreen();
      expect(screen.getByRole('link', { name: 'Conta' })).toBeOnTheScreen();
    },
  );
});
