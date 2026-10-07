import {
  assistantReplySchema,
  nlpSearchResponseSchema,
  type AssistantReply,
  type NlpSearchResponse,
} from '@vacina/shared';
import type { z } from 'zod';
import { UpstreamError, type NlpClient } from '../services/assistant-ports';

/** Tempo máximo de espera pelo serviço de PLN (cobre a partida a frio da Function Python). */
export const NLP_TIMEOUT_MS = 15000;

/** Configuração do cliente do serviço de PLN. */
export interface NlpClientConfig {
  /** Endereço do serviço, por exemplo `https://func-nlp-....azurewebsites.net/api`. */
  readonly baseUrl: string;
  /** Chave da função (cabeçalho `x-functions-key`); vem do Key Vault, nunca do repositório. */
  readonly functionKey: string;
  readonly fetchFn?: typeof fetch;
}

/**
 * Cliente HTTP do serviço de PLN. Valida as respostas com os mesmos esquemas Zod do
 * `@vacina/shared`. Qualquer falha vira {@link UpstreamError}, sem detalhe: a pergunta pode conter
 * dado pessoal e não pode aparecer em mensagens de erro nem em log.
 *
 * @param config - Endereço, chave e `fetch` (injetável nos testes).
 */
export function createHttpNlpClient({
  baseUrl,
  functionKey,
  fetchFn = fetch,
}: NlpClientConfig): NlpClient {
  async function post<S extends z.ZodType>(
    route: string,
    text: string,
    schema: S,
  ): Promise<z.infer<S>> {
    let response: Response;
    try {
      response = await fetchFn(`${baseUrl.replace(/\/+$/, '')}/${route}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'x-functions-key': functionKey,
        },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(NLP_TIMEOUT_MS),
      });
    } catch {
      throw new UpstreamError();
    }
    if (!response.ok) throw new UpstreamError();
    const parsed = schema.safeParse(await response.json().catch(() => undefined));
    if (!parsed.success) throw new UpstreamError();
    return parsed.data;
  }

  return {
    chat: (text): Promise<AssistantReply> => post('chat', text, assistantReplySchema),
    search: (text): Promise<NlpSearchResponse> => post('search', text, nlpSearchResponseSchema),
  };
}

/** Cliente usado quando o serviço de PLN não está configurado: toda chamada falha com segurança. */
export const unavailableNlpClient: NlpClient = {
  chat: () => Promise.reject(new UpstreamError()),
  search: () => Promise.reject(new UpstreamError()),
};
