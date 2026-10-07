import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { AssistantResponse } from '@vacina/shared';
import { createFakeFetch, renderScreen } from '../../test-utils';
import { AssistantScreen } from './assistant-screen';
import { VoiceError } from './voice-types';

const mockRecorder = { start: jest.fn(), stop: jest.fn(), cancel: jest.fn() };
let mockSupported = true;
jest.mock('./voice-recorder', () => ({
  isVoiceSupported: () => mockSupported,
  useVoiceRecorder: () => mockRecorder,
}));

const REPLY: AssistantResponse['reply'] = {
  intent: 'vacina_para_que_serve',
  text: 'BCG: protege contra formas graves da tuberculose.',
  confidence: 0.91,
  source: {
    name: 'Calendário Nacional de Vacinação 2026, Ministério da Saúde (PNI)',
    version: '2026',
  },
  suggestions: ['Quando toma a vacina BCG?'],
  fallback: false,
  safety: false,
};
const RESPONSE: AssistantResponse = {
  transcript: null,
  reply: REPLY,
  results: [
    {
      vaccine: 'BCG',
      score: 0.8,
      diseases: 'tuberculose',
      indications: ['Criança: dose única, ao nascer'],
    },
  ],
  notice: 'O aplicativo não substitui a caderneta oficial.',
};
const WAV = new Uint8Array([82, 73, 70, 70]);

function api(overrides: Partial<AssistantResponse> = {}, status = 200, body?: unknown) {
  return createFakeFetch({
    'POST /assistant/message': { status, body: body ?? { ...RESPONSE, ...overrides } },
    'POST /assistant/voice': {
      status,
      body: body ?? { ...RESPONSE, transcript: 'para que serve a BCG', ...overrides },
    },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSupported = true;
  mockRecorder.start.mockResolvedValue(undefined);
  mockRecorder.stop.mockResolvedValue(WAV);
});

describe('assistente: chat por texto (RF07)', () => {
  test('CT-APP-I01: abre com a apresentação do assistente e perguntas sugeridas', async () => {
    await renderScreen(<AssistantScreen />, api().fetchFn);
    expect(screen.getByRole('header', { name: 'Assistente' })).toBeOnTheScreen();
    expect(screen.getByText(/Eu sou o assistente do Vacina em Dia/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Para que serve a BCG?' })).toBeOnTheScreen();
    expect(screen.getByText(/não dá orientação médica/)).toBeOnTheScreen();
    expect(screen.getByText(/192 \(SAMU\)/)).toBeOnTheScreen();
  });

  test('CT-APP-I02: envia o que foi digitado, mostra a resposta com a fonte e limpa o campo', async () => {
    const fake = api();
    await renderScreen(<AssistantScreen />, fake.fetchFn);
    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();

    await fireEvent.changeText(screen.getByLabelText('Sua pergunta'), '  para que serve a BCG ');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));

    expect(await screen.findByText(REPLY.text)).toBeOnTheScreen();
    expect(screen.getByText('para que serve a BCG')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Fonte: Calendário Nacional de Vacinação 2026, Ministério da Saúde (PNI), versão 2026',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Sua pergunta').props.value).toBe('');
    expect(fake.calls[0]).toMatchObject({
      key: 'POST /assistant/message',
      body: { text: 'para que serve a BCG' },
    });
    // Pergunta por texto não mostra a lista de vacinas da voz.
    expect(screen.queryByText('Vacinas encontradas no calendário')).not.toBeOnTheScreen();
  });

  test('CT-APP-I03: tocar numa pergunta sugerida a envia', async () => {
    const fake = api();
    await renderScreen(<AssistantScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'O que significa dose atrasada?' }));
    expect(await screen.findByText(REPLY.text)).toBeOnTheScreen();
    expect(fake.calls[0]?.body).toEqual({ text: 'O que significa dose atrasada?' });
    await fireEvent.press(screen.getByRole('button', { name: 'Quando toma a vacina BCG?' }));
    await waitFor(() => expect(fake.calls).toHaveLength(2));
  });

  test('CT-APP-I04: pergunta sobre saúde mostra o aviso para falar com um profissional', async () => {
    const fake = api({
      reply: {
        ...REPLY,
        intent: 'orientacao_medica',
        text: 'Essa é uma pergunta sobre saúde que eu não posso responder.',
        safety: true,
        suggestions: [],
      },
    });
    await renderScreen(<AssistantScreen />, fake.fetchFn);
    await fireEvent.changeText(screen.getByLabelText('Sua pergunta'), 'meu filho está com febre');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('⚠ Converse com um profissional de saúde')).toBeOnTheScreen();
  });

  test('CT-APP-I05: resposta de "não entendi" não cita fonte', async () => {
    const fake = api({
      reply: {
        ...REPLY,
        intent: 'nao_entendi',
        text: 'Não tenho certeza de que entendi.',
        fallback: true,
        suggestions: [],
      },
    });
    await renderScreen(<AssistantScreen />, fake.fetchFn);
    await fireEvent.changeText(screen.getByLabelText('Sua pergunta'), 'asdf');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Não tenho certeza de que entendi.')).toBeOnTheScreen();
    expect(screen.queryByText(/^Fonte:/)).not.toBeOnTheScreen();
  });

  test.each([
    [
      429,
      {
        code: 'RATE_LIMITED',
        message: 'Você fez muitas perguntas em pouco tempo. Tente de novo mais tarde.',
      },
    ],
    [
      503,
      {
        code: 'ASSISTANT_UNAVAILABLE',
        message: 'O assistente não está disponível agora. Tente de novo em instantes.',
      },
    ],
  ])('CT-APP-I06: erro %i do servidor aparece em linguagem simples', async (status, body) => {
    await renderScreen(<AssistantScreen />, api({}, status, body).fetchFn);
    await fireEvent.changeText(screen.getByLabelText('Sua pergunta'), 'oi');
    await fireEvent.press(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText(body.message)).toBeOnTheScreen();
  });
});

describe('assistente: pergunta por voz (RF06)', () => {
  test('CT-APP-V01: sem suporte a voz, avisa e mantém o campo de texto', async () => {
    mockSupported = false;
    await renderScreen(<AssistantScreen />, api().fetchFn);
    expect(screen.queryByRole('button', { name: 'Falar a pergunta' })).not.toBeOnTheScreen();
    expect(
      screen.getByText(/pergunta por voz não está disponível neste navegador/),
    ).toBeOnTheScreen();
    expect(screen.getByLabelText('Sua pergunta')).toBeOnTheScreen();
  });

  test('CT-APP-V02: grava, envia o áudio WAV e mostra o que foi entendido e as vacinas encontradas', async () => {
    const fake = api();
    await renderScreen(<AssistantScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Falar a pergunta' }));
    expect(await screen.findByText(/Gravando\.\.\. fale a sua pergunta/)).toBeOnTheScreen();
    expect(mockRecorder.start).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Parar e enviar' }));
    expect(await screen.findByText('🎤 para que serve a BCG')).toBeOnTheScreen();
    expect(await screen.findByText(REPLY.text)).toBeOnTheScreen();
    expect(screen.getByText('Vacinas encontradas no calendário')).toBeOnTheScreen();
    expect(screen.getByText('Criança: dose única, ao nascer')).toBeOnTheScreen();
    expect(fake.calls[0]?.key).toBe('POST /assistant/voice');
    expect(fake.calls[0]?.headers['Content-Type']).toBe('audio/wav');
    expect(fake.mock.mock.calls[0]?.[1]?.body).toBe(WAV);
    expect(screen.getByRole('button', { name: 'Falar a pergunta' })).toBeOnTheScreen();
  });

  test('CT-APP-V03: cancelar a gravação solta o microfone e não envia nada', async () => {
    const fake = api();
    await renderScreen(<AssistantScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Falar a pergunta' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Cancelar' }));
    expect(mockRecorder.cancel).toHaveBeenCalled();
    expect(fake.calls).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Falar a pergunta' })).toBeOnTheScreen();
  });

  test.each([
    ['PERMISSION_DENIED', /permita o uso do microfone/],
    ['NO_MICROPHONE', /Não encontramos um microfone/],
  ] as const)('CT-APP-V04: %s ao começar mostra a orientação', async (kind, mensagem) => {
    mockRecorder.start.mockRejectedValue(new VoiceError(kind));
    await renderScreen(<AssistantScreen />, api().fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Falar a pergunta' }));
    expect(await screen.findByText(mensagem)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Falar a pergunta' })).toBeOnTheScreen();
  });

  test('CT-APP-V05: erro inesperado ao gravar vira mensagem genérica em linguagem simples', async () => {
    mockRecorder.start.mockRejectedValue(new Error('detalhe técnico'));
    await renderScreen(<AssistantScreen />, api().fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Falar a pergunta' }));
    expect(await screen.findByText(/Não foi possível gravar o áudio/)).toBeOnTheScreen();
    expect(screen.queryByText(/detalhe técnico/)).not.toBeOnTheScreen();
  });

  test('CT-APP-V06: gravação vazia mostra a orientação e não envia', async () => {
    mockRecorder.stop.mockRejectedValue(new VoiceError('EMPTY_RECORDING'));
    const fake = api();
    await renderScreen(<AssistantScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Falar a pergunta' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Parar e enviar' }));
    expect(await screen.findByText(/Não ouvimos nada/)).toBeOnTheScreen();
    expect(fake.calls).toHaveLength(0);
  });

  test('CT-APP-V07: fala não entendida pelo servidor orienta a tentar de novo ou digitar', async () => {
    const fake = api({}, 422, {
      code: 'SPEECH_NOT_RECOGNIZED',
      message:
        'Não consegui entender o áudio. Fale mais perto do microfone ou digite a sua pergunta.',
    });
    await renderScreen(<AssistantScreen />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Falar a pergunta' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Parar e enviar' }));
    expect(await screen.findByText(/Não consegui entender o áudio/)).toBeOnTheScreen();
  });

  test('CT-APP-V08: a gravação para sozinha ao chegar em 30 segundos', async () => {
    jest.useFakeTimers();
    try {
      const fake = api();
      await renderScreen(<AssistantScreen />, fake.fetchFn);
      await fireEvent.press(screen.getByRole('button', { name: 'Falar a pergunta' }));
      await screen.findByText(/Gravando/);
      await act(async () => {
        jest.advanceTimersByTime(30_000);
      });
      expect(mockRecorder.stop).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
