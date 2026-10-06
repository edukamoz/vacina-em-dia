/** Nome do cabeçalho que identifica a sessão de demonstração. */
export const DEMO_SESSION_HEADER = 'x-demo-session';

const DEMO_SESSION_PATTERN = /^[a-z0-9-]{16,64}$/;

/**
 * Descobre o dono dos dados a partir do cabeçalho da sessão de demonstração.
 *
 * **Provisório:** enquanto o login do Microsoft Entra External ID não entra (SCRUM-13), cada
 * navegador gera um identificador aleatório e o envia neste cabeçalho; assim, os dados de uma
 * pessoa não aparecem para outra. Isto **não é autenticação**: quem souber o identificador acessa
 * os dados. Quando o login entrar, só esta função muda (passa a ler o token); o resto da API já
 * trata o dono como um identificador opaco e confere a propriedade em todo acesso.
 *
 * @param headerValue - Valor do cabeçalho `x-demo-session`, se enviado.
 * @returns O identificador do dono ou `undefined` quando ausente ou fora do formato.
 */
export function resolveDemoOwner(headerValue: string | null | undefined): string | undefined {
  if (!headerValue) return undefined;
  return DEMO_SESSION_PATTERN.test(headerValue) ? headerValue : undefined;
}
