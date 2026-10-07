import { Platform } from 'react-native';

/** URL local padrão da API (Azure Functions Core Tools); serve para a web e o simulador de iOS. */
export const DEFAULT_API_BASE_URL = 'http://localhost:7071/api';

/**
 * Normaliza a URL base da API. Aceita `http` e `https` ou um caminho na mesma origem (por exemplo
 * `/api`, usado pela versão web atrás de proxy no Docker), remove a barra final e usa a URL local
 * padrão quando nada foi configurado.
 *
 * @param value - Valor de `EXPO_PUBLIC_API_URL`, se houver.
 * @returns URL base sem barra final.
 * @throws Error se o valor não for uma URL `http` ou `https` nem um caminho começando com uma barra.
 */
export function resolveApiBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_API_BASE_URL;
  // `//host` e `/\host` trocam de origem; só um caminho simples (`/api`) é "mesma origem".
  if (/^\/(?![/\\])/.test(trimmed)) return trimmed.replace(/\/+$/, '');
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

/** Endereço do computador visto de dentro do emulador de Android (o `localhost` dele é o próprio emulador). */
const ENDERECO_DO_COMPUTADOR_NO_EMULADOR = '10.0.2.2';

/**
 * No Android, troca `localhost` e `127.0.0.1` por `10.0.2.2`, o endereço do computador de
 * desenvolvimento visto do emulador. Outras plataformas e outros endereços ficam como estão
 * (celular real usa o IP da rede, definido em `EXPO_PUBLIC_API_URL`).
 *
 * @param url - URL base já normalizada.
 * @param plataforma - Sistema do aparelho (`Platform.OS`).
 */
export function ajustarParaEmulador(url: string, plataforma: string): string {
  if (plataforma !== 'android') return url;
  return url.replace(
    /^(https?:\/\/)(?:localhost|127\.0\.0\.1)(?=[:/]|$)/,
    `$1${ENDERECO_DO_COMPUTADOR_NO_EMULADOR}`,
  );
}

/**
 * URL base da API em uso. A leitura de `process.env.EXPO_PUBLIC_*` precisa ser literal para o
 * Expo substituir o valor na hora do build; por isso ela fica aqui e não dentro de uma função.
 */
export const API_BASE_URL = ajustarParaEmulador(
  resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_URL),
  Platform.OS,
);
