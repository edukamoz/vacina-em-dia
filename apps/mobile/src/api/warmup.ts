import { API_BASE_URL } from './config';

let jaChamou = false;

/**
 * Acorda a API e o banco enquanto a pessoa ainda está na tela inicial. O Azure SQL gratuito pausa
 * quando fica parado e a primeira consulta depois disso leva até um minuto; chamar `GET /warmup`
 * ao abrir o app faz essa espera acontecer antes do login. Roda uma única vez por abertura do app,
 * não espera resposta e ignora qualquer falha (o login funciona do mesmo jeito, só pode demorar).
 *
 * @param baseUrl - URL base da API; por padrão a configurada no app.
 * @param fetchFn - `fetch` injetável, para testar sem rede.
 */
export function aquecerServidor(
  baseUrl: string = API_BASE_URL,
  fetchFn: typeof fetch = fetch,
): void {
  if (jaChamou) return;
  jaChamou = true;
  void fetchFn(`${baseUrl}/warmup`).catch(() => undefined);
}

/** Só para testes: permite chamar `aquecerServidor` de novo. */
export function reiniciarAquecimentoParaTeste(): void {
  jaChamou = false;
}
