import { screen } from '@testing-library/react-native';
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

const abrir = async (extra: Parameters<typeof createFakeFetch>[0] = {}) => {
  const { store } = memorySessionStore({ ...STORED_SESSION, expiresAt: Date.now() + 3_600_000 });
  const fake = createFakeFetch({ 'GET /consent': { status: 200, body: ACCEPTED }, ...extra });
  await renderScreen(<AccountScreen />, fake.fetchFn, { store });
};

describe('Conta no design v3', () => {
  test('CT-APP-CONTA10: o texto de exemplo acompanha o seletor de tamanho', async () => {
    await abrir();
    expect(await screen.findByText(/Exemplo: Covid-19, reforço/)).toBeOnTheScreen();
  });

  test('CT-APP-CONTA11: "Sobre o calendário" mostra quando o Ministério foi conferido, se a API disser', async () => {
    await abrir({
      'GET /calendar/watch': {
        status: 200,
        body: { checkedAt: '2026-11-10T12:00:00.000Z', changed: false },
      },
    });
    expect(
      await screen.findByText(/Conferido com o site do Ministério da Saúde em 10\/11\/2026/),
    ).toBeOnTheScreen();
  });

  test('CT-APP-CONTA12: sem conferência da API a frase não aparece', async () => {
    await abrir();
    await screen.findByText('Sobre o calendário');
    expect(screen.queryByText(/Conferido com o site do Ministério/)).not.toBeOnTheScreen();
  });
});
