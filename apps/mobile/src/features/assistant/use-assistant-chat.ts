import { useMutation } from '@tanstack/react-query';
import type { AssistantReply, AssistantResponse, AssistantSearchHit } from '@vacina/shared';
import { useCallback, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints';
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
}

/** Primeira mensagem do chat: apresenta o assistente e sugere perguntas (texto fixo e curado). */
export const WELCOME: ChatMessage = {
  id: 0,
  role: 'assistant',
  text: 'Olá! Eu sou o assistente do Vacina em Dia. Posso explicar como usar o aplicativo e contar o que diz o Calendário Nacional de Vacinação. Você pode escrever ou falar.',
  reply: {
    intent: 'saudacao',
    text: '',
    confidence: 1,
    source: { name: 'Ajuda do Vacina em Dia' },
    suggestions: [
      'O que significa dose atrasada?',
      'Para que serve a BCG?',
      'Como registro que tomei a vacina?',
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
  const { api } = useSession();
  const [messages, setMessages] = useState<readonly ChatMessage[]>([WELCOME]);
  const nextId = useRef(1);

  const append = useCallback((...items: Omit<ChatMessage, 'id'>[]) => {
    setMessages((current) => [
      ...current,
      ...items.map((item) => ({ ...item, id: nextId.current++ })),
    ]);
  }, []);

  const showAnswer = useCallback(
    (response: AssistantResponse) => {
      append({
        role: 'assistant',
        text: response.reply.text,
        reply: response.reply,
        ...(response.transcript !== null ? { results: response.results } : {}),
      });
    },
    [append],
  );

  const text = useMutation({
    mutationFn: (question: string) => endpoints.sendAssistantMessage(api, { text: question }),
    onMutate: (question) => append({ role: 'user', text: question }),
    onSuccess: showAnswer,
  });

  const voice = useMutation({
    mutationFn: (wav: Uint8Array) => endpoints.sendAssistantVoice(api, wav),
    onSuccess: (response) => {
      append({ role: 'user', text: response.transcript ?? '', spoken: true });
      showAnswer(response);
    },
  });

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
    thinking: text.isPending || voice.isPending,
    error: (text.error ?? voice.error)?.message ?? null,
    clearError: () => {
      text.reset();
      voice.reset();
    },
  };
}
