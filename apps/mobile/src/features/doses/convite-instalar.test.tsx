import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ConviteDeInstalacao as Convite } from '../../lib/instalar-app';
import { CHAVE_CONVITE_DISPENSADO } from '../../lib/instalar-app-comum';
import { ConviteDeInstalacao } from './convite-instalar';

const mockInstalar = jest.fn(async () => {});
let mockConvite: Convite = { forma: 'botao', instalar: mockInstalar };
jest.mock('../../lib/instalar-app', () => ({
  ...jest.requireActual('../../lib/instalar-app-comum'),
  useConviteDeInstalacao: () => mockConvite,
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockConvite = { forma: 'botao', instalar: mockInstalar };
});

describe('convite para instalar o app na aba Doses', () => {
  test('CT-APP-PWA10: depois da primeira dose aplicada mostra o convite com o botão Instalar', async () => {
    await render(<ConviteDeInstalacao dosesAplicadas={1} />);
    expect(
      await screen.findByRole('header', { name: 'Leve para a tela inicial' }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Instalar o aplicativo' }));
    expect(mockInstalar).toHaveBeenCalledTimes(1);
  });

  test('CT-APP-PWA11: sem nenhuma dose aplicada o convite não aparece', async () => {
    await render(<ConviteDeInstalacao dosesAplicadas={0} />);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    expect(screen.queryByText('Leve para a tela inicial')).not.toBeOnTheScreen();
  });

  test('CT-APP-PWA12: no iPhone mostra o passo a passo, sem botão de instalar', async () => {
    mockConvite = { forma: 'iphone', instalar: mockInstalar };
    await render(<ConviteDeInstalacao dosesAplicadas={2} />);
    expect(
      await screen.findByText(/toque em Compartilhar e depois em "Adicionar à Tela de Início"/),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Instalar o aplicativo' })).not.toBeOnTheScreen();
  });

  test('CT-APP-PWA13: "Agora não" esconde o convite e guarda a escolha no aparelho', async () => {
    await render(<ConviteDeInstalacao dosesAplicadas={1} />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Agora não' }));
    expect(screen.queryByText('Leve para a tela inicial')).not.toBeOnTheScreen();
    await waitFor(async () =>
      expect(await AsyncStorage.getItem(CHAVE_CONVITE_DISPENSADO)).not.toBeNull(),
    );
  });

  test('CT-APP-PWA14: se a pessoa já dispensou, o convite não volta', async () => {
    await AsyncStorage.setItem(CHAVE_CONVITE_DISPENSADO, '2026-11-01T00:00:00.000Z');
    await render(<ConviteDeInstalacao dosesAplicadas={3} />);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    expect(screen.queryByText('Leve para a tela inicial')).not.toBeOnTheScreen();
  });

  test('CT-APP-PWA15: no celular e no app instalado (forma nenhuma) nunca há convite', async () => {
    mockConvite = { forma: 'nenhuma', instalar: mockInstalar };
    await render(<ConviteDeInstalacao dosesAplicadas={5} />);
    await waitFor(() => expect(AsyncStorage.getItem).toHaveBeenCalled());
    expect(screen.queryByText('Leve para a tela inicial')).not.toBeOnTheScreen();
  });
});
