/** URL local padrão da API (Azure Functions Core Tools); serve para a web e o simulador de iOS. */
export const DEFAULT_API_BASE_URL = 'http://localhost:7071/api';

/**
 * Normaliza a URL base da API. Aceita só `http` e `https`, remove a barra final e usa a URL local
 * padrão quando nada foi configurado.
 *
 * @param value - Valor de `EXPO_PUBLIC_API_URL`, se houver.
 * @returns URL base sem barra final.
 * @throws Error se o valor não for uma URL `http` ou `https`.
 */
export function resolveApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_API_BASE_URL;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('EXPO_PUBLIC_API_URL deve ser uma URL http ou https válida.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_URL deve ser uma URL http ou https válida.');
  }
  return trimmed.replace(/\/+$/, '');
}

/**
 * URL base da API em uso. A leitura de `process.env.EXPO_PUBLIC_*` precisa ser literal para o
 * Expo substituir o valor na hora do build; por isso ela fica aqui e não dentro de uma função.
 */
export const API_BASE_URL = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
