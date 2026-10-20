import { screen } from '@testing-library/react-native';
import { createFakeFetch, renderScreen } from '../../test-utils';
import { DonateScreen } from './donate-screen';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('../../lib/config-pix', () => ({ PIX_DA_DOACAO: null }));

test('CT-APP-PIX22: sem a chave configurada não mostra QR nem código, só um aviso', async () => {
  await renderScreen(<DonateScreen />, createFakeFetch({}).fetchFn);
  expect(await screen.findByText(/doação por Pix não está disponível/)).toBeOnTheScreen();
  expect(screen.queryByLabelText('QR Code do Pix')).not.toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Copiar código Pix' })).not.toBeOnTheScreen();
});
