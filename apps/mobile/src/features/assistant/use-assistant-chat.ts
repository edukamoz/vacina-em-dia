import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AssistantReply, AssistantResponse, AssistantSearchHit } from '@vacina/shared';
import type * as RouterModule from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints';
import {
  ehDaConta,
  responderDaConta,
  type Efeitos,
  type FonteDeDados,
  type Passo,
} from '../../lib/assistente-conta';
import { todayCivil } from '../../lib/dates';
import { useSession } from '../../session/session-provider';

/** Mensagem do chat: da pessoa ou do assistente. */
export interface ChatMessage {
  readonly id: number;
  readonly role: 'user' | 'assistant';
  readonly text: string;
  /** Resposta completa do assistente (fonte, sugestões, sinalizações). */
  readonly reply?: AssistantReply;
  /** Vacinas parecidas com a pergunta por voz. */
  readonly results?: readonly AssistantSearchHit[];
  /** Verdadeiro quando a pergunta foi falada e o texto é a transcrição. */
  readonly spoken?: boolean;
  /** Botões da resposta (confirmar uma ação, escolher, abrir uma tela). */
  readonly passos?: readonly Passo[];
  /** Verdadeiro depois que um botão foi usado: os botões somem para não repetir a ação. */
  readonly resolvido?: boolean;
}

/** Fonte citada nas respostas montadas com os dados da conta. */
const FONTE_DA_CONTA = { name: 'Seus dados no Vacina em Dia' } as const;

/** Mensagem de erro em linguagem simples, sem detalhe técnico. */
function erroSimples(erro: unknown): string {
  return erro instanceof Error && erro.name === 'ApiRequestError'
    ? erro.message
    : 'Não consegui fazer isso agora. Tente de novo ou use as telas do aplicativo.';
}

/** Primeira mensagem do chat: apresenta o assistente e sugere perguntas (texto fixo e curado). */
export const WELCOME: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: 'Olá! Eu sou o assistente do Vacina em Dia. Posso explicar como usar o aplicativo, contar o que diz o Calendário Nacional de Vacinação e olhar a sua conta (quem está na família, doses atrasadas, próximas vacinas). Se você pedir, também adiciono pessoas e registro ou agendo doses, sempre depois da sua confirmação. Você pode escrever ou falar.',
  reply: {
    intent: 'saudacao',
    text: '',
    confidence: 1,
    source: { name: 'Ajuda do Vacina em Dia' },
    suggestions: [
      'Tenho vacina atrasada?',
      'Qual a próxima vacina?',
      'Para que serve a BCG?',
      'Abrir o painel de gráficos',
    ],
    fallback: false,
    safety: false,
  },
};

/**
 * Estado do chat com o assistente (RF06 e RF07): lista de mensagens, envio por texto e por voz e a
 * última falha, em linguagem simples. Nada é guardado no aparelho: a conversa some ao sair da tela.
 */
export function useAssistantChat() {
  const { api, account, selectMember } = useSession();
  const client = useQueryClient();
  const [working, setWorking] = useState(false);
  const [messages, setMessages] = useState<readonly ChatMessage[]>([WELCOME]);
  const nextId = useRef(1);

  const append = useCallback((...items: Omit<ChatMessage, 'id'>[]) => {
    setMessages((current) => [
      ...current,
      ...items.map((item) => ({ ...item, id: nextId.current++ })),
    ]);
  }, []);

  // Dados e ações da conta (B61): as consultas passam pelo mesmo cache das telas, e cada gravação
  // usa os mesmos endpoints, com as mesmas regras, das telas.
  const fonte: FonteDeDados = {
    hoje: todayCivil(),
    email: account?.email ?? null,
    membros: async () =>
      (
        await client.fetchQuery({
          queryKey: ['members'],
          queryFn: ({ signal }) => endpoints.listMembers(api, signal),
          staleTime: 15_000,
        })
      ).items,
    doses: async (memberId) =>
      (
        await client.fetchQuery({
          queryKey: ['member-doses', memberId],
          queryFn: ({ signal }) => endpoints.getMemberDoses(api, memberId, signal),
          staleTime: 15_000,
        })
      ).items,
    lembretes: () =>
      client.fetchQuery({
        queryKey: ['reminders'],
        queryFn: ({ signal }) => endpoints.getReminders(api, signal),
        staleTime: 15_000,
      }),
  };

  const refrescarDoses = async () => {
    await client.invalidateQueries({ queryKey: ['member-doses'] });
    await client.invalidateQueries({ queryKey: ['dose'] });
    await client.invalidateQueries({ queryKey: ['reminders'] });
  };

  const efeitos: Efeitos = {
    criarPessoa: async (input) => {
      const criada = await endpoints.createMember(api, input);
      await client.invalidateQueries({ queryKey: ['members'] });
      return criada;
    },
    aplicarDose: async (doseId, data) => {
      await endpoints.sendDoseEvent(api, doseId, { type: 'APPLY', date: data });
      await refrescarDoses();
    },
    agendarDose: async (doseId, data) => {
      await endpoints.sendDoseEvent(api, doseId, { type: 'SCHEDULE', date: data });
      await refrescarDoses();
    },
    abrir: (rota, memberId) => {
      if (memberId) selectMember(memberId);
      // Carregado só na hora de usar: o chat funciona sem navegação (por exemplo, nos testes).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { router } = require('expo-router') as typeof RouterModule;
      router.push(rota as never);
    },
  };

  const showAnswer = async (response: AssistantResponse, pergunta: string) => {
    const { reply } = response;
    if (ehDaConta(reply.intent) && !reply.fallback && !reply.safety) {
      try {
        const resposta = await responderDaConta(reply, pergunta, fonte, efeitos);
        append({
          role: 'assistant',
          text: resposta.texto,
          reply: { ...reply, text: resposta.texto, source: FONTE_DA_CONTA },
          ...(resposta.passos ? { passos: resposta.passos } : {}),
        });
      } catch (erro) {
        append({ role: 'assistant', text: erroSimples(erro) });
      }
      return;
    }
    append({
      role: 'assistant',
      text: reply.text,
      reply,
      ...(response.transcript !== null ? { results: response.results } : {}),
    });
  };

  const text = useMutation({
    mutationFn: (question: string) => endpoints.sendAssistantMessage(api, { text: question }),
    onMutate: (question) => append({ role: 'user', text: question }),
    onSuccess: (response, question) => showAnswer(response, question),
  });

  const voice = useMutation({
    mutationFn: (wav: Uint8Array) => endpoints.sendAssistantVoice(api, wav),
    onSuccess: async (response) => {
      append({ role: 'user', text: response.transcript ?? '', spoken: true });
      await showAnswer(response, response.transcript ?? '');
    },
  });

  /** Usa um botão da resposta: some com os botões e mostra o que aconteceu. */
  const runStep = async (messageId: number, passo: Passo) => {
    setMessages((current) =>
      current.map((m) => (m.id === messageId ? { ...m, resolvido: true } : m)),
    );
    setWorking(true);
    try {
      const resposta = await passo.executar();
      if (resposta) {
        append({
          role: 'assistant',
          text: resposta.texto,
          reply: {
            intent: 'acao_concluida',
            text: resposta.texto,
            confidence: 1,
            source: FONTE_DA_CONTA,
            suggestions: [],
            fallback: false,
            safety: false,
          },
          ...(resposta.passos ? { passos: resposta.passos } : {}),
        });
      }
    } catch (erro) {
      append({ role: 'assistant', text: erroSimples(erro) });
    } finally {
      setWorking(false);
    }
  };

  return {
    messages,
    sendText: (question: string) => {
      voice.reset();
      text.mutate(question.trim());
    },
    sendVoice: (wav: Uint8Array) => {
      text.reset();
      voice.mutate(wav);
    },
    runStep,
    thinking: text.isPending || voice.isPending || working,
    error: (text.error ?? voice.error)?.message ?? null,
    clearError: () => {
      text.reset();
      voice.reset();
    },
  };
}
