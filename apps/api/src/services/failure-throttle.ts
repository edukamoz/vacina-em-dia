import { createHash } from 'node:crypto';
import type { Clock } from '../clock';

/** Estado do bloqueio de uma chave. */
export type ThrottleState =
  { readonly blocked: false } | { readonly blocked: true; readonly retryAfterSeconds: number };

/** Contador de falhas por chave, com bloqueio temporário (ADR-014). */
export interface FailureThrottle {
  /** Informa se a chave está bloqueada agora. */
  check(key: string): ThrottleState;
  /** Registra uma falha. Ao chegar no limite, a chave fica bloqueada pelo restante da janela. */
  fail(key: string): void;
  /** Zera a chave (após um login correto). */
  reset(key: string): void;
}

interface Entry {
  windowStart: number;
  failures: number;
}

/** Quantidade de chaves a partir da qual as vencidas são descartadas. */
const CLEANUP_THRESHOLD = 5000;

/**
 * Conta falhas em janela fixa, em memória. Ao atingir `limit` falhas dentro de `windowSeconds`, a
 * chave fica bloqueada até o fim da janela. Como o limitador do assistente (ADR-010), vale para uma
 * instância; a versão compartilhada entra com o banco.
 *
 * @param clock - Relógio injetável.
 * @param limit - Falhas permitidas antes do bloqueio.
 * @param windowSeconds - Duração da janela e do bloqueio.
 */
export function createFailureThrottle(
  clock: Clock,
  limit: number,
  windowSeconds: number,
): FailureThrottle {
  const entries = new Map<string, Entry>();
  const windowMs = windowSeconds * 1000;
  const now = (): number => Date.parse(clock());
  const live = (key: string): Entry | undefined => {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (now() - entry.windowStart >= windowMs) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };

  return {
    check(key) {
      const entry = live(key);
      if (!entry || entry.failures < limit) return { blocked: false };
      const left = entry.windowStart + windowMs - now();
      return { blocked: true, retryAfterSeconds: Math.max(1, Math.ceil(left / 1000)) };
    },
    fail(key) {
      if (entries.size >= CLEANUP_THRESHOLD) {
        for (const stored of entries.keys()) live(stored);
      }
      const entry = live(key);
      if (entry) entry.failures += 1;
      else entries.set(key, { windowStart: now(), failures: 1 });
    },
    reset(key) {
      entries.delete(key);
    },
  };
}

/**
 * Chave opaca para um valor pessoal (e-mail ou endereço de rede): o contador não guarda o valor.
 *
 * @param value - Valor a esconder.
 */
export function throttleKey(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}
