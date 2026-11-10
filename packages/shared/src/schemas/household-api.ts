import { z } from 'zod';

/** Papel de uma conta na família: o dono gerencia os acessos; o responsável vê e edita tudo. */
export const guardianRoleSchema = z.enum(['OWNER', 'GUARDIAN']).meta({
  description:
    'OWNER: convida, remove responsáveis, passa a propriedade e pode excluir a família. GUARDIAN: vê e edita as pessoas e as doses, mas não gerencia os acessos.',
});

/** Um responsável pela família, como a API o mostra a quem já faz parte dela. */
export const guardianResponseSchema = z
  .object({
    id: z.string().min(1).meta({
      example: 'b6f0c7e2-1f4a-4f5e-9d2b-2a7b1c3d4e5f',
      description: 'Identificador do vínculo na família (nunca o da conta).',
    }),
    role: guardianRoleSchema,
    emailHint: z.string().meta({
      example: 'm***@g***.com',
      description: 'E-mail parcialmente oculto, só para reconhecer quem é.',
    }),
    joinedAt: z.iso.datetime().meta({ description: 'Quando entrou na família.' }),
    isYou: z.boolean().meta({ description: 'Verdadeiro para o vínculo de quem está perguntando.' }),
  })
  .meta({ id: 'Guardian' });

/** A família de quem pergunta: o papel dela, os responsáveis e as contagens. */
export const householdResponseSchema = z
  .object({
    role: guardianRoleSchema,
    guardians: z.array(guardianResponseSchema).meta({
      description: 'Todos os responsáveis, do mais antigo ao mais novo.',
    }),
    memberCount: z.number().int().min(0).meta({ description: 'Quantas pessoas a família tem.' }),
    activeInvites: z.number().int().min(0).meta({
      description: 'Quantos convites ainda valem (só o dono os vê; para o responsável é 0).',
    }),
  })
  .meta({ id: 'Household' });

/** Convite recém-gerado: o código só aparece nesta resposta. */
export const inviteResponseSchema = z
  .object({
    code: z.string().meta({
      example: 'ABCDE-FGHJK',
      description: 'Código de uso único. É mostrado só agora: não fica guardado em claro.',
    }),
    expiresAt: z.iso.datetime().meta({ description: 'Até quando o convite vale (7 dias).' }),
  })
  .meta({ id: 'HouseholdInvite' });

/** Corpo para entrar numa família com um código de convite. */
export const joinInputSchema = z
  .object({
    code: z.string().min(1).max(32).meta({
      example: 'ABCDE-FGHJK',
      description: 'Código recebido do dono da família (com ou sem hífen, em qualquer caixa).',
    }),
    moveMembers: z.boolean().optional().meta({
      description:
        'Confirma levar para a nova família as pessoas que você já cadastrou. Sem a confirmação, quem tem pessoas recebe o erro HOUSEHOLD_HAS_MEMBERS e nada muda.',
    }),
  })
  .meta({ id: 'JoinHouseholdInput' });

/** Resposta de "entrar na família": a nova família e quantas pessoas vieram junto. */
export const joinResponseSchema = z
  .object({
    household: householdResponseSchema,
    moved: z
      .number()
      .int()
      .min(0)
      .meta({ description: 'Quantas pessoas suas passaram para a família.' }),
  })
  .meta({ id: 'JoinHouseholdResult' });

/** Corpo para passar a propriedade da família a outro responsável. */
export const transferInputSchema = z
  .object({
    guardianId: z.string().min(1).max(64).meta({
      description: 'Identificador do vínculo do responsável que passa a ser o dono.',
    }),
  })
  .meta({ id: 'TransferOwnershipInput' });

/** Identificador de um responsável na URL. */
export const guardianIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9-]{1,64}$/, 'Identificador de responsável inválido.')
  .meta({ example: 'b6f0c7e2-1f4a-4f5e-9d2b-2a7b1c3d4e5f' });

/** Papel de uma conta na família. */
export type GuardianRole = z.infer<typeof guardianRoleSchema>;
/** Um responsável pela família. */
export type GuardianResponse = z.infer<typeof guardianResponseSchema>;
/** A família de quem pergunta. */
export type HouseholdResponse = z.infer<typeof householdResponseSchema>;
/** Convite recém-gerado. */
export type InviteResponse = z.infer<typeof inviteResponseSchema>;
/** Corpo para entrar numa família. */
export type JoinInput = z.infer<typeof joinInputSchema>;
/** Resposta de entrar numa família. */
export type JoinResponse = z.infer<typeof joinResponseSchema>;
/** Corpo para passar a propriedade. */
export type TransferInput = z.infer<typeof transferInputSchema>;
