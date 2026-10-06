import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type {
  ConsentResponse,
  DoseResponse,
  MemberDosesResponse,
  MemberResponse,
} from '@vacina/shared';
import type { ReactElement } from 'react';
import { SessionProvider } from './session/session-provider';
import { ThemeProvider } from './theme/theme-provider';

/** Resposta simulada de uma rota da API. */
export interface FakeResponse {
  readonly status: number;
  readonly body?: unknown;
}

/** Rotas simuladas, no formato `"MÉTODO /caminho"`; o valor pode ser uma função do corpo enviado. */
export type FakeRoutes = Record<string, FakeResponse | ((body: unknown) => FakeResponse)>;

export const TEST_BASE_URL = 'http://api.test/api';
export const TEST_SESSION = 'sessao-de-teste-0001';

/**
 * Cria um `fetch` falso que responde pela tabela de rotas e guarda as chamadas feitas. Rota
 * ausente vira HTTP 500, para um teste esquecido de cobrir uma chamada falhar de forma visível.
 *
 * @param routes - Rotas simuladas.
 */
export function createFakeFetch(routes: FakeRoutes) {
  const calls: { key: string; body: unknown; headers: Record<string, string> }[] = [];
  const fetchFn = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const path = String(input).replace(TEST_BASE_URL, '');
    const key = `${method} ${path}`;
    const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ key, body, headers: (init?.headers ?? {}) as Record<string, string> });
    const route = routes[key];
    const response: FakeResponse = route
      ? typeof route === 'function'
        ? route(body)
        : route
      : { status: 500, body: { code: 'INTERNAL_ERROR', message: `rota ${key} não simulada` } };
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => {
        if (response.body === undefined) throw new Error('sem corpo');
        return response.body;
      },
    } as Response;
  });
  return { fetchFn: fetchFn as unknown as typeof fetch, calls, mock: fetchFn };
}

/**
 * Renderiza uma tela com tudo de que ela depende: dados do servidor (TanStack Query), sessão e
 * tema. O cache não tenta de novo nem expira, para o teste ser determinístico.
 *
 * @param ui - Tela a renderizar.
 * @param fetchFn - `fetch` falso.
 */
export async function renderScreen(ui: ReactElement, fetchFn: typeof fetch) {
  const client = new QueryClient({
    // gcTime infinito evita o temporizador de limpeza de cache, que deixaria o Jest aberto.
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { gcTime: Infinity },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <SessionProvider baseUrl={TEST_BASE_URL} sessionId={TEST_SESSION} fetchFn={fetchFn}>
        <ThemeProvider>{ui}</ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

export const MEMBER: MemberResponse = {
  id: 'm-1',
  name: 'Maria',
  birthDate: '2025-05-20',
  isPregnant: false,
  ageGroup: 'CHILD',
};

export const OTHER_MEMBER: MemberResponse = {
  id: 'm-2',
  name: 'João',
  birthDate: '1990-01-10',
  isPregnant: false,
  ageGroup: 'ADULT',
};

export const ACCEPTED: ConsentResponse = {
  accepted: true,
  termVersion: '2026-10-06',
  acceptedAt: '2026-10-06T15:00:00.000Z',
  guardianDeclaration: true,
};

export const SOURCE: MemberDosesResponse['source'] = {
  name: 'Calendário Nacional de Vacinação 2026',
  publisher: 'Ministério da Saúde (PNI)',
  version: '2026',
  url: 'https://www.gov.br/saude/pt-br/vacinacao/calendario',
  retrievedAt: '2026-10-06',
  isFictitious: false,
  notice:
    'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
};

/** Dose de teste; sobrescreva os campos que importam ao caso. */
export function dose(overrides: Partial<DoseResponse> = {}): DoseResponse {
  return {
    id: 'd-1',
    memberId: 'm-1',
    ruleId: 'crianca-penta-1',
    vaccine: 'penta (DTP+Hib+HB)',
    doseLabel: '1ª dose',
    diseases: 'difteria, tétano, coqueluche',
    timingKind: 'AGE',
    timingLabel: '2 meses',
    conditional: false,
    notes: [],
    status: 'PENDING',
    dueDate: '2026-12-01',
    scheduledDate: null,
    appliedDate: null,
    ...overrides,
  };
}

/** Resposta do calendário de um membro com as doses informadas. */
export function memberDoses(
  items: DoseResponse[],
  member: MemberResponse = MEMBER,
): MemberDosesResponse {
  return { source: SOURCE, member, items };
}
