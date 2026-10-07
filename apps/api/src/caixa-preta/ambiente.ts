import type { AssistantReply, NlpSearchResponse } from '@vacina/shared';
import { createAssistantHandlers } from '../handlers/assistant';
import { createAuthHandlers } from '../handlers/auth';
import type { HttpResult } from '../http';
import { createInMemoryAuthRepository } from '../repositories/in-memory-auth';
import { createAssistantService } from '../services/assistant-service';
import { createAuthService } from '../services/auth-service';
import type { EmailMessage } from '../services/email-ports';
import { createScryptHasher } from '../services/password-hasher';
import { createFixedWindowLimiter } from '../services/rate-limiter';
import { createTokenService } from '../services/token-service';
import { buildApp, NOW, OTHER_OWNER, OWNER } from '../test-support';

/** O que uma execução devolve: o código HTTP, o código de erro da API e um detalhe opcional. */
export interface Obtido {
  readonly status: number;
  readonly code?: string | undefined;
  readonly detalhe?: string | undefined;
}

/** Dia civil de "hoje" em todos os casos (relógio controlado). */
export const HOJE = '2026-10-06';

/** Soma (ou subtrai) dias a uma data `AAAA-MM-DD`. */
export function somarDias(data: string, dias: number): string {
  const d = new Date(`${data}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Converte a resposta HTTP no formato comparado na tabela de execução. */
export function saida(resposta: HttpResult, detalhe?: string): Obtido {
  const corpo = resposta.jsonBody as { code?: string } | undefined;
  return { status: resposta.status, code: corpo?.code, detalhe };
}

const REPLY: AssistantReply = {
  intent: 'saudacao',
  text: 'Olá!',
  confidence: 0.9,
  source: { name: 'Ajuda do Vacina em Dia' },
  suggestions: [],
  fallback: false,
  safety: false,
};
const SEARCH: NlpSearchResponse = {
  results: [],
  source: { name: 'Calendário Nacional de Vacinação 2026, Ministério da Saúde (PNI)' },
  notice: 'O aplicativo não substitui a caderneta oficial.',
};

/** Bytes de um WAV mínimo (cabeçalho `RIFF....WAVE`) com o tamanho pedido. */
export function wav(tamanho: number, cabecalho = true): Uint8Array {
  const bytes = new Uint8Array(tamanho);
  if (cabecalho) {
    bytes.set([82, 73, 70, 70], 0);
    bytes.set([87, 65, 86, 69], 8);
  }
  return bytes;
}

/**
 * Ambiente isolado de um caso: aplicação em memória (família, doses, consentimento), login com
 * e-mail capturado e assistente com PLN e voz simulados. Sem rede, sem Azure e com relógio
 * controlado, para o caso ser determinístico.
 */
export function novoAmbiente() {
  const app = buildApp(NOW);
  let agoraAuth = NOW;
  const relogioAuth = () => agoraAuth;
  const emails: EmailMessage[] = [];
  let contador = 0;
  const auth = createAuthHandlers(
    createAuthService({
      accounts: createInMemoryAuthRepository(),
      hasher: createScryptHasher({ N: 16, r: 8, p: 1 }),
      tokens: createTokenService({
        secret: 'chave-da-caixa-preta-com-mais-de-32-caracteres',
        clock: relogioAuth,
      }),
      clock: relogioAuth,
      newId: () => `conta-${(contador += 1)}`,
      limiter: createFixedWindowLimiter(relogioAuth),
      email: { send: async (mensagem) => void emails.push(mensagem) },
      webBaseUrl: 'https://app.exemplo.com.br',
    }),
  );

  let reconhecida = true;
  const assistente = createAssistantHandlers(
    createAssistantService({
      nlp: { chat: async () => REPLY, search: async () => SEARCH },
      speech: {
        transcribe: async () =>
          reconhecida
            ? { ok: true as const, text: 'para que serve a BCG' }
            : { ok: false as const, reason: 'NOT_RECOGNIZED' as const },
      },
      limiter: createFixedWindowLimiter(relogioAuth),
    }),
  );

  const origem = { ip: '203.0.113.7' };
  return {
    app,
    auth,
    assistente,
    emails,
    origem,
    owner: OWNER,
    outroDono: OTHER_OWNER,
    /** Avança o relógio do login e do assistente. */
    avancar: (segundos: number) => {
      agoraAuth = new Date(Date.parse(agoraAuth) + segundos * 1000).toISOString();
    },
    /** Faz o assistente deixar de entender a fala. */
    falaNaoEntendida: () => {
      reconhecida = false;
    },
    /** Registra o consentimento do dono (com ou sem declaração de responsável). */
    consentir: (responsavel = true, dono: string = OWNER) => app.consent(dono, responsavel),
    /** Cadastra um membro adulto com consentimento e devolve a resposta. */
    cadastrar: (nascimento: string, nome = 'Pessoa Teste', dono: string = OWNER) =>
      app.handlers.members.create(dono, { name: nome, birthDate: nascimento, isPregnant: false }),
    /** Cadastra um recém-nascido (todas as doses ficam Pendentes) e devolve o id da primeira dose. */
    async primeiraDose(dono: string = OWNER): Promise<string> {
      await app.consent(dono, true);
      const membro = await app.handlers.members.create(dono, {
        name: 'Bebê Teste',
        birthDate: HOJE,
        isPregnant: false,
      });
      const id = (membro.jsonBody as { id: string }).id;
      const doses = await app.handlers.members.listDoses(dono, id);
      return (doses.jsonBody as { items: { id: string }[] }).items[0]?.id as string;
    },
    /** Cria a conta de login de teste. */
    async criarConta(email = 'ana@exemplo.com.br', senha = 'uma frase longa é melhor') {
      return auth.register(origem, { email, password: senha });
    },
    /** Lê o token do último e-mail de redefinição enviado. */
    tokenDoEmail(): string {
      const texto = emails[emails.length - 1]?.text ?? '';
      return /#token=([A-Za-z0-9_-]+)/.exec(texto)?.[1] ?? '';
    },
  };
}

/** Ambiente de um caso. */
export type Ambiente = ReturnType<typeof novoAmbiente>;
