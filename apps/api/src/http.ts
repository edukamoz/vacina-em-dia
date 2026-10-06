/** Resposta HTTP simples, independente do SDK das Functions para facilitar os testes. */
export interface HttpResult {
  readonly status: number;
  /** Corpo JSON. */
  readonly jsonBody?: unknown;
  /** Corpo em texto (por exemplo, a página HTML do Swagger UI). */
  readonly body?: string;
  readonly headers?: Readonly<Record<string, string>>;
}
