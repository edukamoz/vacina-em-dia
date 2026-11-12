import type * as Dates from '../lib/dates';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { DoseResponse } from '@vacina/shared';
import { DoseDetailScreen } from './doses/dose-detail-screen';
import { NewDoseScreen } from './doses/new-dose-screen';
import { MEMBER, createFakeFetch, dose, memberDoses, renderScreen } from '../test-utils';

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

const FAMILY = { 'GET /members': { status: 200, body: { items: [MEMBER] } } };

const GRIPE = (over: Partial<DoseResponse> = {}): DoseResponse =>
  dose({
    id: 'd-1',
    origin: 'CUSTOM',
    ruleId: null,
    vaccine: 'Gripe',
    doseLabel: 'Anual',
    diseases: '',
    timingKind: 'CUSTOM',
    timingLabel: 'Data escolhida por você',
    dueDate: '2026-11-04',
    recurrence: { unit: 'YEAR', every: 1, anchor: 'APPLICATION', endDate: null, maxDoses: null },
    occurrence: 2,
    remindDaysBefore: 14,
    ...over,
  });

async function preencherBasico() {
  await fireEvent.changeText(await screen.findByLabelText('Nome da vacina'), 'Gripe');
  await fireEvent.changeText(screen.getByLabelText('Qual dose'), 'Anual');
}

describe('formulário da dose: repetir a vacina (B69)', () => {
  test('CT-APP-REP40: os campos de repetição só aparecem quando a vacina se repete', async () => {
    const fake = createFakeFetch({ ...FAMILY });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    const caixa = await screen.findByRole('checkbox', { name: 'Esta vacina se repete' });
    expect(screen.queryByLabelText('A cada quanto tempo')).not.toBeOnTheScreen();
    // O aviso antecipado vale para qualquer dose, repetida ou não.
    expect(screen.getByRole('checkbox', { name: '7 dias antes' })).toBeOnTheScreen();
    expect(screen.getByText(/Sem marcar nada, avisamos 7 dias antes/)).toBeOnTheScreen();
    await fireEvent.press(caixa);
    expect(screen.getByLabelText('A cada quanto tempo')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Anos' })).toBeOnTheScreen();
    expect(
      screen.getByRole('radio', { name: 'A partir da data em que eu tomar' }),
    ).toBeOnTheScreen();
    await fireEvent.press(caixa);
    expect(screen.queryByLabelText('A cada quanto tempo')).not.toBeOnTheScreen();
  });

  test('CT-APP-REP41: envia a repetição em datas fixas e o aviso de 14 dias', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'POST /members/m-1/doses': { status: 201, body: GRIPE({ id: 'd-novo' }) },
    });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await preencherBasico();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Esta vacina se repete' }));
    await fireEvent.press(
      screen.getByRole('radio', { name: 'Em datas fixas (por exemplo, todo ano em março)' }),
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: '14 dias antes' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar dose' }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/dose/[id]',
        params: { id: 'd-novo' },
      }),
    );
    expect(fake.calls.find((c) => c.key === 'POST /members/m-1/doses')?.body).toEqual({
      vaccine: 'Gripe',
      doseLabel: 'Anual',
      dueDate: '2026-10-06',
      recurrence: { unit: 'YEAR', every: 1, anchor: 'SCHEDULE' },
      remindDaysBefore: 14,
    });
  });

  test('CT-APP-REP41b: vários avisos marcados vão como lista, do maior para o menor', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'POST /members/m-1/doses': { status: 201, body: GRIPE({ id: 'd-novo' }) },
    });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await preencherBasico();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'No próprio dia' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: '3 dias antes' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: '7 dias antes' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar dose' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(fake.calls.find((c) => c.key === 'POST /members/m-1/doses')?.body).toMatchObject({
      remindDays: [7, 3, 0],
    });
  });

  test('CT-APP-REP42: "a cada" vazio mostra o erro e não envia', async () => {
    const fake = createFakeFetch({ ...FAMILY });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await preencherBasico();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Esta vacina se repete' }));
    await fireEvent.changeText(screen.getByLabelText('A cada quanto tempo'), '');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar dose' }));
    expect(await screen.findByText('Informe um número de 1 a 50.')).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key.startsWith('POST'))).toBe(false);
  });

  test('CT-APP-REP43: o limite de "a cada" muda com a unidade', async () => {
    const fake = createFakeFetch({ ...FAMILY });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await preencherBasico();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Esta vacina se repete' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Dias' }));
    await fireEvent.changeText(screen.getByLabelText('A cada quanto tempo'), '366');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar dose' }));
    expect(await screen.findByText('Informe um número de 1 a 365.')).toBeOnTheScreen();
  });

  test('CT-APP-REP44: terminar depois de N doses confere o total', async () => {
    const fake = createFakeFetch({ ...FAMILY });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await preencherBasico();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Esta vacina se repete' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Depois de um número de doses' }));
    await fireEvent.changeText(screen.getByLabelText('Total de doses, contando a primeira'), '1');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar dose' }));
    expect(await screen.findByText('Informe de 2 a 120 doses.')).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key.startsWith('POST'))).toBe(false);
  });

  test('CT-APP-REP45: terminar em uma data mostra o seletor com uma data sugerida', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'POST /members/m-1/doses': { status: 201, body: GRIPE({ id: 'd-novo' }) },
    });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await preencherBasico();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Esta vacina se repete' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Em uma data' }));
    expect(screen.getByText('Última data possível: 06/10/2027')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar dose' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    expect(fake.calls.find((c) => c.key === 'POST /members/m-1/doses')?.body).toMatchObject({
      recurrence: { unit: 'YEAR', every: 1, anchor: 'APPLICATION', endDate: '2027-10-06' },
    });
  });
});

function detalhe(atual: DoseResponse, lista: DoseResponse[] = [atual]) {
  return createFakeFetch({
    'GET /doses/d-1': () => ({ status: 200, body: atual }),
    'POST /doses/d-1/events': { status: 200, body: { ...atual, status: 'CANCELLED' } },
    'GET /members/m-1/doses': { status: 200, body: memberDoses(lista) },
    'GET /members': { status: 200, body: { items: [MEMBER] } },
  });
}

describe('detalhe da dose que se repete (B69)', () => {
  test('CT-APP-REP50: mostra como se repete, o número da dose e o aviso', async () => {
    await renderScreen(<DoseDetailScreen id="d-1" />, detalhe(GRIPE()).fetchFn);
    expect(await screen.findByText('Todo ano, contando da data da aplicação')).toBeOnTheScreen();
    expect(screen.getByText('2ª dose da série')).toBeOnTheScreen();
    expect(screen.getByText('14 dias antes')).toBeOnTheScreen();
  });

  test('CT-APP-REP51: dose que não se repete não mostra a seção de repetição', async () => {
    const fake = detalhe(GRIPE({ recurrence: null, occurrence: null, remindDaysBefore: null }));
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    expect(await screen.findByText('Adicionada por você')).toBeOnTheScreen();
    expect(screen.queryByText('Se repete')).not.toBeOnTheScreen();
    expect(screen.queryByText('Aviso')).not.toBeOnTheScreen();
  });

  test('CT-APP-REP52: cancelar pergunta o alcance e "só esta" envia o escopo THIS', async () => {
    const fake = detalhe(GRIPE());
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar dose' }));
    expect(
      screen.getByText(/Esta vacina se repete\. Você pode pular só esta dose/),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sim, cancelar a dose' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar só esta dose' }));
    await waitFor(() =>
      expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
        type: 'CANCEL',
        confirmed: true,
        scope: 'THIS',
      }),
    );
  });

  test('CT-APP-REP53: "parar de repetir" envia o escopo SERIES', async () => {
    const fake = detalhe(GRIPE());
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar dose' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar e parar de repetir' }));
    await waitFor(() =>
      expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
        type: 'CANCEL',
        confirmed: true,
        scope: 'SERIES',
      }),
    );
  });

  test('CT-APP-REP54: dose aplicada mostra a data da próxima dose da série', async () => {
    const aplicada = GRIPE({ status: 'APPLIED', appliedDate: '2026-10-06', occurrence: 1 });
    const proxima = GRIPE({ id: 'd-2', occurrence: 2, dueDate: '2027-10-06' });
    await renderScreen(
      <DoseDetailScreen id="d-1" />,
      detalhe(aplicada, [aplicada, proxima]).fetchFn,
    );
    expect(await screen.findByText('Prevista para 06/10/2027')).toBeOnTheScreen();
    expect(screen.getByText('Próxima dose da série')).toBeOnTheScreen();
  });

  test('CT-APP-REP55: se não há próxima dose, diz que foi a última da série', async () => {
    const aplicada = GRIPE({ status: 'APPLIED', appliedDate: '2026-10-06', occurrence: 3 });
    await renderScreen(<DoseDetailScreen id="d-1" />, detalhe(aplicada).fetchFn);
    expect(await screen.findByText('Esta foi a última dose da série.')).toBeOnTheScreen();
  });

  test('CT-APP-REP56: dose avulsa sem repetição aplicada não fala de série', async () => {
    const aplicada = GRIPE({
      status: 'APPLIED',
      appliedDate: '2026-10-06',
      recurrence: null,
      occurrence: null,
    });
    await renderScreen(<DoseDetailScreen id="d-1" />, detalhe(aplicada).fetchFn);
    expect(await screen.findByText(/Esta dose já foi aplicada/)).toBeOnTheScreen();
    expect(screen.queryByText('Próxima dose da série')).not.toBeOnTheScreen();
  });
});

describe('detalhe de uma dose oficial que se repete (B69)', () => {
  const FLU = (over: Partial<DoseResponse> = {}): DoseResponse =>
    dose({
      id: 'd-1',
      origin: 'OFFICIAL',
      ruleId: 'idoso-influenza',
      vaccine: 'influenza trivalente',
      doseLabel: '1 dose anual a cada temporada',
      dueDate: '2026-10-06',
      recurrence: { unit: 'YEAR', every: 1, anchor: 'APPLICATION', endDate: null, maxDoses: null },
      ...over,
    });

  test('CT-OFIC-50: mostra que a dose se repete a cada ano, contando da aplicação', async () => {
    await renderScreen(<DoseDetailScreen id="d-1" />, detalhe(FLU()).fetchFn);
    expect(await screen.findByText('Todo ano, contando da data da aplicação')).toBeOnTheScreen();
    // Dose oficial não mostra "Aviso" nem número da dose antes de a série começar.
    expect(screen.queryByText('Aviso')).not.toBeOnTheScreen();
  });

  test('CT-OFIC-51: cancelar uma dose oficial que se repete também pergunta o alcance', async () => {
    const fake = detalhe(FLU());
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar dose' }));
    expect(screen.getByRole('button', { name: 'Cancelar só esta dose' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar e parar de repetir' }));
    await waitFor(() =>
      expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
        type: 'CANCEL',
        confirmed: true,
        scope: 'SERIES',
      }),
    );
  });

  test('CT-OFIC-52: dose oficial aplicada mostra a próxima da mesma linha do calendário', async () => {
    const aplicada = FLU({ status: 'APPLIED', appliedDate: '2026-10-06', occurrence: 1 });
    const proxima = FLU({ id: 'd-2', occurrence: 2, dueDate: '2027-10-06' });
    const outraLinha = FLU({
      id: 'd-3',
      ruleId: 'idoso-covid',
      occurrence: 2,
      dueDate: '2027-04-06',
    });
    await renderScreen(
      <DoseDetailScreen id="d-1" />,
      detalhe(aplicada, [aplicada, outraLinha, proxima]).fetchFn,
    );
    expect(await screen.findByText('Prevista para 06/10/2027')).toBeOnTheScreen();
  });

  test('CT-OFIC-53: dose oficial sem repetição não fala de série', async () => {
    const dt = FLU({ ruleId: 'idoso-dt', recurrence: null });
    await renderScreen(<DoseDetailScreen id="d-1" />, detalhe(dt).fetchFn);
    expect(await screen.findByText('Oficial')).toBeOnTheScreen();
    expect(screen.queryByText('Se repete')).not.toBeOnTheScreen();
  });
});
