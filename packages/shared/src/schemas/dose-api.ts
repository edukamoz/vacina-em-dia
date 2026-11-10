import { z } from 'zod';
import {
  MAX_REMIND_DAYS_BEFORE,
  MAX_SERIES_DOSES,
  RECURRENCE_ANCHORS,
  RECURRENCE_MAX_EVERY,
  RECURRENCE_UNITS,
  compareCivilDates,
} from '../domain';
import { civilDateSchema, doseStatusSchema } from './dose';

/** Esquema do identificador de uma dose na URL (letras minúsculas, números e hífen). */
export const doseIdSchema = z
  .string()
  .regex(/^[a-z0-9-]{1,40}$/, 'Identificador de dose inválido.')
  .meta({ example: 'ex-2', description: 'Identificador da dose.' });

/** De onde vem a dose: do calendário oficial ou cadastrada à mão pela pessoa. */
export const doseOriginSchema = z.enum(['OFFICIAL', 'CUSTOM']).meta({
  description:
    'OFFICIAL: dose do calendário nacional. CUSTOM: dose avulsa, cadastrada pela pessoa (não vem do calendário oficial).',
});

/** Quantidade máxima de doses avulsas por pessoa. */
export const MAX_CUSTOM_DOSES = 30;

/** Esquema da repetição de uma dose avulsa, como a pessoa a informa. */
export const recurrenceInputSchema = z
  .object({
    unit: z.enum(RECURRENCE_UNITS).meta({
      example: 'YEAR',
      description: 'Unidade de tempo: DAY (dia), WEEK (semana), MONTH (mês) ou YEAR (ano).',
    }),
    every: z.number().int().min(1).meta({
      example: 1,
      description:
        'A cada quantas unidades se repete. Máximo: 365 dias, 104 semanas, 120 meses ou 50 anos.',
    }),
    anchor: z.enum(RECURRENCE_ANCHORS).meta({
      example: 'APPLICATION',
      description:
        'De onde a próxima data é contada. APPLICATION: da data em que a dose foi aplicada. SCHEDULE: de uma grade fixa que parte da primeira data prevista.',
    }),
    endDate: civilDateSchema.nullable().optional().meta({
      example: null,
      description: 'Data limite da série; depois dela nenhuma dose é criada. Opcional.',
    }),
    maxDoses: z.number().int().min(2).max(MAX_SERIES_DOSES).nullable().optional().meta({
      example: 5,
      description: 'Total de doses da série, contando a primeira (de 2 a 120). Opcional.',
    }),
  })
  .superRefine((value, ctx) => {
    if (value.every > RECURRENCE_MAX_EVERY[value.unit]) {
      ctx.addIssue({
        code: 'custom',
        path: ['every'],
        message: `O máximo para esta unidade é ${RECURRENCE_MAX_EVERY[value.unit]}.`,
      });
    }
  })
  .meta({ id: 'RecurrenceInput' });

/** Esquema da repetição de uma dose, como a API a devolve. */
export const recurrenceResponseSchema = z
  .object({
    unit: z.enum(RECURRENCE_UNITS),
    every: z.number().int().min(1),
    anchor: z.enum(RECURRENCE_ANCHORS),
    endDate: civilDateSchema.nullable(),
    maxDoses: z.number().int().nullable(),
  })
  .meta({ id: 'Recurrence' });

/** Esquema do aviso antecipado de uma dose, em dias (0 avisa só no próprio dia). */
export const remindDaysBeforeSchema = z.number().int().min(0).max(MAX_REMIND_DAYS_BEFORE).meta({
  example: 7,
  description: 'Quantos dias antes da data o aviso aparece (de 0 a 60). Vazio usa o padrão de 7.',
});

/**
 * Esquema do corpo para cadastrar uma dose avulsa (RF04): vacina que não aparece no calendário
 * oficial, mas que a pessoa precisa acompanhar (por exemplo, por indicação médica). O nome é texto
 * livre; a dose segue o mesmo ciclo de estados das oficiais, começando em Pendente.
 */
export const customDoseInputSchema = z
  .object({
    vaccine: z
      .string()
      .trim()
      .min(2, 'Informe o nome da vacina.')
      .max(80)
      // eslint-disable-next-line no-control-regex -- recusa caracteres de controle no texto livre
      .regex(/^[^\u0000-\u001f\u007f]+$/, 'Use só letras, números e pontuação comum.')
      .meta({ example: 'Raiva (pré-exposição)', description: 'Nome da vacina, em texto livre.' }),
    doseLabel: z
      .string()
      .trim()
      .min(1, 'Informe qual é a dose.')
      .max(40)
      // eslint-disable-next-line no-control-regex -- recusa caracteres de controle no texto livre
      .regex(/^[^\u0000-\u001f\u007f]+$/, 'Use só letras, números e pontuação comum.')
      .meta({ example: '1ª dose', description: 'Qual dose é, em texto livre.' }),
    dueDate: civilDateSchema.meta({
      example: '2026-11-04',
      description: 'Data prevista; hoje ou depois. Para o que já foi tomado, registre a aplicação.',
    }),
    recurrence: recurrenceInputSchema.optional().meta({
      description:
        'Se a vacina se repete. Ao aplicar a dose, a próxima é criada sozinha como Pendente.',
    }),
    remindDaysBefore: remindDaysBeforeSchema.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const end = value.recurrence?.endDate;
    if (end && compareCivilDates(end, value.dueDate) <= 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['recurrence', 'endDate'],
        message: 'A data final deve ser depois da primeira data prevista.',
      });
    }
  })
  .meta({ id: 'CustomDoseInput' });

/** Esquema de uma dose devolvida pela API: estado do ciclo de vida mais os dados do calendário. */
export const doseResponseSchema = z
  .object({
    id: doseIdSchema,
    memberId: z.string().meta({ description: 'Membro da família a quem a dose pertence.' }),
    origin: doseOriginSchema,
    ruleId: z.string().nullable().meta({
      example: 'crianca-penta-1',
      description: 'Linha do calendário oficial; vazio em dose avulsa.',
    }),
    vaccine: z.string().meta({ example: 'penta (DTP+Hib+HB)' }),
    doseLabel: z.string().meta({ example: '1ª dose' }),
    diseases: z.string().meta({ description: 'Doenças evitadas, como no calendário oficial.' }),
    timingKind: z.enum(['AGE', 'HISTORY', 'GESTATION', 'CUSTOM']).meta({
      description:
        'Se a dose tem idade fixa, vale conforme o histórico, é da gestação ou é avulsa (CUSTOM).',
    }),
    timingLabel: z.string().meta({ example: '2 meses' }),
    conditional: z
      .boolean()
      .meta({ description: 'Verdadeiro quando a indicação depende de condição (ver as notas).' }),
    notes: z.array(z.string()).meta({ description: 'Notas de rodapé oficiais da linha.' }),
    status: doseStatusSchema.meta({ description: 'Estado atual da dose (RF04).' }),
    dueDate: civilDateSchema.meta({ example: '2026-09-15', description: 'Data prevista.' }),
    scheduledDate: civilDateSchema.nullable().meta({ example: null }),
    appliedDate: civilDateSchema.nullable().meta({ example: null }),
    recurrence: recurrenceResponseSchema.nullable().optional().meta({
      description: 'Repetição da dose; vazio quando a dose não se repete.',
    }),
    occurrence: z.number().int().min(1).nullable().optional().meta({
      example: 1,
      description: 'Número desta dose na série que se repete (1 é a primeira).',
    }),
    remindDaysBefore: remindDaysBeforeSchema.nullable().optional(),
  })
  .meta({ id: 'Dose' });

/** Fonte e versão do calendário que originou as doses (RNF10). */
export const calendarSourceSchema = z
  .object({
    name: z.string().meta({ example: 'Calendário Nacional de Vacinação 2026' }),
    publisher: z.string().meta({ example: 'Ministério da Saúde (PNI)' }),
    version: z.string().meta({ example: '2026' }),
    url: z.string().meta({ example: 'https://www.gov.br/saude/pt-br/vacinacao/calendario' }),
    retrievedAt: z.string().meta({ example: '2026-10-06' }),
    isFictitious: z
      .boolean()
      .meta({ description: 'Verdadeiro só para dados de exemplo; o calendário oficial é falso.' }),
    notice: z.string().meta({
      example:
        'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
    }),
  })
  .meta({ id: 'CalendarSource' });

/** Esquema do erro devolvido pela API. Nunca contém detalhes internos (CLAUDE.md §7). */
export const apiErrorSchema = z
  .object({
    code: z.enum([
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'CONSENT_REQUIRED',
      'NOT_FOUND',
      'INVALID_TRANSITION',
      'GUARD_VIOLATION',
      'GUARDIAN_DECLARATION_REQUIRED',
      'INVALID_BIRTH_DATE',
      'INVALID_DOSE_DATE',
      'LIMIT_REACHED',
      'RATE_LIMITED',
      'INVALID_CREDENTIALS',
      'EMAIL_ALREADY_REGISTERED',
      'WEAK_PASSWORD',
      'INVALID_TOKEN',
      'INVALID_RESET_TOKEN',
      'AUTH_UNAVAILABLE',
      'ASSISTANT_UNAVAILABLE',
      'SPEECH_NOT_RECOGNIZED',
      'UNSUPPORTED_AUDIO',
      'AUDIO_TOO_LARGE',
      'INVALID_IMAGE',
      'IMAGE_TOO_LARGE',
      'STORAGE_UNAVAILABLE',
      'INVALID_INVITE',
      'HOUSEHOLD_HAS_MEMBERS',
      'NOT_ALONE',
      'OWNER_ONLY',
      'OWNER_MUST_TRANSFER',
      'ALREADY_IN_HOUSEHOLD',
      'INTERNAL_ERROR',
    ]),
    message: z
      .string()
      .meta({ example: 'Esta ação não é possível para a situação atual da dose.' }),
    fields: z
      .array(z.string())
      .optional()
      .meta({ description: 'Campos inválidos, quando o erro é de validação.' }),
    memberCount: z.number().int().min(0).optional().meta({
      description: 'Quantas pessoas você tem, quando o erro é HOUSEHOLD_HAS_MEMBERS.',
    }),
  })
  .meta({ id: 'ApiError' });

/** Corpo para cadastrar uma dose avulsa. */
export type CustomDoseInput = z.infer<typeof customDoseInputSchema>;
/** Origem de uma dose. */
export type DoseOrigin = z.infer<typeof doseOriginSchema>;
/** Dose devolvida pela API. */
export type DoseResponse = z.infer<typeof doseResponseSchema>;
/** Fonte e versão do calendário devolvidas pela API. */
export type CalendarSourceResponse = z.infer<typeof calendarSourceSchema>;
/** Erro devolvido pela API. */
export type ApiError = z.infer<typeof apiErrorSchema>;
