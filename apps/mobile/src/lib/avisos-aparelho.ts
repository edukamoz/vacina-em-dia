// Variante do celular (Android e iOS). A web usa `avisos-aparelho.web.ts`, sem `expo-notifications`.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { AvisoPlanejado } from './avisos';
import { CANAL_DE_AVISOS, quandoAgendar, type PermissaoDeAvisos } from './avisos-aparelho-comum';

export { CANAL_DE_AVISOS, quandoAgendar, type PermissaoDeAvisos };

/**
 * Diz se este aparelho agenda avisos: só o aplicativo de Android e de iOS. Na web não há aviso
 * agendado; lá o lembrete aparece na aba Doses e por e-mail.
 */
export function avisosSuportados(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function traduzir(resposta: { granted: boolean; status: string }): PermissaoDeAvisos {
  if (resposta.granted) return 'concedida';
  return resposta.status === 'denied' ? 'negada' : 'indefinida';
}

/** Lê a permissão atual, sem perguntar nada à pessoa. */
export async function lerPermissaoDeAvisos(): Promise<PermissaoDeAvisos> {
  if (!avisosSuportados()) return 'negada';
  return traduzir(await Notifications.getPermissionsAsync());
}

/**
 * Pede a permissão ao sistema. Deve ser chamada só depois de um toque da pessoa (por exemplo, ao
 * ligar o interruptor), nunca ao abrir o aplicativo.
 */
export async function pedirPermissaoDeAvisos(): Promise<PermissaoDeAvisos> {
  if (!avisosSuportados()) return 'negada';
  return traduzir(await Notifications.requestPermissionsAsync());
}

/** Prepara o sistema para mostrar os avisos (como aparecem e, no Android, o canal). */
export async function prepararAvisos(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CANAL_DE_AVISOS, {
      name: 'Lembretes de vacina',
      description: 'Avisos de vacinas próximas, de hoje e atrasadas, só com a quantidade.',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Cancela todos os avisos agendados por este aplicativo. */
export async function cancelarAvisos(): Promise<void> {
  if (!avisosSuportados()) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Troca os avisos agendados pelos novos: cancela os antigos e agenda cada um no seu dia e hora. O
 * sistema guarda os avisos agendados mesmo com o aplicativo fechado.
 *
 * @param avisos - Avisos planejados por `planejarAvisos`.
 */
export async function reagendarAvisos(avisos: readonly AvisoPlanejado[]): Promise<void> {
  if (!avisosSuportados()) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const aviso of avisos) {
    await Notifications.scheduleNotificationAsync({
      content: { title: aviso.titulo, body: aviso.corpo },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: quandoAgendar(aviso),
        ...(Platform.OS === 'android' ? { channelId: CANAL_DE_AVISOS } : {}),
      },
    });
  }
}
