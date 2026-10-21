import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';
import {
  ACCEPTED,
  STORED_SESSION,
  createFakeFetch,
  memorySessionStore,
  renderScreen,
} from '../../test-utils';
import { AccountScreen } from './account-screen';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const largura = (valor: number) =>
  (useWindowDimensions as jest.Mock).mockReturnValue({
    width: valor,
    height: 800,
    scale: 1,
    fontScale: 1,
  });

const abrir = async () => {
  const { store, box } = memorySessionStore({
    ...STORED_SESSION,
    expiresAt: Date.now() + 3_600_000,
  });
  const fake = createFakeFetch({ 'GET /consent': { status: 200, body: ACCEPTED } });
  await renderScreen(<AccountScreen />, fake.fetchFn, { store });
  return box;
};

describe('botão Sair na aba Conta', () => {
  test('CT-APP-SAIR01: no celular o Sair fica logo abaixo do cabeçalho, antes das seções', async () => {
    largura(390);
    const box = await abrir();
    const sair = await screen.findByRole('button', { name: 'Sair' });
    expect(sair).toBeOnTheScreen();
    const botoes = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel ?? '');
    expect(botoes.indexOf('Sair')).toBeLessThan(botoes.indexOf('Excluir minha conta'));
    await fireEvent.press(sair);
    await waitFor(() => expect(box.clears).toBe(1));
  });

  test('CT-APP-SAIR02: no computador o Sair da tela some, porque a barra lateral já tem o dela', async () => {
    largura(1280);
    await abrir();
    expect(await screen.findByText('Seus dados')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sair' })).not.toBeOnTheScreen();
  });
});
