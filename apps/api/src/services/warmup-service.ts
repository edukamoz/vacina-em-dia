/** Resultado do aquecimento: o banco já respondeu (`ready`) ou ainda está acordando (`waking`). */
export type WarmupState = 'ready' | 'waking';

/** Dependências do serviço de aquecimento. */
export interface WarmupDeps {
  /** Consulta mínima ao banco; demora até cerca de um minuto se ele estava pausado. */
  readonly ping: () => Promise<void>;
  /** Hora atual em milissegundos (relógio injetável). */
  readonly clock: () => number;
  /** Quanto esperar pelo banco antes de responder "acordando", em ms; 4000 por padrão. */
  readonly waitMs?: number;
  /** Intervalo mínimo entre consultas reais, em ms; 60000 por padrão. */
  readonly minIntervalMs?: number;
}

/** Serviço de aquecimento. */
export interface WarmupService {
  /** Acorda o banco (no máximo uma consulta real por intervalo) e diz como ele está. */
  warm(): Promise<WarmupState>;
}

/**
 * Cria o serviço que acorda o banco pausado. Cada instância faz no máximo uma consulta real por
 * `minIntervalMs`: quem chamar de novo dentro do intervalo recebe o último resultado conhecido.
 * Isso impede que chamadas repetidas, que não exigem login, gastem a franquia gratuita do banco.
 * A consulta nunca é cancelada: se passar de `waitMs`, a resposta sai como `waking` e a consulta
 * segue em segundo plano, o que mantém o pedido de retomada do banco em andamento.
 *
 * @param deps - Consulta, relógio e tempos.
 */
export function createWarmupService(deps: WarmupDeps): WarmupService {
  const waitMs = deps.waitMs ?? 4000;
  const minIntervalMs = deps.minIntervalMs ?? 60_000;
  let lastStart: number | undefined;
  let state: WarmupState = 'waking';

  return {
    async warm() {
      const now = deps.clock();
      if (lastStart !== undefined && now - lastStart < minIntervalMs) return state;
      lastStart = now;
      state = 'waking';
      const query = deps
        .ping()
        .then(() => {
          state = 'ready';
        })
        .catch(() => {
          // Banco ainda pausado ou fora do ar: a próxima chamada, depois do intervalo, tenta de novo.
          state = 'waking';
        });
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, waitMs);
      });
      await Promise.race([query, timeout]);
      clearTimeout(timer);
      return state;
    },
  };
}
