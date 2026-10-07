import type { ReminderItem, ReminderListResponse } from '@vacina/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { AccountScreen } from '../account/account-screen';
import {
  ACCEPTED,
  STORED_SESSION,
  createFakeFetch,
  memorySessionStore,
  renderScreen,
} from '../../test-utils';
import { LembretesCard, descreverPrazo, LIMITE_LEMBRETES } from './lembretes-card';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
}));

const HOJE = '2026-10-06';

const item = (patch: Partial<ReminderItem>): ReminderItem => ({
  doseId: 'd1',
  memberId: 'm1',
  memberName: 'Ana',
  vaccine: 'Febre tifoide',
  doseLabel: '1ª dose',
  date: HOJE,
  kind: 'TODAY',
  ...patch,
});

const lista = (items: ReminderItem[], emailEnabled = true): ReminderListResponse => ({
  leadDays: 7,
  emailEnabled,
  items,
});

beforeEach(() => mockPush.mockClear());

describe('prazo do lembrete', () => {
  test.each([
    ['CT-APP-LEM01', item({ kind: 'TODAY' }), 'hoje'],
    ['CT-APP-LEM02', item({ kind: 'UPCOMING', date: '2026-10-07' }), 'amanhã'],
    ['CT-APP-LEM03', item({ kind: 'UPCOMING', date: '2026-10-09' }), 'em 3 dias'],
    [
      'CT-APP-LEM04',
      item({ kind: 'OVERDUE', date: '2026-09-02' }),
      'atrasada desde 2 de setembro de 2026',
    ],
  ])('%s: descreve o prazo', (_id, lembrete, esperado) => {
    expect(descreverPrazo(lembrete, HOJE)).toBe(esperado);
  });
});

describe('cartão de lembretes (RF05)', () => {
  test('CT-APP-LEM10: mostra os lembretes e abre a dose ao tocar', async () => {
    const fake = createFakeFetch({
      'GET /reminders': {
        status: 200,
        body: lista([
          item({ kind: 'OVERDUE', date: '2026-09-20', doseId: 'd9' }),
          item({ doseId: 'd2', vaccine: 'Gripe' }),
        ]),
      },
    });
    await renderScreen(<LembretesCard hoje={HOJE} />, fake.fetchFn);
    expect(await screen.findByText('2 lembretes')).toBeOnTheScreen();
    expect(screen.getByText('Ana: Gripe, 1ª dose')).toBeOnTheScreen();
    expect(screen.getByText('atrasada desde 20 de setembro de 2026')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('link', { name: /Ana: Gripe, 1ª dose, hoje/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/dose/[id]', params: { id: 'd2' } });
  });

  test('CT-APP-LEM11: sem lembretes, o cartão não aparece', async () => {
    const fake = createFakeFetch({ 'GET /reminders': { status: 200, body: lista([]) } });
    await renderScreen(<LembretesCard hoje={HOJE} />, fake.fetchFn);
    await waitFor(() => expect(fake.calls.some((c) => c.key === 'GET /reminders')).toBe(true));
    expect(screen.queryByText(/lembrete/)).not.toBeOnTheScreen();
  });

  test('CT-APP-LEM12: com muitos lembretes, mostra os primeiros e conta o resto', async () => {
    const muitos = Array.from({ length: LIMITE_LEMBRETES + 2 }, (_, i) =>
      item({ doseId: `d${i}`, vaccine: `Vacina ${i}` }),
    );
    const fake = createFakeFetch({ 'GET /reminders': { status: 200, body: lista(muitos) } });
    await renderScreen(<LembretesCard hoje={HOJE} />, fake.fetchFn);
    expect(await screen.findByText('7 lembretes')).toBeOnTheScreen();
    expect(screen.getAllByRole('link')).toHaveLength(LIMITE_LEMBRETES);
    expect(screen.getByText('e mais 2')).toBeOnTheScreen();
  });

  test('CT-APP-LEM13: se a busca falha, a tela segue sem o cartão', async () => {
    const fake = createFakeFetch({
      'GET /reminders': { status: 500, body: { code: 'INTERNAL', message: 'Erro.' } },
    });
    await renderScreen(<LembretesCard hoje={HOJE} />, fake.fetchFn);
    await waitFor(() => expect(fake.calls.some((c) => c.key === 'GET /reminders')).toBe(true));
    expect(screen.queryByText(/lembrete/)).not.toBeOnTheScreen();
  });
});

describe('lembretes por e-mail na aba Conta', () => {
  const logged = { ...STORED_SESSION, expiresAt: Date.now() + 3_600_000 };

  test('CT-APP-LEM20: mostra a opção ligada e desliga ao tocar', async () => {
    const { store } = memorySessionStore(logged);
    const fake = createFakeFetch({
      'GET /consent': { status: 200, body: ACCEPTED },
      'GET /reminders': { status: 200, body: lista([], true) },
      'PUT /reminders/preferences': { status: 200, body: { emailEnabled: false } },
    });
    await renderScreen(<AccountScreen />, fake.fetchFn, { store });
    const caixa = await screen.findByRole('checkbox', { name: 'Receber lembretes por e-mail' });
    expect(caixa).toBeChecked();
    await fireEvent.press(caixa);
    await waitFor(() =>
      expect(fake.calls.find((c) => c.key === 'PUT /reminders/preferences')?.body).toEqual({
        emailEnabled: false,
      }),
    );
  });
});
