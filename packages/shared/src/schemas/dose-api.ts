import { z } from 'zod';
import { civilDateSchema, doseStatusSchema } from './dose';

/** Esquema do identificador de uma dose na URL (letras minúsculas, números e hífen). */
export const doseIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,40}$/, 'Identificador de dose inválido.')
  .meta({ example: 'ex-2', description: 'Identificador da dose.' });

/** Esquema de uma dose devolvida pela API. */
export const doseResponseSchema = z
  .object({
    id: doseIdSchema,
    vaccine: z.string().meta({ example: 'Vacina de exemplo B' }),
    doseLabel: z.string().meta({ example: '2ª dose' }),
    status: doseStatusSchema.meta({ description: 'Estado atual da dose (RF04).' }),
    dueDate: civilDateSchema.meta({ example: '2026-09-15', description: 'Data prevista.' }),
    scheduledDate: civilDateSchema.nullable().meta({ example: null }),
    appliedDate: civilDateSchema.nullable().meta({ example: null }),
  })
  .meta({ id: 'Dose' });

/** Fonte e versão do calendário que originou as doses. */
export const calendarSourceSchema = z
  .object({
    name: z.string().meta({ example: 'conjunto de exemplo do projeto (FICTITIOUS)' }),
    version: z.string().meta({ example: '0.0-exemplo' }),
    isFictitious: z
      .boolean()
      .meta({ description: 'Verdadeiro enquanto os dados não são oficiais.' }),
    notice: z.string().meta({
      example:
        'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
    }),
  })
  .meta({ id: 'CalendarSource' });

/** Esquema da lista de doses, sempre acompanhada da fonte e da versão do calendário. */
export const doseListResponseSchema = z
  .object({ source: calendarSourceSchema, items: z.array(doseResponseSchema) })
  .meta({ id: 'DoseList' });

/** Esquema do erro devolvido pela API. Nunca contém detalhes internos (CLAUDE.md §7). */
export const apiErrorSchema = z
  .object({
    code: z.enum([
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'INVALID_TRANSITION',
      'GUARD_VIOLATION',
      'INTERNAL_ERROR',
    ]),
    message: z
      .string()
      .meta({ example: 'Esta ação não é possível para a situação atual da dose.' }),
    fields: z
      .array(z.string())
      .optional()
      .meta({ description: 'Campos inválidos, quando o erro é de validação.' }),
  })
  .meta({ id: 'ApiError' });

/** Dose devolvida pela API. */
export type DoseResponse = z.infer<typeof doseResponseSchema>;
/** Lista de doses devolvida pela API. */
export type DoseListResponse = z.infer<typeof doseListResponseSchema>;
/** Erro devolvido pela API. */
export type ApiError = z.infer<typeof apiErrorSchema>;
