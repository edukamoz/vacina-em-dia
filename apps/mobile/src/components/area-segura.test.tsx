import type * as React from 'react';
import { screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { AssistenteProvider } from '../features/assistant/assistente-contexto';
import { createFakeFetch, renderScreen } from '../test-utils';
import { BalaoAssistente } from './balao-assistente';
import { BarraDeNavegacao } from './barra-de-navegacao';

jest.mock('expo-router', () => ({
  usePathname: () => '/',
  Link: ({ children }: never) => children,
}));
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 24 }),
}));

const SEM_FOTO = { status: 404, body: { code: 'NOT_FOUND', message: 'Não encontramos.' } };
const abrir = (ui: React.ReactElement) =>
  renderScreen(ui, createFakeFetch({ 'GET /account/photo': SEM_FOTO }).fetchFn);

describe('área segura do Android (barra do sistema)', () => {
  test('CT-LAY-20: a barra de baixo sobe o tanto que a barra do sistema ocupa', async () => {
    await abrir(
      <AssistenteProvider>
        <BarraDeNavegacao largura={390} />
      </AssistenteProvider>,
    );
    const estilo = StyleSheet.flatten(screen.getByLabelText('Menu principal').props.style);
    expect(estilo.paddingBottom).toBe(8 + 24);
  });

  test('CT-LAY-21: a barra lateral (tablet e computador) não ganha folga embaixo', async () => {
    await abrir(
      <AssistenteProvider>
        <BarraDeNavegacao largura={1280} />
      </AssistenteProvider>,
    );
    const estilo = StyleSheet.flatten(screen.getByLabelText('Menu principal').props.style);
    expect(estilo.paddingBottom).toBeUndefined();
  });

  test('CT-LAY-22: o botão do assistente também sobe, para não ficar atrás da barra do sistema', async () => {
    await abrir(
      <AssistenteProvider>
        <BalaoAssistente largura={390} />
      </AssistenteProvider>,
    );
    const estilo = StyleSheet.flatten(screen.getByLabelText('Abrir o assistente').props.style);
    expect(estilo.marginBottom).toBe(24);
  });
});
