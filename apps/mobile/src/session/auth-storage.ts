import { accountInfoSchema } from '@vacina/shared';
import { z } from 'zod';

/** Sessão de login guardada no aparelho (ADR-009 e ADR-014). */
export const storedSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  /** Instante (milissegundos desde 1970) em que o token de acesso vence. */
  expiresAt: z.number().int().positive(),
  account: accountInfoSchema,
});

/** Sessão de login guardada. */
export type StoredSession = z.infer<typeof storedSessionSchema>;

/** Onde a sessão fica guardada: armazenamento seguro no celular e `sessionStorage` na web. */
export interface SessionStore {
  /** Lê a sessão guardada; `null` se não houver ou se estiver corrompida. */
  load(): Promise<StoredSession | null>;
  /** Guarda a sessão (falhas de armazenamento são ignoradas: o app segue com a sessão em memória). */
  save(session: StoredSession): Promise<void>;
  /** Apaga a sessão guardada. */
  clear(): Promise<void>;
}

/** Nome da chave de armazenamento. */
export const SESSION_STORAGE_KEY = 'vacina-em-dia.sessao';

/**
 * Converte o texto guardado em sessão, recusando o que estiver fora do formato.
 *
 * @param raw - Texto guardado ou `null`.
 */
export function parseStoredSession(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
