import { fireEvent, screen } from '@testing-library/react-native';
import {
  ACCEPTED,
  STORED_SESSION,
  createFakeFetch,
  memorySessionStore,
  renderScreen,
} from '../../test-utils';
import { AccountScreen } from './account-screen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../lib/config-pix', () => ({
  PIX_DA_DOACAO: { chave: 'abc', nome: 'Ana', cidade: 'Sorocaba' },
}));

test('CT-APP-PIX23: com o Pix configurado, a aba Conta oferece "Doar com Pix" e abre a janela', async () => {
  const { store } = memorySessionStore({ ...STORED_SESSION, expiresAt: Date.now() + 3_600_000 });
  const fake = createFakeFetch({ 'GET /consent': { status: 200, body: ACCEPTED } });
  await renderScreen(<AccountScreen />, fake.fetchFn, { store });
  expect(await screen.findByText('Apoie o projeto')).toBeOnTheScreen();
  expect(screen.getByText(/não libera nada e é opcional/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Doar com Pix' }));
  expect(mockPush).toHaveBeenCalledWith('/apoiar');
});
