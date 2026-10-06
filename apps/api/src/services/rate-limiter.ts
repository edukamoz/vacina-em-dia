import type { Clock } from '../clock';
import type { RateDecision, RateLimiter, RateRule } from './assistant-ports';

/** Quantidade de contadores a partir da qual os vencidos são descartados. */
const CLEANUP_THRESHOLD = 5000;

interface Counter {
  windowStart: number;
  count: number;
  windowMs: number;
}

/**
 * Limitador de janela fixa, em memória. Atende ao ADR-010 enquanto a API roda em uma instância;
 * com várias instâncias ou reinícios os contadores não são compartilhados, e a versão com Azure
 * Table Storage descrita no ADR entra com o banco.
 *
 * @param clock - Relógio injetável, para testar a virada de janela.
 */
export function createFixedWindowLimiter(clock: Clock): RateLimiter {
  const counters = new Map<string, Counter>();

  function cleanup(now: number): void {
    if (counters.size < CLEANUP_THRESHOLD) return;
    for (const [key, counter] of counters) {
      if (now - counter.windowStart >= counter.windowMs) counters.delete(key);
    }
  }

  return {
    async consume(ownerId: string, rules: readonly RateRule[]): Promise<RateDecision> {
      const now = Date.parse(clock());
      cleanup(now);

      const current = rules.map((rule) => {
        const key = `${ownerId}:${rule.name}`;
        const windowMs = rule.windowSeconds * 1000;
        const stored = counters.get(key);
        const fresh = !stored || now - stored.windowStart >= windowMs;
        const counter: Counter = fresh
          ? { windowStart: now, count: 0, windowMs }
          : (stored as Counter);
        return { key, rule, counter };
      });

      let retryAfterMs = 0;
      for (const { rule, counter } of current) {
        if (counter.count >= rule.limit) {
          retryAfterMs = Math.max(retryAfterMs, counter.windowStart + counter.windowMs - now);
        }
      }
      if (retryAfterMs > 0) {
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
      }

      for (const { key, counter } of current) {
        counters.set(key, { ...counter, count: counter.count + 1 });
      }
      return { allowed: true };
    },
  };
}
