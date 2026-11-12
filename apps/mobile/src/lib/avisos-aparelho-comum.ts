import type { AvisoPlanejado } from './avisos';

/** Canal das notificações no Android (a pessoa pode ajustá-lo nas configurações do aparelho). */
export const CANAL_DE_AVISOS = 'lembretes-de-vacina';

/** Situação da permissão do sistema para mostrar notificações. */
export type PermissaoDeAvisos = 'concedida' | 'negada' | 'indefinida';

/**
 * Momento exato de um aviso, na hora local do aparelho.
 *
 * @param aviso - Aviso planejado (dia civil e hora cheia).
 */
export function quandoAgendar(aviso: Pick<AvisoPlanejado, 'data' | 'hora'>): Date {
  const [ano = 0, mes = 1, dia = 1] = aviso.data.split('-').map(Number);
  return new Date(ano, mes - 1, dia, aviso.hora, 0, 0, 0);
}
