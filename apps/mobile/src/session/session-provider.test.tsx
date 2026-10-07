import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ApiRequestError } from '../api/client';
import { endpoints } from '../api/endpoints';
import {
  STORED_SESSION,
  TEST_BASE_URL,
  createFakeFetch,
  createTestQueryClient,
  memorySessionStore,
  type FakeRoutes,
} from '../test-utils';
import { SessionProvider, useSession } from './session-provider';

const NOW = Date.parse('2026-10-06T15:00:00.000Z');
const sessionBody = (n: number) => ({
  accessToken: `acesso-${n}`,
  refreshToken: `renovacao-${n}`,
  tokenType: 'Bearer',
  expiresIn: 900,
  account: { id: 'conta-1', email: 'mariana@exemplo.com.br' },
});
const ME = { id: 'conta-1', email: 'mariana@exemplo.com.br' };
const REFUSED = {
  status: 401,
  body: { code: 'INVALID_TOKEN', message: 'Sua sessão terminou. Entre de novo.' },
};

function setup(options: {
  routes?: FakeRoutes;
  initial?: typeof STORED_SESSION | null;
  fetchFn?: typeof fetch;
  sessionId?: string;
}) {
  const fake = createFakeFetch(options.routes ?? {});
  const { store, box } = memorySessionStore(options.initial ?? null);
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <SessionProvider
        baseUrl={TEST_BASE_URL}
        fetchFn={options.fetchFn ?? fake.fetchFn}
        store={store}
        now={() => NOW}
        {...(options.sessionId ? { sessionId: options.sessionId } : {})}
      >
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
  return { fake, box, client, wrapper };
}

describe('sessão de login', () => {
  test('CT-SES-10: sem sessão guardada, começa sem login', async () => {
    const { wrapper } = setup({});
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    expect(result.current.status).toBe('anonymous');
    expect(result.current.account).toBeNull();
  });

  test('CT-SES-11: com sessão guardada, abre logada e as chamadas levam o token Bearer', async () => {
    const { wrapper, fake } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 600_000 },
      routes: { 'GET /auth/me': { status: 200, body: ME } },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    expect(result.current.status).toBe('authenticated');
    expect(result.current.account?.email).toBe('mariana@exemplo.com.br');
    await act(async () => {
      await endpoints.getMe(result.current.api);
    });
    expect(fake.calls[0]?.headers['Authorization']).toBe('Bearer token-de-acesso-1');
    expect(fake.calls[0]?.headers['x-demo-session']).toBeUndefined();
  });

  test('CT-SES-12: entrar guarda a sessão, define a validade e esvazia o cache de dados', async () => {
    const { wrapper, box, client, fake } = setup({
      routes: { 'POST /auth/login': { status: 200, body: sessionBody(1) } },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    client.setQueryData(['members'], { items: ['dado da conta anterior'] });
    await act(async () => {
      await result.current.login({ email: 'mariana@exemplo.com.br', password: 'uma frase longa' });
    });
    expect(result.current.status).toBe('authenticated');
    expect(box.saved).toMatchObject({
      accessToken: 'acesso-1',
      refreshToken: 'renovacao-1',
      expiresAt: NOW + 900_000,
    });
    expect(client.getQueryData(['members'])).toBeUndefined();
    expect(fake.calls[0]?.headers['Authorization']).toBeUndefined();
  });

  test('CT-SES-13: login recusado devolve o erro da API e não abre sessão', async () => {
    const { wrapper, box } = setup({
      routes: {
        'POST /auth/login': {
          status: 401,
          body: { code: 'INVALID_CREDENTIALS', message: 'E-mail ou senha incorretos.' },
        },
      },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    let error: unknown;
    await act(async () => {
      error = await result.current
        .login({ email: 'a@b.com', password: 'errada' })
        .catch((e: unknown) => e);
    });
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 });
    expect(result.current.status).toBe('anonymous');
    expect(box.saves).toBe(0);
  });

  test('CT-SES-14: criar conta abre a sessão', async () => {
    const { wrapper } = setup({
      routes: { 'POST /auth/register': { status: 201, body: sessionBody(1) } },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.register({ email: 'a@b.com', password: 'uma frase longa' });
    });
    expect(result.current.status).toBe('authenticated');
    expect(result.current.account?.id).toBe('conta-1');
  });

  test('CT-SES-15: token perto de vencer é renovado antes da chamada', async () => {
    const { wrapper, fake, box } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 10_000 },
      routes: {
        'POST /auth/refresh': { status: 200, body: sessionBody(2) },
        'GET /auth/me': { status: 200, body: ME },
      },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await endpoints.getMe(result.current.api);
    });
    expect(fake.calls.map((c) => c.key)).toEqual(['POST /auth/refresh', 'GET /auth/me']);
    expect(fake.calls[0]?.body).toEqual({ refreshToken: 'token-de-renovacao-1' });
    expect(fake.calls[1]?.headers['Authorization']).toBe('Bearer acesso-2');
    expect(box.saved?.refreshToken).toBe('renovacao-2');
  });

  test('CT-SES-16: resposta 401 renova a sessão e repete a chamada uma vez', async () => {
    let attempts = 0;
    const { wrapper, fake } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 600_000 },
      routes: {
        'POST /auth/refresh': { status: 200, body: sessionBody(2) },
        'GET /auth/me': () =>
          (attempts += 1) === 1
            ? { status: 401, body: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' } }
            : { status: 200, body: ME },
      },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    let me: unknown;
    await act(async () => {
      me = await endpoints.getMe(result.current.api);
    });
    expect(me).toEqual(ME);
    expect(fake.calls.map((c) => c.key)).toEqual([
      'GET /auth/me',
      'POST /auth/refresh',
      'GET /auth/me',
    ]);
    expect(fake.calls[2]?.headers['Authorization']).toBe('Bearer acesso-2');
  });

  test('CT-SES-17: chamadas simultâneas gastam uma renovação só (o token só vale uma vez)', async () => {
    const { wrapper, fake } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 5_000 },
      routes: {
        'POST /auth/refresh': { status: 200, body: sessionBody(2) },
        'GET /auth/me': { status: 200, body: ME },
      },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await Promise.all([
        endpoints.getMe(result.current.api),
        endpoints.getMe(result.current.api),
        endpoints.getMe(result.current.api),
      ]);
    });
    expect(fake.calls.filter((c) => c.key === 'POST /auth/refresh')).toHaveLength(1);
  });

  test('CT-SES-18: renovação recusada encerra a sessão e apaga o que estava guardado', async () => {
    const { wrapper, box } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 5_000 },
      routes: {
        'POST /auth/refresh': REFUSED,
        'GET /auth/me': {
          status: 401,
          body: { code: 'UNAUTHORIZED', message: 'Sessão inválida.' },
        },
      },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await endpoints.getMe(result.current.api).catch(() => undefined);
    });
    expect(result.current.status).toBe('anonymous');
    expect(box.saved).toBeNull();
    expect(box.clears).toBeGreaterThan(0);
  });

  test('CT-SES-19: falta de rede ao renovar não tira a pessoa da conta', async () => {
    const fake = createFakeFetch({ 'GET /auth/me': { status: 200, body: ME } });
    const failing = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/auth/refresh')) throw new Error('sem rede');
      return fake.fetchFn(input, init);
    });
    const { wrapper } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 5_000 },
      fetchFn: failing as unknown as typeof fetch,
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await endpoints.getMe(result.current.api).catch(() => undefined);
    });
    expect(result.current.status).toBe('authenticated');
  });

  test('CT-SES-20: erro do servidor (não 401) ao renovar também mantém a sessão', async () => {
    const { wrapper } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 5_000 },
      routes: {
        'POST /auth/refresh': { status: 503, body: undefined },
        'GET /auth/me': { status: 200, body: ME },
      },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await endpoints.getMe(result.current.api);
    });
    expect(result.current.status).toBe('authenticated');
  });

  test('CT-SES-21: sair revoga o token no servidor, apaga a sessão e esvazia o cache', async () => {
    const { wrapper, fake, box, client } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 600_000 },
      routes: { 'POST /auth/logout': { status: 204 } },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    client.setQueryData(['members'], { items: [] });
    await act(async () => {
      await result.current.logout();
    });
    expect(fake.calls[0]).toMatchObject({
      key: 'POST /auth/logout',
      body: { refreshToken: 'token-de-renovacao-1' },
    });
    expect(result.current.status).toBe('anonymous');
    expect(box.saved).toBeNull();
    expect(client.getQueryData(['members'])).toBeUndefined();
  });

  test('CT-SES-22: sair funciona mesmo com o servidor fora do ar', async () => {
    const { wrapper, box } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 600_000 },
      routes: { 'POST /auth/logout': { status: 500, body: undefined } },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.status).toBe('anonymous');
    expect(box.saved).toBeNull();
  });

  test('CT-SES-23: encerrar só a sessão local não chama o servidor', async () => {
    const { wrapper, fake } = setup({
      initial: { ...STORED_SESSION, expiresAt: NOW + 600_000 },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.endSession();
    });
    expect(fake.calls).toHaveLength(0);
    expect(result.current.status).toBe('anonymous');
  });

  test('CT-SES-24: sair sem sessão não falha nem chama o servidor', async () => {
    const { wrapper, fake } = setup({});
    const { result } = await renderHook(() => useSession(), { wrapper });
    await act(async () => {});
    await act(async () => {
      await result.current.logout();
    });
    expect(fake.calls).toHaveLength(0);
  });

  test('CT-SES-25: no modo demonstração não há login e a chamada leva o cabeçalho de demonstração', async () => {
    const { wrapper, fake } = setup({
      sessionId: 'sessao-de-teste-0001',
      routes: { 'GET /auth/me': { status: 200, body: ME } },
    });
    const { result } = await renderHook(() => useSession(), { wrapper });
    expect(result.current.status).toBe('authenticated');
    await act(async () => {
      await endpoints.getMe(result.current.api);
    });
    expect(fake.calls[0]?.headers['x-demo-session']).toBe('sessao-de-teste-0001');
    expect(fake.calls[0]?.headers['Authorization']).toBeUndefined();
  });

  test('CT-SES-26: usar a sessão fora do provedor lança erro claro', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderHook(() => useSession())).rejects.toThrow('SessionProvider');
    jest.restoreAllMocks();
  });
});
