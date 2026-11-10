import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type * as Dates from '../../lib/dates';
import {
  avisosSuportados,
  cancelarAvisos,
  lerPermissaoDeAvisos,
  pedirPermissaoDeAvisos,
  quandoAgendar,
  reagendarAvisos,
} from '../../lib/avisos-aparelho';
import { MEMBER, createFakeFetch, dose, memberDoses, renderScreen } from '../../test-utils';
import { AgendadorDeAvisos } from './agendador-de-avisos';
import { ControlesDeAvisos } from './controles-de-avisos';
import {
  carregarPreferenciaDeAvisos,
  definirPreferenciaDeAvisos,
  reiniciarPreferenciaDeAvisos,
} from './preferencia';

jest.mock('../../lib/dates', () => ({
  ...jest.requireActual<typeof Dates>('../../lib/dates'),
  todayCivil: () => '2026-10-06',
  minutosDoDia: () => 7 * 60,
}));

const notificacoes = jest.mocked(Notifications);
const concedida = { status: 'granted', granted: true, canAskAgain: true } as never;
const negada = { status: 'denied', granted: false, canAskAgain: false } as never;
const indefinida = { status: 'undetermined', granted: false, canAskAgain: true } as never;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  reiniciarPreferenciaDeAvisos();
  notificacoes.getPermissionsAsync.mockResolvedValue(indefinida);
  notificacoes.requestPermissionsAsync.mockResolvedValue(concedida);
});

describe('preferência dos avisos neste aparelho (B70)', () => {
  test('CT-AVISO-20: começa desligada, às 8h', async () => {
    expect(await carregarPreferenciaDeAvisos()).toEqual({ ligado: false, hora: 8 });
  });

  test('CT-AVISO-21: o que a pessoa escolhe fica guardado e volta na próxima abertura', async () => {
    await definirPreferenciaDeAvisos({ ligado: true, hora: 18 });
    reiniciarPreferenciaDeAvisos();
    expect(await carregarPreferenciaDeAvisos()).toEqual({ ligado: true, hora: 18 });
  });

  test.each([
    ['CT-AVISO-22', 'isto não é JSON'],
    ['CT-AVISO-23', JSON.stringify({ ligado: 'sim', hora: 3 })],
    ['CT-AVISO-24', JSON.stringify(null)],
    ['CT-AVISO-25', JSON.stringify(42)],
  ])('%s: valor guardado inválido volta ao padrão', async (_id, texto) => {
    await AsyncStorage.setItem('avisos-no-aparelho:v1', texto);
    expect(await carregarPreferenciaDeAvisos()).toEqual({ ligado: false, hora: 8 });
  });
});

describe('avisos no aparelho: conversa com o sistema (B70)', () => {
  test('CT-AVISO-26: o aviso é agendado na hora local, no dia e na hora cheia escolhidos', () => {
    const quando = quandoAgendar({ data: '2026-10-13', hora: 18 });
    expect([quando.getFullYear(), quando.getMonth(), quando.getDate(), quando.getHours()]).toEqual([
      2026, 9, 13, 18,
    ]);
    expect([quando.getMinutes(), quando.getSeconds()]).toEqual([0, 0]);
  });

  test('CT-AVISO-27: reagendar cancela os antigos e agenda cada aviso com gatilho de data', async () => {
    await reagendarAvisos([
      { data: '2026-10-13', hora: 8, titulo: 'Vacina em Dia', corpo: 'um' },
      { data: '2026-10-20', hora: 8, titulo: 'Vacina em Dia', corpo: 'dois' },
    ]);
    expect(notificacoes.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
    expect(notificacoes.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(notificacoes.scheduleNotificationAsync.mock.calls[0]?.[0]).toMatchObject({
      content: { title: 'Vacina em Dia', body: 'um' },
      trigger: { type: 'date' },
    });
  });

  test('CT-AVISO-28: no Android o aviso usa o canal do aplicativo', async () => {
    const espiao = jest.replaceProperty(Platform, 'OS', 'android');
    await reagendarAvisos([{ data: '2026-10-13', hora: 8, titulo: 't', corpo: 'c' }]);
    expect(notificacoes.scheduleNotificationAsync.mock.calls[0]?.[0]).toMatchObject({
      trigger: { channelId: 'lembretes-de-vacina' },
    });
    espiao.restore();
  });

  test('CT-AVISO-29: na web nada é agendado, cancelado nem pedido', async () => {
    const espiao = jest.replaceProperty(Platform, 'OS', 'web');
    expect(avisosSuportados()).toBe(false);
    await reagendarAvisos([{ data: '2026-10-13', hora: 8, titulo: 't', corpo: 'c' }]);
    await cancelarAvisos();
    expect(await pedirPermissaoDeAvisos()).toBe('negada');
    expect(await lerPermissaoDeAvisos()).toBe('negada');
    expect(notificacoes.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(notificacoes.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
    expect(notificacoes.requestPermissionsAsync).not.toHaveBeenCalled();
    espiao.restore();
  });

  test('CT-AVISO-30: a permissão do sistema vira concedida, negada ou indefinida', async () => {
    notificacoes.getPermissionsAsync.mockResolvedValueOnce(concedida);
    expect(await lerPermissaoDeAvisos()).toBe('concedida');
    notificacoes.getPermissionsAsync.mockResolvedValueOnce(negada);
    expect(await lerPermissaoDeAvisos()).toBe('negada');
    notificacoes.getPermissionsAsync.mockResolvedValueOnce(indefinida);
    expect(await lerPermissaoDeAvisos()).toBe('indefinida');
  });
});

const FAMILIA = {
  'GET /members': { status: 200, body: { items: [MEMBER] } },
  'GET /members/m-1/doses': {
    status: 200,
    body: memberDoses([
      dose({ id: 'd-1', dueDate: '2026-10-20' }),
      dose({ id: 'd-2', dueDate: '2026-10-20', status: 'APPLIED', appliedDate: '2026-10-01' }),
    ]),
  },
};

describe('agendador de avisos (B70)', () => {
  test('CT-AVISO-40: com os avisos ligados e a permissão dada, agenda os avisos das doses', async () => {
    await definirPreferenciaDeAvisos({ ligado: true, hora: 12 });
    notificacoes.getPermissionsAsync.mockResolvedValue(concedida);
    await renderScreen(<AgendadorDeAvisos />, createFakeFetch(FAMILIA).fetchFn);
    await waitFor(() => expect(notificacoes.scheduleNotificationAsync).toHaveBeenCalledTimes(2));
    const corpos = notificacoes.scheduleNotificationAsync.mock.calls.map(
      ([pedido]) => pedido.content.body,
    );
    expect(corpos[0]).toContain('1 vacina chega nos próximos dias');
    expect(corpos[1]).toContain('1 vacina é para hoje');
    const gatilho = notificacoes.scheduleNotificationAsync.mock.calls[1]?.[0].trigger as {
      date: Date;
    };
    expect([gatilho.date.getDate(), gatilho.date.getHours()]).toEqual([20, 12]);
  });

  test('CT-AVISO-41: com os avisos desligados, cancela e não agenda nada', async () => {
    notificacoes.getPermissionsAsync.mockResolvedValue(concedida);
    await renderScreen(<AgendadorDeAvisos />, createFakeFetch(FAMILIA).fetchFn);
    await waitFor(() =>
      expect(notificacoes.cancelAllScheduledNotificationsAsync).toHaveBeenCalled(),
    );
    expect(notificacoes.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('CT-AVISO-42: sem a permissão do sistema, não agenda', async () => {
    await definirPreferenciaDeAvisos({ ligado: true });
    notificacoes.getPermissionsAsync.mockResolvedValue(negada);
    await renderScreen(<AgendadorDeAvisos />, createFakeFetch(FAMILIA).fetchFn);
    await waitFor(() =>
      expect(notificacoes.cancelAllScheduledNotificationsAsync).toHaveBeenCalled(),
    );
    expect(notificacoes.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  test('CT-AVISO-43: ao sair da conta (a tela some), cancela tudo o que estava agendado', async () => {
    await definirPreferenciaDeAvisos({ ligado: true });
    notificacoes.getPermissionsAsync.mockResolvedValue(concedida);
    const tela = await renderScreen(<AgendadorDeAvisos />, createFakeFetch(FAMILIA).fetchFn);
    await waitFor(() => expect(notificacoes.scheduleNotificationAsync).toHaveBeenCalled());
    notificacoes.cancelAllScheduledNotificationsAsync.mockClear();
    await act(async () => tela.unmount());
    expect(notificacoes.cancelAllScheduledNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  test('CT-AVISO-44: prepara o sistema para mostrar os avisos', async () => {
    await renderScreen(<AgendadorDeAvisos />, createFakeFetch(FAMILIA).fetchFn);
    await waitFor(() => expect(notificacoes.setNotificationHandler).toHaveBeenCalled());
  });
});

describe('controles dos avisos na aba Conta (B70)', () => {
  test('CT-AVISO-50: ligar pede a permissão, liga e mostra o horário', async () => {
    await renderScreen(<ControlesDeAvisos />, createFakeFetch({}).fetchFn);
    const chave = await screen.findByRole('switch', { name: 'Receber avisos neste aparelho' });
    expect(screen.queryByLabelText('Horário do aviso')).not.toBeOnTheScreen();
    await fireEvent.press(chave);
    expect(notificacoes.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText('Horário do aviso')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('radio', { name: '18h, no fim da tarde' }));
    expect((await carregarPreferenciaDeAvisos()).hora).toBe(18);
  });

  test('CT-AVISO-51: se o aparelho nega, explica como ativar e deixa desligado', async () => {
    notificacoes.requestPermissionsAsync.mockResolvedValue(negada);
    await renderScreen(<ControlesDeAvisos />, createFakeFetch({}).fetchFn);
    await fireEvent.press(
      await screen.findByRole('switch', { name: 'Receber avisos neste aparelho' }),
    );
    expect(await screen.findByText(/Ative as notificações do Vacina em Dia/)).toBeOnTheScreen();
    expect(screen.queryByLabelText('Horário do aviso')).not.toBeOnTheScreen();
    expect((await carregarPreferenciaDeAvisos()).ligado).toBe(false);
  });

  test('CT-AVISO-52: desligar não pede permissão e guarda a escolha', async () => {
    await definirPreferenciaDeAvisos({ ligado: true });
    notificacoes.getPermissionsAsync.mockResolvedValue(concedida);
    await renderScreen(<ControlesDeAvisos />, createFakeFetch({}).fetchFn);
    await waitFor(() =>
      expect(screen.getByRole('switch', { name: 'Receber avisos neste aparelho' })).toBeChecked(),
    );
    await fireEvent.press(screen.getByRole('switch', { name: 'Receber avisos neste aparelho' }));
    await waitFor(() =>
      expect(
        screen.getByRole('switch', { name: 'Receber avisos neste aparelho' }),
      ).not.toBeChecked(),
    );
    expect(notificacoes.requestPermissionsAsync).not.toHaveBeenCalled();
    expect((await carregarPreferenciaDeAvisos()).ligado).toBe(false);
  });

  test('CT-AVISO-53: na web, explica que o recurso é do aplicativo e não mostra o interruptor', async () => {
    const espiao = jest.replaceProperty(Platform, 'OS', 'web');
    await renderScreen(<ControlesDeAvisos />, createFakeFetch({}).fetchFn);
    expect(
      await screen.findByText(/funcionam no aplicativo de Android e de iOS/),
    ).toBeOnTheScreen();
    expect(screen.queryByRole('switch')).not.toBeOnTheScreen();
    espiao.restore();
  });

  test('CT-AVISO-54: o texto avisa que o aviso traz só a quantidade, sem nomes', async () => {
    await renderScreen(<ControlesDeAvisos />, createFakeFetch({}).fetchFn);
    expect(await screen.findByText(/só a quantidade de vacinas, sem nomes/)).toBeOnTheScreen();
  });
});

// Evita o aviso de "act" quando um teste termina com o estado externo ainda mudando.
afterEach(async () => {
  await act(async () => undefined);
});
