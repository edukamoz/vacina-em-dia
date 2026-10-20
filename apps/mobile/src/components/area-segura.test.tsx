import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { AssistenteProvider } from '../features/assistant/assistente-contexto';
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

describe('área segura do Android (barra do sistema)', () => {
  test('CT-LAY-20: a barra de baixo sobe o tanto que a barra do sistema ocupa', async () => {
    await render(
      <AssistenteProvider>
        <BarraDeNavegacao largura={390} />
      </AssistenteProvider>,
    );
    const estilo = StyleSheet.flatten(screen.getByLabelText('Menu principal').props.style);
    expect(estilo.paddingBottom).toBe(8 + 24);
  });

  test('CT-LAY-21: a barra lateral (tablet e computador) não ganha folga embaixo', async () => {
    await render(
      <AssistenteProvider>
        <BarraDeNavegacao largura={1280} />
      </AssistenteProvider>,
    );
    const estilo = StyleSheet.flatten(screen.getByLabelText('Menu principal').props.style);
    expect(estilo.paddingBottom).toBeUndefined();
  });

  test('CT-LAY-22: o botão do assistente também sobe, para não ficar atrás da barra do sistema', async () => {
    await render(
      <AssistenteProvider>
        <BalaoAssistente largura={390} />
      </AssistenteProvider>,
    );
    const estilo = StyleSheet.flatten(screen.getByLabelText('Abrir o assistente').props.style);
    expect(estilo.marginBottom).toBe(24);
  });
});
