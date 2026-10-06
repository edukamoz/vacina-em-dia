/** Relógio injetável: devolve o instante atual em texto ISO 8601 (UTC). */
export type Clock = () => string;

/** Resposta HTTP simples, independente do SDK das Functions para facilitar os testes. */
export interface HttpResult {
  readonly status: number;
  readonly jsonBody: unknown;
}

/**
 * Monta a resposta do endpoint de saúde, usado para conferir se a API está no ar.
 *
 * @param clock - Relógio que informa a hora; recebido de fora para testar sem depender do tempo real.
 * @returns Resposta 200 com o estado do serviço, sem segredos nem dados pessoais.
 */
export function buildHealthResponse(clock: Clock): HttpResult {
  return {
    status: 200,
    jsonBody: { status: 'ok', service: 'vacina-em-dia-api', time: clock() },
  };
}
