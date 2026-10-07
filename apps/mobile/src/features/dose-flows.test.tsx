import type * as Dates from '../lib/dates';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { DoseResponse } from '@vacina/shared';
import { DoseDetailScreen } from './doses/dose-detail-screen';
import { DosesScreen, LIMITE_APLICADAS, agruparDoses } from './doses/doses-screen';
import { HistoryScreen, historyOf } from './history/history-screen';
import {
  MEMBER,
  OTHER_MEMBER,
  createFakeFetch,
  dose,
  memberDoses,
  renderScreen,
} from '../test-utils';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
}));
jest.mock('../lib/dates', () => ({
  ...jest.requireActual<typeof Dates>('../lib/dates'),
  todayCivil: () => '2026-10-06',
}));

beforeEach(() => jest.clearAllMocks());

const OVERDUE = dose({
  id: 'd-over',
  vaccine: 'hepatite B',
  doseLabel: '1 dose',
  status: 'OVERDUE',
});
const SCHEDULED = dose({
  id: 'd-sched',
  vaccine: 'penta (DTP+Hib+HB)',
  status: 'SCHEDULED',
  scheduledDate: '2026-11-04',
});
const PENDING = dose({ id: 'd-pend', vaccine: 'tríplice viral SCR', doseLabel: '1ª dose' });
const APPLIED = dose({
  id: 'd-app',
  vaccine: 'BCG',
  doseLabel: 'dose única',
  status: 'APPLIED',
  appliedDate: '2026-08-01',
});
const APPLIED_OLD = dose({
  id: 'd-app2',
  vaccine: 'rotavírus humano',
  status: 'APPLIED',
  appliedDate: '2026-05-01',
});
const CANCELLED = dose({ id: 'd-can', vaccine: 'covid-19', status: 'CANCELLED' });

const FAMILY = { 'GET /members': { status: 200, body: { items: [MEMBER, OTHER_MEMBER] } } };

describe('doses (RF03 e RF04)', () => {
  test('CT-APP-K01: separa atenção, próximas e aplicadas, esconde as canceladas e cita a fonte', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': {
        status: 200,
        body: memberDoses([OVERDUE, SCHEDULED, PENDING, APPLIED, CANCELLED]),
      },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByRole('header', { name: 'Doses de Maria' })).toBeOnTheScreen();
    for (const titulo of ['Precisam de atenção', 'Próximas', 'Aplicadas']) {
      expect(screen.getByRole('header', { name: titulo })).toBeOnTheScreen();
    }
    expect(screen.getByText('hepatite B, 1 dose')).toBeOnTheScreen();
    expect(screen.getByText('BCG, dose única')).toBeOnTheScreen();
    expect(screen.queryByText('covid-19, 2ª dose')).not.toBeOnTheScreen();
    expect(screen.getByText(/Calendário Nacional de Vacinação 2026/)).toBeOnTheScreen();
    expect(screen.getByText(/não substitui a caderneta oficial/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /hepatite B, 1 dose/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/dose/[id]', params: { id: 'd-over' } });
  });

  test('CT-APP-K02: "Trocar pessoa" leva à aba Família', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([PENDING]) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByText('tríplice viral SCR, 1ª dose')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('link', { name: 'Trocar pessoa' }));
    expect(mockPush).toHaveBeenCalledWith('/familia');
  });

  test('CT-APP-K03: quando não há dose aberta, diz que está tudo em dia e mostra as aplicadas', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'GET /members/m-1/doses': { status: 200, body: memberDoses([APPLIED]) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByText('Tudo em dia por aqui')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Doses de Maria' })).toBeOnTheScreen();
    expect(screen.getByText('BCG, dose única')).toBeOnTheScreen();
  });

  test('CT-APP-K04: sem ninguém cadastrado, leva a adicionar uma pessoa', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 200, body: { items: [] } } });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByText('Nenhuma pessoa cadastrada')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar pessoa' }));
    expect(mockPush).toHaveBeenCalledWith('/membro/novo');
  });

  test('CT-APP-K05: falha ao carregar a família permite tentar de novo', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 503, body: undefined } });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  test('CT-APP-K05b: falha ao carregar as doses permite tentar de novo', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'GET /members/m-1/doses': { status: 500, body: undefined },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  test('CT-APP-K06: agruparDoses ordena por data, põe as agendadas antes das pendentes e as aplicadas da mais recente', () => {
    const cedo = dose({ id: 'a', status: 'SCHEDULED', scheduledDate: '2026-10-20' });
    const tarde = dose({ id: 'b', status: 'SCHEDULED', scheduledDate: '2026-12-01' });
    const pendente = dose({ id: 'c', dueDate: '2026-10-10' });
    const semData = dose({ id: 'd', dueDate: undefined });
    const antiga = dose({ id: 'e', status: 'APPLIED', appliedDate: '2026-01-01' });
    const recente = dose({ id: 'f', status: 'APPLIED', appliedDate: '2026-06-01' });
    const grupos = agruparDoses([tarde, semData, pendente, cedo, antiga, recente, CANCELLED]);
    expect(grupos.proximas.map((d) => d.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(grupos.aplicadas.map((d) => d.id)).toEqual(['f', 'e']);
    expect(grupos.atencao).toEqual([]);
  });

  test('CT-APP-K07: com muitas aplicadas, mostra só as mais recentes e leva ao Histórico', async () => {
    const muitas = Array.from({ length: LIMITE_APLICADAS + 2 }, (_, i) =>
      dose({
        id: `ap-${i}`,
        vaccine: `vacina ${i}`,
        status: 'APPLIED',
        appliedDate: `2026-0${i + 1}-01`,
      }),
    );
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'GET /members/m-1/doses': { status: 200, body: memberDoses(muitas) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByText('vacina 6, 1ª dose')).toBeOnTheScreen();
    expect(screen.queryByText('vacina 0, 1ª dose')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('link', { name: 'Ver todas no Histórico' }));
    expect(mockPush).toHaveBeenCalledWith('/historico');
  });
});

describe('histórico (RF08)', () => {
  test('CT-APP-H01: ordena as aplicadas da mais recente para a mais antiga e põe as canceladas no fim', () => {
    const ordem = historyOf([APPLIED_OLD, CANCELLED, PENDING, APPLIED]).map((d) => d.id);
    expect(ordem).toEqual(['d-app', 'd-app2', 'd-can']);
  });

  test('CT-APP-H02: mostra só o que foi aplicado ou cancelado, com a fonte', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': {
        status: 200,
        body: memberDoses([PENDING, APPLIED, APPLIED_OLD, CANCELLED]),
      },
    });
    await renderScreen(<HistoryScreen />, fake.fetchFn);
    expect(await screen.findByText('BCG, dose única')).toBeOnTheScreen();
    expect(screen.getByText('Aplicada em 01/08/2026')).toBeOnTheScreen();
    expect(screen.getByText('rotavírus humano, 1ª dose')).toBeOnTheScreen();
    expect(screen.getByText('covid-19, 1ª dose')).toBeOnTheScreen();
    expect(screen.queryByText('tríplice viral SCR, 1ª dose')).not.toBeOnTheScreen();
    expect(screen.getByText(/Fonte: Calendário Nacional/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /BCG, dose única/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/dose/[id]', params: { id: 'd-app' } });
  });

  test('CT-APP-H03: sem registros, explica como o histórico se preenche', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'GET /members/m-1/doses': { status: 200, body: memberDoses([PENDING]) },
    });
    await renderScreen(<HistoryScreen />, fake.fetchFn);
    expect(await screen.findByText('Nenhuma dose registrada ainda')).toBeOnTheScreen();
  });

  test('CT-APP-H04: sem ninguém cadastrado, leva a adicionar uma pessoa', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 200, body: { items: [] } } });
    await renderScreen(<HistoryScreen />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Adicionar pessoa' }));
    expect(mockPush).toHaveBeenCalledWith('/membro/novo');
  });

  test('CT-APP-H05: falha ao carregar a família permite tentar de novo', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 503, body: undefined } });
    await renderScreen(<HistoryScreen />, fake.fetchFn);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  test('CT-APP-H06: falha ao carregar as doses mantém o seletor e permite tentar de novo', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER, OTHER_MEMBER] } },
      'GET /members/m-1/doses': { status: 500, body: undefined },
    });
    await renderScreen(<HistoryScreen />, fake.fetchFn);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'João' })).toBeOnTheScreen();
  });
});

function detailRoutes(initial: DoseResponse, onEvent?: (body: unknown) => DoseResponse) {
  let current = initial;
  return createFakeFetch({
    'GET /doses/d-1': () => ({ status: 200, body: current }),
    'POST /doses/d-1/events': (body) => {
      if (onEvent) current = onEvent(body);
      return { status: 200, body: current };
    },
    'GET /members/m-1/doses': { status: 200, body: memberDoses([current]) },
  });
}

describe('detalhe da dose (RF04)', () => {
  test('CT-APP-D01: mostra para que serve, quando, as notas oficiais e o aviso', async () => {
    const fake = detailRoutes(
      dose({ conditional: true, notes: ['Somente para povos indígenas.'], timingLabel: '5 anos' }),
    );
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    expect(await screen.findByText('difteria, tétano, coqueluche')).toBeOnTheScreen();
    expect(screen.getByText('5 anos')).toBeOnTheScreen();
    expect(screen.getByText(/só é indicada em algumas situações/)).toBeOnTheScreen();
    expect(screen.getByText('Somente para povos indígenas.')).toBeOnTheScreen();
    expect(screen.getByText(/não substitui a caderneta oficial/)).toBeOnTheScreen();
  });

  test('CT-T03 no app: registra a aplicação com a data de hoje e passa a mostrar como aplicada', async () => {
    const fake = detailRoutes(dose(), (body) =>
      dose({ status: 'APPLIED', appliedDate: (body as { date: string }).date }),
    );
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Registrar que foi aplicada' }),
    );
    expect(await screen.findByText(/Esta dose já foi aplicada/)).toBeOnTheScreen();
    expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
      type: 'APPLY',
      date: '2026-10-06',
    });
    expect(
      screen.queryByRole('button', { name: 'Registrar que foi aplicada' }),
    ).not.toBeOnTheScreen();
  });

  test('CT-T02 no app: agenda para a data digitada', async () => {
    const fake = detailRoutes(dose(), () =>
      dose({ status: 'SCHEDULED', scheduledDate: '2026-10-20' }),
    );
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    const campo = await screen.findByLabelText('Data');
    expect(campo.props.value).toBe('06/10/2026');
    await fireEvent.changeText(campo, '20102026');
    await fireEvent.press(screen.getByRole('button', { name: 'Agendar' }));
    expect(
      await screen.findByRole('button', { name: 'Desmarcar o agendamento' }),
    ).toBeOnTheScreen();
    expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
      type: 'SCHEDULE',
      date: '2026-10-20',
    });
  });

  test('CT-T10 no app: dose atrasada oferece reagendar', async () => {
    const fake = detailRoutes(dose({ status: 'OVERDUE' }), () =>
      dose({ status: 'SCHEDULED', scheduledDate: '2026-10-06' }),
    );
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Reagendar' }));
    await waitFor(() =>
      expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
        type: 'RESCHEDULE',
        date: '2026-10-06',
      }),
    );
  });

  test('CT-T08 no app: dose agendada pode ser desmarcada e não oferece "Agendar"', async () => {
    const fake = detailRoutes(dose({ status: 'SCHEDULED', scheduledDate: '2026-11-04' }), () =>
      dose(),
    );
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    expect(await screen.findByText('Marcada para 04/11/2026')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Agendar' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Desmarcar o agendamento' }));
    expect(await screen.findByRole('button', { name: 'Agendar' })).toBeOnTheScreen();
    expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
      type: 'UNSCHEDULE',
    });
  });

  test('CT-T05 no app: cancelar pede confirmação e só envia depois dela', async () => {
    const fake = detailRoutes(dose(), () => dose({ status: 'CANCELLED' }));
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar esta dose' }));
    expect(fake.calls.some((c) => c.key.startsWith('POST'))).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Não, voltar' }));
    expect(screen.queryByText('Cancelar esta dose?')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar esta dose' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, cancelar a dose' }));
    expect(await screen.findByText(/foi cancelada e não precisa mais/)).toBeOnTheScreen();
    expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
      type: 'CANCEL',
      confirmed: true,
    });
  });

  test('CT-APP-D02: data incompleta não é enviada e mostra o erro', async () => {
    const fake = detailRoutes(dose());
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.changeText(await screen.findByLabelText('Data'), '0610');
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar que foi aplicada' }));
    expect(screen.getByText(/Digite a data completa/)).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key.startsWith('POST'))).toBe(false);
  });

  test('CT-APP-D03: regra violada no servidor aparece em linguagem simples', async () => {
    const fake = createFakeFetch({
      'GET /doses/d-1': { status: 200, body: dose() },
      'POST /doses/d-1/events': {
        status: 422,
        body: { code: 'GUARD_VIOLATION', message: 'A data da aplicação não pode ser no futuro.' },
      },
    });
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'Registrar que foi aplicada' }),
    );
    expect(
      await screen.findByText('A data da aplicação não pode ser no futuro.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Registrar que foi aplicada' })).toBeOnTheScreen();
  });

  test('CT-APP-D04: dose inexistente ou falha de rede mostram erro com nova tentativa', async () => {
    const fake = createFakeFetch({
      'GET /doses/d-1': {
        status: 404,
        body: { code: 'NOT_FOUND', message: 'Não encontramos o que você procura.' },
      },
    });
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    expect(await screen.findByText('Não encontramos o que você procura.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });
});
