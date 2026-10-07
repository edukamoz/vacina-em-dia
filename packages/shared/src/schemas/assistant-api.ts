import { z } from 'zod';

/** Tamanho máximo do texto de uma pergunta (igual ao do serviço de PLN). */
export const ASSISTANT_TEXT_MAX_LENGTH = 300;

/** Esquema do corpo de uma pergunta em texto ao assistente (RF07). */
export const assistantMessageInputSchema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, 'Escreva a sua pergunta.')
      .max(ASSISTANT_TEXT_MAX_LENGTH)
      .meta({ example: 'Para que serve a BCG?', description: 'Pergunta em texto livre.' }),
  })
  .meta({ id: 'AssistantMessageInput' });

/** Fonte citada numa resposta do assistente. */
export const assistantSourceSchema = z
  .object({
    name: z
      .string()
      .meta({ example: 'Calendário Nacional de Vacinação 2026, Ministério da Saúde (PNI)' }),
    url: z
      .string()
      .optional()
      .meta({ example: 'https://www.gov.br/saude/pt-br/vacinacao/calendario' }),
    version: z.string().optional().meta({ example: '2026' }),
  })
  .meta({ id: 'AssistantSource' });

/** Resposta curada do assistente (chatbot por regras e classificação de intenções). */
export const assistantReplySchema = z
  .object({
    intent: z.string().meta({ example: 'vacina_para_que_serve' }),
    text: z.string().meta({ description: 'Resposta em linguagem simples, sempre curada.' }),
    confidence: z.number().min(0).max(1),
    source: assistantSourceSchema,
    suggestions: z.array(z.string()).meta({ description: 'Perguntas sugeridas para continuar.' }),
    fallback: z
      .boolean()
      .meta({ description: 'Verdadeiro quando o assistente não entendeu (confiança baixa).' }),
    safety: z.boolean().meta({
      description: 'Verdadeiro quando a pergunta foi encaminhada a um profissional de saúde.',
    }),
  })
  .meta({ id: 'AssistantReply' });

/** Vacina encontrada pela busca por similaridade. */
export const assistantSearchHitSchema = z
  .object({
    vaccine: z.string().meta({ example: 'BCG' }),
    score: z.number().min(0).max(1),
    diseases: z.string(),
    indications: z.array(z.string()).meta({ example: ['Criança: dose única, ao nascer'] }),
  })
  .meta({ id: 'AssistantSearchHit' });

/** Resposta de uma pergunta (texto ou voz): a transcrição (só na voz), a resposta e a busca. */
export const assistantResponseSchema = z
  .object({
    transcript: z
      .string()
      .nullable()
      .meta({ description: 'O que foi entendido da fala; nulo quando a pergunta veio em texto.' }),
    reply: assistantReplySchema,
    results: z.array(assistantSearchHitSchema),
    notice: z.string().meta({
      example:
        'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
    }),
  })
  .meta({ id: 'AssistantResponse' });

/** Resposta de busca do serviço de PLN (uso interno da API). */
export const nlpSearchResponseSchema = z.object({
  results: z.array(assistantSearchHitSchema),
  source: assistantSourceSchema,
  notice: z.string(),
});

/** Pergunta em texto. */
export type AssistantMessageInput = z.infer<typeof assistantMessageInputSchema>;
/** Resposta curada do assistente. */
export type AssistantReply = z.infer<typeof assistantReplySchema>;
/** Vacina encontrada pela busca. */
export type AssistantSearchHit = z.infer<typeof assistantSearchHitSchema>;
/** Resposta do assistente (texto ou voz). */
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
/** Busca do serviço de PLN. */
export type NlpSearchResponse = z.infer<typeof nlpSearchResponseSchema>;
