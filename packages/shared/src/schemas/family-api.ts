import { z } from 'zod';
import { civilDateSchema } from './dose';
import { calendarSourceSchema, doseResponseSchema } from './dose-api';

/** Esquema do identificador de um membro na URL (letras minúsculas, números e hífen). */
export const memberIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,40}$/, 'Identificador de membro inválido.')
  .meta({
    example: '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
    description: 'Identificador do membro.',
  });

/** Faixas etárias do calendário que um membro pode ter. */
export const ageGroupSchema = z
  .enum(['CHILD', 'ADOLESCENT_YOUTH', 'ADULT', 'ELDERLY'])
  .meta({ description: 'Faixa etária do calendário nacional.' });

/**
 * Esquema do corpo de criação e edição de um membro da família (RF02). Só o mínimo necessário
 * (CLAUDE.md §10): nome ou apelido, data de nascimento e, se for o caso, o grupo gestante. Não
 * coleta CPF nem Cartão Nacional de Saúde.
 */
export const memberInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Informe o nome ou apelido.')
      .max(60)
      .meta({ example: 'Maria', description: 'Nome ou apelido (use um apelido, se preferir).' }),
    birthDate: civilDateSchema.meta({ example: '2024-05-20', description: 'Data de nascimento.' }),
    isPregnant: z
      .boolean()
      .default(false)
      .meta({ description: 'Grupo específico: gestante (inclui as vacinas da gestação).' }),
  })
  .meta({ id: 'MemberInput' });

/** Esquema de um membro devolvido pela API. */
export const memberResponseSchema = z
  .object({
    id: memberIdSchema,
    name: z.string().meta({ example: 'Maria' }),
    birthDate: civilDateSchema,
    isPregnant: z.boolean(),
    ageGroup: ageGroupSchema,
  })
  .meta({ id: 'Member' });

/** Esquema da lista de membros. */
export const memberListResponseSchema = z
  .object({ items: z.array(memberResponseSchema) })
  .meta({ id: 'MemberList' });

/** Esquema do calendário de um membro: fonte e versão, o membro e as doses (RF03 e RF04). */
export const memberDosesResponseSchema = z
  .object({
    source: calendarSourceSchema,
    member: memberResponseSchema,
    items: z.array(doseResponseSchema),
  })
  .meta({ id: 'MemberDoses' });

/**
 * Esquema do corpo do consentimento (RF09). O texto do termo e a declaração de responsável ficam
 * registrados com a versão aceita.
 */
export const consentInputSchema = z
  .object({
    acceptedTerms: z
      .literal(true)
      .meta({ description: 'Precisa ser verdadeiro: o consentimento é explícito.' }),
    termVersion: z
      .string()
      .min(1)
      .max(20)
      .meta({ example: '2026-10-06', description: 'Versão do termo exibido ao usuário.' }),
    guardianDeclaration: z.boolean().default(false).meta({
      description:
        'Declaração de que a pessoa é responsável legal pelos menores que cadastrar (LGPD).',
    }),
  })
  .meta({ id: 'ConsentInput' });

/** Esquema do consentimento devolvido pela API. */
export const consentResponseSchema = z
  .object({
    accepted: z.boolean(),
    termVersion: z.string().nullable(),
    acceptedAt: z.string().nullable().meta({ example: '2026-10-06T15:00:00.000Z' }),
    guardianDeclaration: z.boolean(),
  })
  .meta({ id: 'Consent' });

/** Dados de um membro enviados pelo cliente. */
export type MemberInput = z.infer<typeof memberInputSchema>;
/** Membro devolvido pela API. */
export type MemberResponse = z.infer<typeof memberResponseSchema>;
/** Calendário de um membro devolvido pela API. */
export type MemberDosesResponse = z.infer<typeof memberDosesResponseSchema>;
/** Corpo do consentimento enviado pelo cliente. */
export type ConsentInput = z.infer<typeof consentInputSchema>;
/** Consentimento devolvido pela API. */
export type ConsentResponse = z.infer<typeof consentResponseSchema>;
