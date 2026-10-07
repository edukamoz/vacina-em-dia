/**
 * Lê o token de redefinição de senha do fragmento do endereço (`#token=...`). O token vai no
 * fragmento porque o navegador não o envia ao servidor nem no cabeçalho `Referer`. Só existe na
 * web: o link do e-mail abre no navegador.
 *
 * @param hash - Fragmento do endereço (por padrão, o da página atual).
 * @returns O token, ou `null` se o endereço não tiver um.
 */
export function readResetToken(
  hash: string = typeof window === 'undefined' ? '' : (window.location?.hash ?? ''),
): string | null {
  const match = /^#token=([A-Za-z0-9_-]{20,200})$/.exec(hash);
  return match?.[1] ?? null;
}

/**
 * Tira o fragmento do endereço, para o token não ficar no histórico nem na barra de endereço depois
 * de lido. Não faz nada fora do navegador.
 */
export function clearResetTokenFromUrl(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
