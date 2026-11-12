// Variante da web: não há aviso agendado no navegador (o lembrete aparece na aba Doses e por
// e-mail). Existe para o pacote web não carregar `expo-notifications`; a versão do celular é
// `avisos-aparelho.ts`. Os dois precisam exportar o mesmo (conferido por `plataforma.test.ts`).
import { CANAL_DE_AVISOS, quandoAgendar, type PermissaoDeAvisos } from './avisos-aparelho-comum';

export { CANAL_DE_AVISOS, quandoAgendar, type PermissaoDeAvisos };

/** Na web nunca há aviso agendado. */
export function avisosSuportados(): boolean {
  return false;
}

/** Na web a permissão de aviso do aparelho não existe. */
export async function lerPermissaoDeAvisos(): Promise<PermissaoDeAvisos> {
  return 'negada';
}

/** Na web não há o que pedir. */
export async function pedirPermissaoDeAvisos(): Promise<PermissaoDeAvisos> {
  return 'negada';
}

/** Na web não há o que preparar. */
export async function prepararAvisos(): Promise<void> {}

/** Na web não há avisos agendados para cancelar. */
export async function cancelarAvisos(): Promise<void> {}

/** Na web os avisos não são agendados. */
export async function reagendarAvisos(): Promise<void> {}
