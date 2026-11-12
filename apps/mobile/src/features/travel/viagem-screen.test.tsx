import type * as Dates from '../../lib/dates';
import { fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { MEMBER, createFakeFetch, dose, memberDoses, renderScreen } from '../../test-utils';
import { ViagemScreen } from './viagem-screen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: mockBack, canGoBack: () => true }),
}));
jest.mock('../../lib/dates', () => ({
  ...jest.requireActual<typeof Dates>('../../lib/dates'),
  todayCivil: () => '2026-11-12',
}));

const FAMILIA = { 'GET /members': { status: 200, body: { items: [MEMBER] } } };

describe('preparar viagem (B74)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('CT-APP-V01: só mostra o roteiro depois de tocar em "Ver o roteiro", com fonte e aviso', async () => {
    const fake = createFakeFetch({
      ...FAMILIA,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([dose({ status: 'OVERDUE' })]) },
    });
    await renderScreen(<ViagemScreen />, fake.fetchFn);
    expect(await screen.findByRole('radio', { name: 'Dentro do Brasil' })).toBeChecked();
    expect(screen.queryByText('Febre amarela')).not.toBeOnTheScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver o roteiro' }));
    expect(await screen.findByRole('header', { name: 'Febre amarela' })).toBeOnTheScreen();
    expect(screen.getByText(/Vacinar até/)).toBeOnTheScreen();
    expect(screen.getByText(/1 dose atrasada/)).toBeOnTheScreen();
    expect(
      screen.getByText(/Fonte: Vacinação para os Viajantes, Ministério da Saúde/),
    ).toBeOnTheScreen();
    expect(screen.getByText(/não substitui o serviço de saúde/)).toBeOnTheScreen();
  });

  test('CT-APP-V02: o certificado internacional só aparece para viagem ao exterior', async () => {
    const fake = createFakeFetch({
      ...FAMILIA,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([]) },
    });
    await renderScreen(<ViagemScreen />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver o roteiro' }));
    expect(await screen.findByRole('header', { name: 'Febre amarela' })).toBeOnTheScreen();
    expect(
      screen.queryByRole('header', { name: /Certificado Internacional/ }),
    ).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: 'Para o exterior' }));
    // Trocar o destino esconde o roteiro até pedir de novo.
    expect(screen.queryByRole('header', { name: 'Febre amarela' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver o roteiro' }));
    expect(
      await screen.findByRole('header', { name: /Certificado Internacional/ }),
    ).toBeOnTheScreen();
  });

  test('CT-APP-V03: os links abrem as fontes oficiais', async () => {
    const abrir = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    const fake = createFakeFetch({
      ...FAMILIA,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([]) },
    });
    await renderScreen(<ViagemScreen />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver o roteiro' }));
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Febre amarela no Ministério da Saúde' }),
    );
    expect(abrir).toHaveBeenCalledWith(
      'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/f/febre-amarela',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir a fonte oficial' }));
    expect(abrir).toHaveBeenLastCalledWith('https://www.gov.br/saude/pt-br/vacinacao/viajantes');
  });

  test('CT-APP-V04: sem ninguém cadastrado, pede para escolher uma pessoa', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 200, body: { items: [] } } });
    await renderScreen(<ViagemScreen />, fake.fetchFn);
    expect(await screen.findByText('Escolha uma pessoa')).toBeOnTheScreen();
  });
});
