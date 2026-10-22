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

/** Telas que o assistente sabe abrir. */
export const ASSISTANT_SCREENS = [
  'painel',
  'postos',
  'historico',
  'apoiar',
  'familia',
  'conta',
  'novidades',
  'doses',
] as const;

/**
 * O que o assistente entendeu de um comando ou de uma pergunta sobre a conta (B61): vacinas,
 * nomes, datas e a tela pedida. Vem das regras do serviço de PLN; o app é quem cruza com os dados
 * da pessoa logada e confirma com ela antes de qualquer ação. Datas sem ano vêm como `--MM-DD`.
 */
export const assistantEntitiesSchema = z
  .object({
    vaccines: z
      .array(z.string())
      .default([])
      .meta({ example: ['BCG'] }),
    names: z
      .array(z.string())
      .default([])
      .meta({ example: ['Maria'] }),
    dates: z
      .array(z.string())
      .default([])
      .meta({ example: ['2026-02-10'], description: 'AAAA-MM-DD, ou --MM-DD quando sem ano.' }),
    relativeDay: z
      .enum(['today', 'yesterday', 'tomorrow', 'day_before_yesterday'])
      .nullable()
      .default(null),
    screen: z.enum(ASSISTANT_SCREENS).nullable().default(null),
  })
  .meta({ id: 'AssistantEntities' });

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
    entities: assistantEntitiesSchema.optional().meta({
      description:
        'Só nas intenções da conta e dos comandos (`conta_*` e `acao_*`): o que foi entendido da frase. Vazio nas demais.',
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
/** O que o assistente entendeu de um comando. */
export type AssistantEntities = z.infer<typeof assistantEntitiesSchema>;
/** Resposta curada do assistente. */
export type AssistantReply = z.infer<typeof assistantReplySchema>;
/** Vacina encontrada pela busca. */
export type AssistantSearchHit = z.infer<typeof assistantSearchHitSchema>;
/** Resposta do assistente (texto ou voz). */
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;
/** Busca do serviço de PLN. */
export type NlpSearchResponse = z.infer<typeof nlpSearchResponseSchema>;
