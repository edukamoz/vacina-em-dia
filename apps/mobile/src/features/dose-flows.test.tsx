import type * as Dates from '../lib/dates';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import type { DoseResponse } from '@vacina/shared';
import { DoseDetailScreen } from './doses/dose-detail-screen';
import { DosesScreen, LIMITE_APLICADAS, agruparDoses } from './doses/doses-screen';
import { NewDoseScreen } from './doses/new-dose-screen';
import { HistoryScreen, agruparHistorico } from './history/history-screen';
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
    // O título aparece com a família; os grupos só depois de as doses carregarem.
    for (const titulo of ['Precisam de atenção', 'Próximas']) {
      expect(await screen.findByRole('header', { name: titulo })).toBeOnTheScreen();
    }
    // As aplicadas ficam recolhidas atrás de um botão enquanto há o que resolver (ADR-036).
    const aplicadas = await screen.findByRole('button', { name: 'Aplicadas, 1' });
    expect(aplicadas).toBeOnTheScreen();
    expect(screen.queryByText('BCG, dose única')).not.toBeOnTheScreen();
    await fireEvent.press(aplicadas);
    expect(screen.getByText('hepatite B, 1 dose')).toBeOnTheScreen();
    expect(screen.getByText('BCG, dose única')).toBeOnTheScreen();
    expect(screen.queryByText('covid-19, 2ª dose')).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Aplicadas, 1' })).toBeExpanded();
    expect(screen.getByText(/Calendário Nacional de Vacinação 2026/)).toBeOnTheScreen();
    expect(screen.getByText(/não substitui a caderneta oficial/)).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole('button', { name: 'hepatite B, 1 dose. Abrir detalhes' }),
    );
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/dose/[id]', params: { id: 'd-over' } });
  });

  test('CT-APP-K12: animal sem vacinas: explica que não há calendário oficial e esconde o que é só de gente', async () => {
    const REX = {
      ...MEMBER,
      id: 'm-pet',
      name: 'Rex',
      birthDate: '2022-03-10',
      kind: 'PET' as const,
      species: 'DOG' as const,
      relationship: null,
      ageGroup: null,
    };
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [REX] } },
      'GET /members/m-pet/doses': { status: 200, body: memberDoses([], REX) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByRole('header', { name: 'Doses de Rex' })).toBeOnTheScreen();
    expect(await screen.findByText('Nenhuma vacina de Rex cadastrada')).toBeOnTheScreen();
    expect(
      screen.getByText(/Não existe calendário nacional de vacinação para animais/),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(/quem define o que o seu animal precisa é o veterinário/),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/Calendário Nacional de Vacinação 2026/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/Postos de saúde perto de você/)).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ler caderneta por foto' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Adicionar dose' })).toBeOnTheScreen();
  });

  test('CT-APP-K02: o carrossel mostra a família e trocar de pessoa carrega as doses dela', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([PENDING]) },
      'GET /members/m-2/doses': { status: 200, body: memberDoses([OVERDUE]) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByText('tríplice viral SCR, 1ª dose')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Maria' })).toBeSelected();
    await fireEvent.press(screen.getByRole('radio', { name: 'João' }));
    expect(await screen.findByText('hepatite B, 1 dose')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Doses de João' })).toBeOnTheScreen();
  });

  test('CT-APP-K05: o resumo mostra o anel e os contadores de atrasadas e de até 7 dias', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'GET /members/m-1/doses': {
        status: 200,
        body: memberDoses([
          OVERDUE,
          dose({ id: 'd-soon', status: 'SCHEDULED', scheduledDate: '2026-10-10' }),
          dose({ id: 'd-far', status: 'SCHEDULED', scheduledDate: '2026-12-10' }),
          APPLIED,
          CANCELLED,
        ]),
      },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByLabelText('1 de 4 doses aplicadas')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 atrasada')).toBeOnTheScreen();
    expect(screen.getByLabelText('1 em até 7 dias')).toBeOnTheScreen();
  });

  test('CT-APP-K03: quando não há dose aberta, diz que está tudo em dia e mostra as aplicadas', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'GET /members/m-1/doses': { status: 200, body: memberDoses([APPLIED]) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByText('Tudo em dia por aqui')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Doses de Maria' })).toBeOnTheScreen();
    // Sem nada a resolver, as aplicadas já aparecem abertas.
    expect(screen.getByText('BCG, dose única')).toBeOnTheScreen();
  });

  test('CT-APP-K13: o resumo diz o que resolver agora e mantém a contagem em texto', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([OVERDUE, APPLIED]) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByText('1 dose para resolver')).toBeOnTheScreen();
    expect(screen.getByText('Calendário de Maria')).toBeOnTheScreen();
    expect(screen.getByText('1 de 2 doses de Maria já foram aplicadas.')).toBeOnTheScreen();
  });

  test('CT-APP-K14: "Aplicar" na dose atrasada confirma a data de hoje e só então registra', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([OVERDUE]) },
      'POST /doses/d-over/events': { status: 200, body: { ...OVERDUE, status: 'APPLIED' } },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'Registrar aplicação de hepatite B, 1 dose',
      }),
    );
    // Antes de gravar, o app mostra a data que será registrada.
    expect(screen.getByText('Registrar a aplicação de hepatite B, 1 dose?')).toBeOnTheScreen();
    expect(screen.getByText('A data registrada será hoje, 06/10/2026.')).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key === 'POST /doses/d-over/events')).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, registrar hoje' }));
    await waitFor(() =>
      expect(fake.calls.find((c) => c.key === 'POST /doses/d-over/events')?.body).toEqual({
        type: 'APPLY',
        date: '2026-10-06',
      }),
    );
  });

  test('CT-APP-K15: na confirmação, "Trocar a data" abre o detalhe e "Voltar" não registra nada', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([OVERDUE]) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    const aplicar = () =>
      screen.findByRole('button', { name: 'Registrar aplicação de hepatite B, 1 dose' });
    await fireEvent.press(await aplicar());
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.queryByText(/A data registrada será hoje/)).not.toBeOnTheScreen();
    await fireEvent.press(await aplicar());
    await fireEvent.press(screen.getByRole('button', { name: 'Trocar a data' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/dose/[id]', params: { id: 'd-over' } });
    expect(fake.calls.some((c) => c.key === 'POST /doses/d-over/events')).toBe(false);
  });

  test('CT-APP-K16: só a dose atrasada tem a ação rápida; próximas e aplicadas não', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([SCHEDULED, PENDING]) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    await screen.findByText('tríplice viral SCR, 1ª dose');
    expect(screen.queryByRole('button', { name: /^Registrar aplicação de/ })).not.toBeOnTheScreen();
  });

  test('CT-APP-K17: o nome da vacina no cartão quebra de linha, sem reticências', async () => {
    // Fonte do aparelho normal: com a ampliação do mock (200%) qualquer truncamento ficaria desligado.
    Dimensions.set({ window: { ...Dimensions.get('window'), fontScale: 1 } });
    const longa = dose({
      id: 'd-longa',
      vaccine: 'pneumocócica 23-valente (indicada a idosos e pessoas com condições especiais)',
      doseLabel: 'dose única',
      status: 'PENDING',
    });
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([longa]) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    const titulo = await screen.findByText(/pneumocócica 23-valente \(indicada a idosos/);
    expect(titulo.props.numberOfLines).toBeUndefined();
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

  test('CT-APP-K22: um grupo com muitas doses mostra 6, conta o total e deixa pedir mais ou menos', async () => {
    const muitas = Array.from({ length: 8 }, (_, i) =>
      dose({ id: `d-p${i}`, vaccine: `vacina ${i + 1}`, doseLabel: 'dose única' }),
    );
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': { status: 200, body: memberDoses(muitas) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByRole('header', { name: 'Próximas' })).toBeOnTheScreen();
    expect(screen.getByText('8 doses')).toBeOnTheScreen();
    expect(screen.getByText('vacina 6, dose única')).toBeOnTheScreen();
    expect(screen.queryByText('vacina 7, dose única')).not.toBeOnTheScreen();
    expect(screen.getByText(/Mostrando 6 de 8 doses/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar mais doses em Próximas' }));
    expect(screen.getByText('vacina 8, dose única')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar menos doses em Próximas' }));
    expect(screen.queryByText('vacina 7, dose única')).not.toBeOnTheScreen();
  });
});

describe('histórico (RF08)', () => {
  test('CT-APP-H01: agrupa por ano, do mais recente, ordena por data e traz canceladas pelo dia previsto', () => {
    const velha = dose({ id: 'v', status: 'APPLIED', appliedDate: '2025-11-10' });
    const nova = dose({ id: 'n', status: 'APPLIED', appliedDate: '2026-05-18' });
    const meio = dose({ id: 'm', status: 'APPLIED', appliedDate: '2026-02-03' });
    const cancelada = dose({ id: 'c', status: 'CANCELLED', dueDate: '2025-08-22' });
    const anos = agruparHistorico(
      [{ name: 'Maria' }, { name: 'João' }],
      [
        [velha, meio, PENDING],
        [nova, cancelada],
      ],
    );
    expect(anos.map((a) => a.ano)).toEqual(['2026', '2025']);
    expect(anos[0]?.linhas.map((l) => [l.dose.id, l.pessoa])).toEqual([
      ['n', 'João'],
      ['m', 'Maria'],
    ]);
    expect(anos[1]?.linhas.map((l) => l.dose.id)).toEqual(['v', 'c']);
  });

  test('CT-APP-H02: mostra a família inteira por ano, com "Pessoa, data", só aplicadas e canceladas, e a fonte', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER, OTHER_MEMBER] } },
      'GET /members/m-1/doses': {
        status: 200,
        body: memberDoses([PENDING, APPLIED, APPLIED_OLD, CANCELLED]),
      },
      'GET /members/m-2/doses': {
        status: 200,
        body: memberDoses(
          [
            dose({
              id: 'd-j',
              vaccine: 'dT',
              doseLabel: 'reforço',
              status: 'APPLIED',
              appliedDate: '2025-03-04',
            }),
          ],
          OTHER_MEMBER,
        ),
      },
    });
    await renderScreen(<HistoryScreen />, fake.fetchFn);
    expect(await screen.findByText('BCG, dose única')).toBeOnTheScreen();
    expect(screen.getByText('Maria, 01/08/2026')).toBeOnTheScreen();
    expect(screen.getByText('João, 04/03/2025')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '2026' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: '2025' })).toBeOnTheScreen();
    expect(screen.getByText('rotavírus humano, 1ª dose')).toBeOnTheScreen();
    expect(screen.getByText('covid-19, 1ª dose')).toBeOnTheScreen();
    expect(screen.getByText('Maria, prevista para 01/12/2026')).toBeOnTheScreen();
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

  test('CT-APP-H06: falha ao carregar as doses de alguém mostra o erro e permite tentar de novo', async () => {
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER, OTHER_MEMBER] } },
      'GET /members/m-1/doses': { status: 500, body: undefined },
      'GET /members/m-2/doses': { status: 200, body: memberDoses([APPLIED], OTHER_MEMBER) },
    });
    await renderScreen(<HistoryScreen />, fake.fetchFn);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  test('CT-APP-H07: no computador o histórico vira tabela com Vacina, Pessoa, Data e Estado', async () => {
    const original = Dimensions.get('window');
    jest.spyOn(Dimensions, 'get').mockReturnValue({ ...original, width: 1440 });
    const fake = createFakeFetch({
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'GET /members/m-1/doses': { status: 200, body: memberDoses([APPLIED]) },
    });
    await renderScreen(<HistoryScreen />, fake.fetchFn);
    expect(await screen.findByText('BCG, dose única')).toBeOnTheScreen();
    for (const coluna of ['Vacina', 'Pessoa', 'Data', 'Estado']) {
      expect(screen.getByText(coluna)).toBeOnTheScreen();
    }
    expect(screen.getByText('01/08/2026')).toBeOnTheScreen();
    jest.restoreAllMocks();
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
    'GET /members': { status: 200, body: { items: [MEMBER] } },
  });
}

describe('detalhe da dose (RF04)', () => {
  test('CT-APP-D01: mostra para quem, a data, o que evita, as notas oficiais e o aviso', async () => {
    const fake = detailRoutes(
      dose({
        conditional: true,
        notes: ['Somente para povos indígenas.'],
        timingLabel: '5 anos',
        dueDate: '2026-09-20',
      }),
    );
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    expect(await screen.findByText('difteria, tétano, coqueluche')).toBeOnTheScreen();
    expect(screen.getByText('Para quem')).toBeOnTheScreen();
    expect(screen.getByText('Maria')).toBeOnTheScreen();
    expect(screen.getByText('Prevista para')).toBeOnTheScreen();
    expect(screen.getByText('20/09/2026')).toBeOnTheScreen();
    expect(screen.getByText('5 anos')).toBeOnTheScreen();
    expect(screen.getByText(/só é indicada em algumas situações/)).toBeOnTheScreen();
    expect(screen.getByText('Somente para povos indígenas.')).toBeOnTheScreen();
    expect(screen.getByText(/não substitui a caderneta oficial/)).toBeOnTheScreen();
  });

  test('CT-APP-D05: o detalhe abre como janela e o botão "Fechar" volta à tela anterior', async () => {
    const fake = detailRoutes(dose());
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    expect(await screen.findByLabelText(/penta/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    expect(mockBack).toHaveBeenCalled();
  });

  test('CT-T03 no app: registra a aplicação no calendário e passa a mostrar como aplicada', async () => {
    const fake = detailRoutes(dose(), (body) =>
      dose({ status: 'APPLIED', appliedDate: (body as { date: string }).date }),
    );
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar aplicação' }));
    expect(screen.getAllByText('Em que dia foi aplicada?').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: '7 de outubro de 2026' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: '1 de outubro de 2026' }));
    expect(screen.getByText('Data escolhida: 01/10/2026')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar aplicação' }));
    expect(await screen.findByText(/Esta dose já foi aplicada/)).toBeOnTheScreen();
    expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
      type: 'APPLY',
      date: '2026-10-01',
    });
  });

  test('CT-T02 no app: agenda para o dia escolhido no calendário', async () => {
    const fake = detailRoutes(dose(), () =>
      dose({ status: 'SCHEDULED', scheduledDate: '2026-10-20' }),
    );
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Agendar' }));
    expect(screen.getByRole('button', { name: '5 de outubro de 2026' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: '20 de outubro de 2026' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar agendamento' }));
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
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar agendamento' }));
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
    expect(await screen.findByText('04/11/2026')).toBeOnTheScreen();
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
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar dose' }));
    expect(fake.calls.some((c) => c.key.startsWith('POST'))).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Não, voltar' }));
    expect(screen.queryByText('Cancelar esta dose?')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar dose' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Sim, cancelar a dose' }));
    expect(await screen.findByText(/foi cancelada e não precisa mais/)).toBeOnTheScreen();
    expect(fake.calls.find((c) => c.key === 'POST /doses/d-1/events')?.body).toEqual({
      type: 'CANCEL',
      confirmed: true,
    });
  });

  test('CT-APP-D02: "Voltar" do painel de data fecha o calendário sem enviar nada', async () => {
    const fake = detailRoutes(dose());
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar aplicação' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Voltar' }));
    expect(screen.getByRole('button', { name: 'Registrar aplicação' })).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key.startsWith('POST'))).toBe(false);
  });

  test('CT-APP-D03: regra violada no servidor aparece em linguagem simples', async () => {
    const fake = createFakeFetch({
      'GET /doses/d-1': { status: 200, body: dose() },
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'POST /doses/d-1/events': {
        status: 422,
        body: { code: 'GUARD_VIOLATION', message: 'A data da aplicação não pode ser no futuro.' },
      },
    });
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar aplicação' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar aplicação' }));
    expect(
      await screen.findByText('A data da aplicação não pode ser no futuro.'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Confirmar aplicação' })).toBeOnTheScreen();
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

const AVULSA = dose({
  id: 'd-av',
  origin: 'CUSTOM',
  ruleId: null,
  vaccine: 'Febre tifoide',
  doseLabel: '1ª dose',
  diseases: '',
  timingKind: 'CUSTOM',
  timingLabel: 'Data escolhida por você',
  dueDate: '2026-11-04',
});

describe('dose avulsa (RF04)', () => {
  test('CT-AV-A01: a tela Doses tem o botão "Adicionar dose" e marca a origem de cada cartão', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'GET /members/m-1/doses': { status: 200, body: memberDoses([PENDING, AVULSA]) },
    });
    await renderScreen(<DosesScreen />, fake.fetchFn);
    expect(await screen.findByText('Febre tifoide, 1ª dose')).toBeOnTheScreen();
    expect(screen.getByText('Adicionada por você')).toBeOnTheScreen();
    expect(screen.getByText('Oficial')).toBeOnTheScreen();
    expect(screen.getByText('Prevista para 04/11/2026')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar dose' }));
    expect(mockPush).toHaveBeenCalledWith('/dose/nova');
  });

  test('CT-AV-A02: cadastra com nome, dose e data do calendário e abre o detalhe', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'POST /members/m-1/doses': { status: 201, body: AVULSA },
    });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await fireEvent.changeText(await screen.findByLabelText('Nome da vacina'), ' Febre tifoide ');
    await fireEvent.changeText(screen.getByLabelText('Qual dose'), '1ª dose');
    expect(screen.getByRole('button', { name: '5 de outubro de 2026' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Próximo mês' }));
    await fireEvent.press(screen.getByRole('button', { name: '4 de novembro de 2026' }));
    expect(screen.getByText('Data escolhida: 04/11/2026')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar dose' }));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({ pathname: '/dose/[id]', params: { id: 'd-av' } }),
    );
    expect(fake.calls.find((c) => c.key === 'POST /members/m-1/doses')?.body).toEqual({
      vaccine: 'Febre tifoide',
      doseLabel: '1ª dose',
      dueDate: '2026-11-04',
    });
  });

  test('CT-AV-A03: confere nome e dose antes de enviar', async () => {
    const fake = createFakeFetch({ ...FAMILY });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Adicionar dose' }));
    expect(screen.getByText('Informe o nome da vacina.')).toBeOnTheScreen();
    expect(screen.getByText(/Informe qual é a dose/)).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key.startsWith('POST'))).toBe(false);
  });

  test('CT-AV-A04: mostra a mensagem do servidor, por exemplo o limite de doses', async () => {
    const fake = createFakeFetch({
      ...FAMILY,
      'POST /members/m-1/doses': {
        status: 422,
        body: {
          code: 'LIMIT_REACHED',
          message: 'Você chegou ao limite de doses cadastradas à mão para esta pessoa.',
        },
      },
    });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await fireEvent.changeText(await screen.findByLabelText('Nome da vacina'), 'Raiva');
    await fireEvent.changeText(screen.getByLabelText('Qual dose'), 'Reforço');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar dose' }));
    expect(await screen.findByText(/limite de doses cadastradas à mão/)).toBeOnTheScreen();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('CT-AV-A05: sem ninguém cadastrado, leva a adicionar uma pessoa', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 200, body: { items: [] } } });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    await fireEvent.press(await screen.findByRole('button', { name: 'Adicionar pessoa' }));
    expect(mockPush).toHaveBeenCalledWith('/membro/novo');
  });

  test('CT-AV-A06: erro ao carregar a família permite tentar de novo', async () => {
    const fake = createFakeFetch({ 'GET /members': { status: 503, body: undefined } });
    await renderScreen(<NewDoseScreen />, fake.fetchFn);
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeOnTheScreen();
  });

  test('CT-AV-A07: o detalhe da dose avulsa mostra a origem e não inventa "Protege contra"', async () => {
    const fake = detailRoutes(AVULSA);
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    expect(await screen.findByText('Adicionada por você')).toBeOnTheScreen();
    expect(screen.getByText(/Ela não faz parte do calendário oficial/)).toBeOnTheScreen();
    expect(screen.getByText('04/11/2026')).toBeOnTheScreen();
    expect(screen.queryByText('Protege contra')).not.toBeOnTheScreen();
    expect(screen.queryByText('Quando é indicada')).not.toBeOnTheScreen();
    expect(screen.queryByText('Confira na sua caderneta')).not.toBeOnTheScreen();
  });

  test('CT-AV-A08: dose avulsa agendada e aplicada usa as mesmas ações das oficiais', async () => {
    const fake = detailRoutes(AVULSA);
    await renderScreen(<DoseDetailScreen id="d-1" />, fake.fetchFn);
    expect(await screen.findByRole('button', { name: 'Agendar' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Registrar aplicação' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Cancelar dose' })).toBeOnTheScreen();
  });
});
