import { useQueryClient } from '@tanstack/react-query';
import type { AccountInfo, AuthSession, LoginInput, RegisterInput } from '@vacina/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { API_BASE_URL } from '../api/config';
import { ApiRequestError, type ApiContext } from '../api/client';
import { endpoints } from '../api/endpoints';
import { clearUnitsCache } from '../features/units/units-cache';
import type { SessionStore, StoredSession } from './auth-storage';
import { sessionStore as defaultStore } from './session-store';

/** Situação do login: lendo o que está guardado, sem sessão, ou com sessão aberta. */
export type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

/** Valor entregue pelo contexto de sessão. */
export interface SessionContextValue {
  /** Endereço da API e identificação do usuário, prontos para as chamadas. */
  readonly api: ApiContext;
  /** Membro cuja carteira está aberta nas telas de Calendário e Histórico. */
  readonly selectedMemberId: string | null;
  /** Troca o membro selecionado. */
  readonly selectMember: (id: string | null) => void;
  /** Situação do login. */
  readonly status: AuthStatus;
  /** Conta da sessão aberta (ou `null`). */
  readonly account: AccountInfo | null;
  /** Cria a conta e abre a sessão. Lança `ApiRequestError` se a API recusar. */
  readonly register: (input: RegisterInput) => Promise<void>;
  /** Entra com e-mail e senha. Lança `ApiRequestError` se a API recusar. */
  readonly login: (input: LoginInput) => Promise<void>;
  /** Sai da conta: revoga o token no servidor (se der) e apaga a sessão e os dados em cache. */
  readonly logout: () => Promise<void>;
  /** Apaga só a sessão local (depois de excluir a conta no servidor). */
  readonly endSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Renova o token de acesso quando faltar menos que isto para vencer (30 s). */
const RENEW_MARGIN_MS = 30_000;

function toStored(session: AuthSession, now: number): StoredSession {
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: now + session.expiresIn * 1000,
    account: session.account,
  };
}

/**
 * Guarda a sessão de login (ADR-014) e o membro selecionado (Context API, ADR-006). O token de
 * acesso é renovado sozinho, uma renovação por vez, antes de vencer e quando a API responde 401;
 * se a renovação for recusada, a sessão termina e o app volta à tela inicial. Os dados do
 * servidor ficam com o TanStack Query, que é esvaziado ao entrar e ao sair para que os dados de
 * uma conta nunca apareçam para outra.
 *
 * **Modo demonstração (só testes e desenvolvimento):** com `sessionId`, não há login; as chamadas
 * levam o cabeçalho `x-demo-session` (ADR-013).
 *
 * @param props.baseUrl - Endereço da API; por padrão o configurado no build.
 * @param props.sessionId - Sessão de demonstração fixa (ativa o modo demonstração).
 * @param props.store - Onde guardar a sessão; por padrão o armazenamento da plataforma.
 * @param props.now - Relógio em milissegundos (injetável nos testes).
 */
export function SessionProvider({
  children,
  baseUrl = API_BASE_URL,
  sessionId,
  fetchFn,
  store = defaultStore,
  now = Date.now,
}: {
  children: ReactNode;
  baseUrl?: string;
  sessionId?: string;
  fetchFn?: typeof fetch;
  store?: SessionStore;
  now?: () => number;
}) {
  const queryClient = useQueryClient();
  const demo = sessionId !== undefined;
  const [selectedMemberId, selectMember] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>(demo ? 'authenticated' : 'loading');
  const [account, setAccount] = useState<AccountInfo | null>(null);

  const sessionRef = useRef<StoredSession | null>(null);
  const renewing = useRef<Promise<string | undefined> | null>(null);

  const publicApi = useMemo<ApiContext>(
    () => ({ baseUrl, ...(fetchFn ? { fetchFn } : {}) }),
    [baseUrl, fetchFn],
  );

  const open = useCallback(
    async (session: StoredSession | null) => {
      sessionRef.current = session;
      setAccount(session?.account ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
      if (session) await store.save(session);
      else await store.clear();
    },
    [store],
  );

  const reset = useCallback(async () => {
    await open(null);
    selectMember(null);
    queryClient.clear();
    // A lista de postos guardada no aparelho também sai com a conta.
    await clearUnitsCache();
  }, [open, queryClient]);

  useEffect(() => {
    if (demo) return;
    let active = true;
    void store.load().then((saved) => {
      if (!active) return;
      sessionRef.current = saved;
      setAccount(saved?.account ?? null);
      setStatus(saved ? 'authenticated' : 'anonymous');
    });
    return () => {
      active = false;
    };
  }, [demo, store]);

  const renew = useCallback((): Promise<string | undefined> => {
    // Uma renovação por vez: o token de renovação só vale uma vez, e pedidos simultâneos o gastariam.
    renewing.current ??= (async () => {
      const current = sessionRef.current;
      if (!current) return undefined;
      try {
        const next = await endpoints.refreshSession(publicApi, current.refreshToken);
        const stored = toStored(next, now());
        await open(stored);
        return stored.accessToken;
      } catch (error) {
        // Só uma recusa do servidor encerra a sessão; falta de rede não deve tirar a pessoa do app.
        if (error instanceof ApiRequestError && error.kind === 'server') {
          if (error.status === 401) {
            await reset();
          }
        }
        return undefined;
      } finally {
        renewing.current = null;
      }
    })();
    return renewing.current;
  }, [publicApi, now, open, reset]);

  const getAccessToken = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return undefined;
    if (current.expiresAt - now() > RENEW_MARGIN_MS) return current.accessToken;
    return (await renew()) ?? current.accessToken;
  }, [now, renew]);

  const api = useMemo<ApiContext>(
    () =>
      demo
        ? { baseUrl, sessionId, ...(fetchFn ? { fetchFn } : {}) }
        : { ...publicApi, getAccessToken, refreshAccessToken: renew },
    [demo, baseUrl, sessionId, fetchFn, publicApi, getAccessToken, renew],
  );

  const enter = useCallback(
    async (session: AuthSession) => {
      queryClient.clear();
      selectMember(null);
      await open(toStored(session, now()));
    },
    [queryClient, now, open],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      api,
      selectedMemberId,
      selectMember,
      status,
      account,
      register: async (input) => enter(await endpoints.register(publicApi, input)),
      login: async (input) => enter(await endpoints.login(publicApi, input)),
      logout: async () => {
        const current = sessionRef.current;
        if (current) {
          await endpoints.logout(publicApi, current.refreshToken).catch(() => undefined);
        }
        await reset();
      },
      endSession: reset,
    }),
    [api, selectedMemberId, status, account, publicApi, enter, reset],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/**
 * Lê a sessão, o login e o membro selecionado.
 *
 * @throws Error se usado fora do `SessionProvider`.
 */
export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession deve ser usado dentro do SessionProvider.');
  return context;
}
