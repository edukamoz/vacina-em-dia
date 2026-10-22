import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { AssistantResponse } from '@vacina/shared';
import {
  MEMBER,
  createFakeFetch,
  dose,
  memberDoses,
  renderScreen,
  type FakeRoutes,
} from '../../test-utils';
import { AssistantPanel } from './assistant-panel';

jest.mock('./voice-recorder', () => ({
  isVoiceSupported: () => false,
  useVoiceRecorder: () => ({ start: jest.fn(), stop: jest.fn(), cancel: jest.fn() }),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (rota: string) => mockPush(rota) } }));

const MARIA = { ...MEMBER, name: 'Maria', birthDate: '2026-02-10' };
const BCG = dose({
  id: 'd-bcg',
  memberId: 'm-1',
  vaccine: 'BCG',
  doseLabel: 'dose única',
  status: 'PENDING',
  dueDate: '2026-02-10',
});

function resposta(intent: string, entities: Record<string, unknown>): AssistantResponse {
  return {
    transcript: null,
    results: [],
    notice: 'Aviso.',
    reply: {
      intent,
      text: 'texto padrão do PLN',
      confidence: 0.8,
      source: { name: 'Ajuda do Vacina em Dia' },
      suggestions: [],
      fallback: false,
      safety: false,
      entities: {
        vaccines: [],
        names: [],
        dates: [],
        relativeDay: null,
        screen: null,
        ...entities,
      },
    },
  };
}

function abrir(assistente: AssistantResponse, extras: FakeRoutes = {}) {
  const fake = createFakeFetch({
    'POST /assistant/message': { status: 200, body: assistente },
    'GET /members': { status: 200, body: { items: [MARIA] } },
    'GET /members/m-1/doses': { status: 200, body: memberDoses([BCG], MARIA) },
    ...extras,
  });
  return { fake, pronto: renderScreen(<AssistantPanel aoFechar={jest.fn()} />, fake.fetchFn) };
}

async function perguntar(texto: string) {
  await fireEvent.changeText(await screen.findByLabelText('Sua pergunta'), texto);
  await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
}

beforeEach(() => jest.clearAllMocks());

describe('assistente com poder sobre a conta (B61)', () => {
  test('CT-APP-ACO01: pergunta sobre a conta é respondida com os dados da pessoa, citando a fonte', async () => {
    const { pronto } = abrir(resposta('conta_quem_na_familia', {}));
    await pronto;
    await perguntar('quem está na minha família');
    expect(await screen.findByText(/Você tem 1 pessoa cadastrada/)).toBeOnTheScreen();
    expect(screen.getByText(/• Maria, 8 meses/)).toBeOnTheScreen();
    expect(screen.getByText('Fonte: Seus dados no Vacina em Dia')).toBeOnTheScreen();
    expect(screen.queryByText('texto padrão do PLN')).not.toBeOnTheScreen();
  });

  test('CT-APP-ACO02: registrar dose pede confirmação e só grava ao tocar em Registrar', async () => {
    const { fake, pronto } = abrir(
      resposta('acao_registrar_dose', {
        vaccines: ['BCG'],
        names: ['Maria'],
        relativeDay: 'today',
      }),
      {
        'POST /doses/d-bcg/events': {
          status: 200,
          body: { ...BCG, status: 'APPLIED', appliedDate: '2026-10-21' },
        },
      },
    );
    await pronto;
    await perguntar('a Maria tomou a BCG hoje');
    expect(
      await screen.findByText(/Posso marcar BCG, dose única de Maria como aplicada em/),
    ).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key === 'POST /doses/d-bcg/events')).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Registrar' }));
    expect(
      await screen.findByText(/Feito: BCG, dose única de Maria está como aplicada/),
    ).toBeOnTheScreen();
    const envio = fake.calls.find((c) => c.key === 'POST /doses/d-bcg/events');
    expect(envio?.body).toMatchObject({ type: 'APPLY' });
    // Os botões somem depois de usados (a ação não se repete).
    expect(screen.queryByRole('button', { name: 'Registrar' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Cancelar' })).not.toBeOnTheScreen();
  });

  test('CT-APP-ACO03: cancelar não grava nada', async () => {
    const { fake, pronto } = abrir(
      resposta('acao_adicionar_pessoa', { names: ['Ana'], dates: ['2020-03-05'] }),
    );
    await pronto;
    await perguntar('adicionar Ana nascida em 05/03/2020');
    expect(
      await screen.findByText(/Posso adicionar Ana, com nascimento em 05\/03\/2020/),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByText('Tudo bem, não fiz nada.')).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key === 'POST /members')).toBe(false);
  });

  test('CT-APP-ACO04: confirmar a adição cria a pessoa pelo mesmo endpoint da tela', async () => {
    const { fake, pronto } = abrir(
      resposta('acao_adicionar_pessoa', { names: ['Ana'], dates: ['2020-03-05'] }),
      {
        'POST /members': {
          status: 201,
          body: { ...MARIA, id: 'm-9', name: 'Ana', birthDate: '2020-03-05' },
        },
      },
    );
    await pronto;
    await perguntar('adicionar Ana nascida em 05/03/2020');
    await fireEvent.press(await screen.findByRole('button', { name: 'Adicionar' }));
    expect(await screen.findByText(/Pronto: Ana foi adicionada/)).toBeOnTheScreen();
    expect(fake.calls.find((c) => c.key === 'POST /members')?.body).toEqual({
      name: 'Ana',
      birthDate: '2020-03-05',
      isPregnant: false,
      relationship: null,
    });
  });

  test('CT-APP-ACO05: abrir tela só acontece ao tocar no botão', async () => {
    const { pronto } = abrir(resposta('acao_abrir_tela', { screen: 'painel' }));
    await pronto;
    await perguntar('abrir o painel de gráficos');
    const botao = await screen.findByRole('button', { name: 'Abrir Painel de gráficos' });
    expect(mockPush).not.toHaveBeenCalled();
    await fireEvent.press(botao);
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/painel'));
  });

  test('CT-APP-ACO06: erro da API ao gravar vira mensagem simples e não repete a ação', async () => {
    const { pronto } = abrir(
      resposta('acao_registrar_dose', { vaccines: ['BCG'], names: ['Maria'] }),
      {
        'POST /doses/d-bcg/events': {
          status: 422,
          body: { code: 'INVALID_DOSE_DATE', message: 'Data inválida para esta dose.' },
        },
      },
    );
    await pronto;
    await perguntar('a Maria tomou a BCG');
    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar' }));
    expect(await screen.findByText('Data inválida para esta dose.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Registrar' })).not.toBeOnTheScreen();
  });

  test('CT-APP-ACO07: pergunta comum continua com a resposta do PLN (sem passar pela conta)', async () => {
    const { pronto } = abrir(resposta('como_adicionar_pessoa', {}));
    await pronto;
    await perguntar('como adiciono uma pessoa');
    expect(await screen.findByText('texto padrão do PLN')).toBeOnTheScreen();
    expect(screen.getByText('Fonte: Ajuda do Vacina em Dia')).toBeOnTheScreen();
  });
});
