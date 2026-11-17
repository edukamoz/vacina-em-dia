/** Maior tamanho guardado do endereço (o limitador só o usa como chave). */
const MAX_IP_LENGTH = 64;

/** Quantos servidores de confiança podem estar na frente da API (limite de sanidade da configuração). */
const MAX_HOPS = 5;

/** Tira a porta de `1.2.3.4:5678` e `[::1]:5678`. */
function withoutPort(value: string): string {
  return value.replace(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/, '$1').replace(/^\[(.+)\]:\d+$/, '$1');
}

/**
 * Descobre o IP de quem chamou a partir de `X-Forwarded-For`.
 *
 * O cliente controla o começo da lista: quem manda `X-Forwarded-For: 1.1.1.1` faz a plataforma
 * **acrescentar** o IP real depois. Por isso o primeiro item é forjável e não serve para limitar
 * abusos; vale o item que o servidor de confiança acrescentou, contado **do fim** da lista.
 *
 * @param header - Valor do cabeçalho `X-Forwarded-For`, se houver.
 * @param hops - Quantos servidores de confiança acrescentam o IP (1 = só a plataforma, 2 = a
 *   plataforma e um proxy próprio). Valor inválido vale 1.
 * @returns O IP sem porta, ou `desconhecido` quando o cabeçalho falta. Com menos itens que `hops`
 *   (chamada direta, sem o proxy), usa o primeiro.
 */
export function clientIpFrom(header: string | null | undefined, hops = 1): string {
  const items = (header ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const trusted = Number.isInteger(hops) && hops >= 1 && hops <= MAX_HOPS ? hops : 1;
  const chosen = items[Math.max(0, items.length - trusted)] ?? '';
  return withoutPort(chosen).slice(0, MAX_IP_LENGTH) || 'desconhecido';
}
