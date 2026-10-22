import { z } from 'zod';

/** Uma notícia do feed oficial: só título, data e o link para a página original. */
export const newsItemSchema = z
  .object({
    title: z.string().meta({
      example: 'Ministério da Saúde amplia a vacinação contra a gripe',
      description: 'Título como o Ministério da Saúde publicou.',
    }),
    url: z.string().meta({
      example: 'https://www.gov.br/saude/pt-br/assuntos/noticias-ms/2026/outubro/exemplo',
      description: 'Endereço da notícia no site do Ministério da Saúde.',
    }),
    publishedAt: z.string().meta({
      example: '2026-10-19',
      description: 'Data de publicação (AAAA-MM-DD).',
    }),
    vaccineRelated: z.boolean().meta({
      description:
        'Verdadeiro quando o título cita vacina, vacinação, imunização ou uma doença do calendário (palavras fixas, sem IA).',
    }),
  })
  .meta({ id: 'NewsItem' });

/** Resposta de `GET /api/news`. */
export const newsResponseSchema = z
  .object({
    items: z.array(newsItemSchema).meta({
      description:
        'Da mais recente para a mais antiga; na mesma data, as que citam vacinação vêm antes. Vem vazia se o feed oficial não respondeu e não há cópia guardada.',
    }),
    source: z.object({
      name: z.string().meta({ example: 'Notícias do Ministério da Saúde' }),
      publisher: z.string().meta({ example: 'Ministério da Saúde' }),
      url: z.string().meta({ example: 'https://www.gov.br/saude/pt-br/assuntos/noticias-ms' }),
    }),
    updatedAt: z.string().nullable().meta({
      example: '2026-10-21T14:00:00.000Z',
      description: 'Quando o feed foi lido pela última vez com sucesso; nulo se nunca foi.',
    }),
    notice: z.string().meta({
      description: 'Aviso fixo: o app só repassa títulos e links; não dá orientação médica.',
    }),
  })
  .meta({ id: 'NewsResponse' });

/** Resposta de `GET /api/news`. */
export type NewsResponse = z.infer<typeof newsResponseSchema>;
/** Uma notícia do feed oficial. */
export type NewsItem = z.infer<typeof newsItemSchema>;
