/**
 * Distância em linguagem simples: "a 450 m" ou "a 1,2 km".
 *
 * @param meters - Distância em metros.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `a ${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `a ${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

/**
 * Tira acentos e maiúsculas, para a busca por nome ou rua não depender de como a pessoa digita.
 *
 * @param text - Texto qualquer.
 */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Endereço para ligar: só os dígitos e o `+`, no formato `tel:`.
 *
 * @param phone - Telefone como veio do cadastro.
 */
export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/**
 * Link do aplicativo de mapas do aparelho com a rota até a unidade (sem chave de API).
 *
 * @param latitude - Latitude da unidade.
 * @param longitude - Longitude da unidade.
 */
export function routeUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
