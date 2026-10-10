import type { Page, Route } from '@playwright/test';

/** Dia fixo dos testes de ponta a ponta (o relógio do navegador é travado nele). */
export const HOJE = '2026-10-10';

const FONTE = {
  name: 'Calendário Nacional de Vacinação 2026',
  publisher: 'Ministério da Saúde (PNI)',
  version: '2026',
  url: 'https://www.gov.br/saude/pt-br/vacinacao/calendario',
  retrievedAt: '2026-10-06',
  isFictitious: false,
  notice:
    'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
};

interface Membro {
  id: string;
  name: string;
  birthDate: string;
  isPregnant: boolean;
  relationship: string | null;
  ageGroup: 'CHILD' | 'ADULT';
}

interface Dose {
  id: string;
  memberId: string;
  origin: 'OFFICIAL';
  ruleId: string;
  vaccine: string;
  doseLabel: string;
  diseases: string;
  timingKind: 'AGE';
  timingLabel: string;
  conditional: boolean;
  notes: string[];
  status: 'PENDING' | 'SCHEDULED' | 'OVERDUE' | 'APPLIED' | 'CANCELLED';
  dueDate: string;
  scheduledDate: string | null;
  appliedDate: string | null;
}

/** O que a API falsa guarda e que os testes podem conferir. */
export interface EstadoDaApi {
  consentimentoAceito: boolean;
  membros: Membro[];
  doses: Dose[];
  /** Chamadas recebidas, no formato "MÉTODO /caminho". */
  chamadas: string[];
  /** Corpo da última chamada de cada rota. */
  corpos: Record<string, unknown>;
}

const SESSAO = {
  accessToken: 'acesso-e2e',
  refreshToken: 'renovacao-e2e',
  tokenType: 'Bearer',
  expiresIn: 900,
  account: { id: 'conta-e2e', email: 'mariana@exemplo.com.br' },
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization,content-type,x-demo-session',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

function dosesDoMembro(membro: Membro): Dose[] {
  const base = {
    memberId: membro.id,
    origin: 'OFFICIAL' as const,
    timingKind: 'AGE' as const,
    conditional: false,
    notes: [],
    scheduledDate: null,
    appliedDate: null,
  };
  return [
    {
      ...base,
      id: `${membro.id}-bcg`,
      ruleId: 'bcg',
      vaccine: 'BCG',
      doseLabel: 'dose única',
      diseases: 'tuberculose',
      timingLabel: 'ao nascer',
      status: 'OVERDUE',
      dueDate: '2026-08-01',
    },
    {
      ...base,
      id: `${membro.id}-hepb`,
      ruleId: 'hepatite-b',
      vaccine: 'hepatite B',
      doseLabel: '1 dose',
      diseases: 'hepatite B',
      timingLabel: 'ao nascer',
      status: 'PENDING',
      dueDate: '2026-12-01',
    },
  ];
}

function grupoDeIdade(nascimento: string): 'CHILD' | 'ADULT' {
  const anos = (Date.parse(HOJE) - Date.parse(nascimento)) / (365.25 * 24 * 3600 * 1000);
  return anos < 12 ? 'CHILD' : 'ADULT';
}

/** Corpo JSON da chamada; vazio quando não há corpo ou ele não é um objeto JSON. */
function lerCorpo(texto: string | null): Record<string, unknown> {
  if (!texto) return {};
  try {
    const valor: unknown = JSON.parse(texto);
    return typeof valor === 'object' && valor !== null ? (valor as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/**
 * Instala uma API falsa no navegador: responde às chamadas que o app faz (`/api/...`) com dados
 * fixos, na memória. Os testes de ponta a ponta rodam sem Azure, sem banco e sem rede.
 *
 * @param page - Página do Playwright.
 * @returns O estado da API, para os testes conferirem o que o app enviou.
 */
export async function instalarApiFalsa(page: Page): Promise<EstadoDaApi> {
  const estado: EstadoDaApi = {
    consentimentoAceito: false,
    membros: [],
    doses: [],
    chamadas: [],
    corpos: {},
  };

  const json = (route: Route, status: number, corpo?: unknown) =>
    route.fulfill({
      status,
      headers: { ...CORS, 'content-type': 'application/json' },
      ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
    });

  await page.route('**/api/**', async (route) => {
    const pedido = route.request();
    const caminho = new URL(pedido.url()).pathname.replace(/^.*\/api/, '');
    const metodo = pedido.method();
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });

    const chave = `${metodo} ${caminho}`;
    estado.chamadas.push(chave);
    const corpo = lerCorpo(pedido.postData());
    estado.corpos[chave] = corpo;

    if (chave === 'GET /warmup') return json(route, 200, { status: 'ready' });
    if (chave === 'POST /auth/register') return json(route, 201, SESSAO);
    if (chave === 'POST /auth/login') {
      return corpo.password === 'uma frase longa é melhor'
        ? json(route, 200, SESSAO)
        : json(route, 401, {
            code: 'INVALID_CREDENTIALS',
            message: 'E-mail ou senha incorretos.',
          });
    }
    if (chave === 'POST /auth/refresh') return json(route, 200, SESSAO);
    if (chave === 'POST /auth/logout') return json(route, 204);
    if (chave === 'GET /auth/me') return json(route, 200, SESSAO.account);

    if (chave === 'GET /consent') {
      return json(
        route,
        200,
        estado.consentimentoAceito
          ? {
              accepted: true,
              termVersion: '2026-10-06',
              acceptedAt: '2026-10-10T12:00:00.000Z',
              guardianDeclaration: true,
            }
          : { accepted: false, termVersion: null, acceptedAt: null, guardianDeclaration: false },
      );
    }
    if (chave === 'PUT /consent') {
      estado.consentimentoAceito = true;
      return json(route, 200, {
        accepted: true,
        termVersion: '2026-10-06',
        acceptedAt: '2026-10-10T12:00:00.000Z',
        guardianDeclaration: corpo.guardianDeclaration === true,
      });
    }

    if (chave === 'GET /reminders') {
      return json(route, 200, { leadDays: 7, emailEnabled: true, items: [] });
    }
    if (chave === 'GET /members') return json(route, 200, { items: estado.membros });
    if (chave === 'POST /members') {
      const membro: Membro = {
        id: `m-${estado.membros.length + 1}`,
        name: String(corpo.name),
        birthDate: String(corpo.birthDate),
        isPregnant: corpo.isPregnant === true,
        relationship: (corpo.relationship as string | null | undefined) ?? null,
        ageGroup: grupoDeIdade(String(corpo.birthDate)),
      };
      estado.membros.push(membro);
      estado.doses.push(...dosesDoMembro(membro));
      return json(route, 201, membro);
    }

    const doses = /^GET \/members\/([^/]+)\/doses$/.exec(chave);
    if (doses) {
      const membro = estado.membros.find((m) => m.id === doses[1]);
      if (!membro)
        return json(route, 404, { code: 'NOT_FOUND', message: 'Pessoa não encontrada.' });
      return json(route, 200, {
        source: FONTE,
        member: membro,
        items: estado.doses.filter((d) => d.memberId === membro.id),
      });
    }

    const dose = /^(GET|POST) \/doses\/([^/]+)(\/events)?$/.exec(chave);
    if (dose) {
      const alvo = estado.doses.find((d) => d.id === decodeURIComponent(dose[2] ?? ''));
      if (!alvo) return json(route, 404, { code: 'NOT_FOUND', message: 'Dose não encontrada.' });
      if (dose[1] === 'POST' && corpo.type === 'APPLY') {
        alvo.status = 'APPLIED';
        alvo.appliedDate = String(corpo.date);
      }
      return json(route, 200, alvo);
    }

    if (chave === 'POST /assistant/message') {
      return json(route, 200, {
        transcript: null,
        reply: {
          intent: 'vacina_para_que_serve',
          text: 'BCG: protege contra formas graves da tuberculose.',
          confidence: 0.93,
          source: { name: 'Calendário Nacional de Vacinação 2026, Ministério da Saúde (PNI)' },
          suggestions: ['Quando toma a vacina BCG?'],
          fallback: false,
          safety: false,
        },
        results: [],
        notice: FONTE.notice,
      });
    }

    return json(route, 404, { code: 'NOT_FOUND', message: `Rota ${chave} não simulada.` });
  });

  return estado;
}
