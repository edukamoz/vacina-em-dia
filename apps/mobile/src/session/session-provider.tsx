import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { API_BASE_URL } from '../api/config';
import type { ApiContext } from '../api/client';
import { loadSessionId, type TextStorage } from './session-id';

/** Valor entregue pelo contexto de sessão. */
export interface SessionContextValue {
  /** Endereço da API e sessão, prontos para as chamadas. */
  readonly api: ApiContext;
  /** Membro cuja carteira está aberta nas telas de Calendário e Histórico. */
  readonly selectedMemberId: string | null;
  /** Troca o membro selecionado. */
  readonly selectMember: (id: string | null) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function browserStorage(): TextStorage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

/**
 * Guarda a sessão de demonstração e o membro selecionado (Context API, ADR-006). Os dados do
 * servidor ficam com o TanStack Query, não aqui.
 *
 * @param props.baseUrl - Endereço da API; por padrão o configurado no build.
 * @param props.sessionId - Sessão fixa (usada nos testes); por padrão a do navegador.
 */
export function SessionProvider({
  children,
  baseUrl = API_BASE_URL,
  sessionId,
  fetchFn,
}: {
  children: ReactNode;
  baseUrl?: string;
  sessionId?: string;
  fetchFn?: typeof fetch;
}) {
  const [resolvedSession] = useState(() => sessionId ?? loadSessionId(browserStorage()));
  const [selectedMemberId, selectMember] = useState<string | null>(null);

  const value = useMemo<SessionContextValue>(
    () => ({
      api: { baseUrl, sessionId: resolvedSession, ...(fetchFn ? { fetchFn } : {}) },
      selectedMemberId,
      selectMember,
    }),
    [baseUrl, resolvedSession, fetchFn, selectedMemberId],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Lê a sessão e o membro selecionado.
 *
 * @throws Error se usado fora do `SessionProvider`.
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession deve ser usado dentro do SessionProvider.');
  return context;
}
