import {
  accountInfoSchema,
  assistantResponseSchema,
  authSessionSchema,
  consentInputSchema,
  consentResponseSchema,
  doseResponseSchema,
  memberDosesResponseSchema,
  memberListResponseSchema,
  memberResponseSchema,
  type AssistantMessageInput,
  type ConsentInput,
  type LoginInput,
  type RegisterInput,
  type DoseEventInput,
  type MemberInput,
} from '@vacina/shared';
import { apiRequest, apiRequestNoContent, type ApiContext } from './client';

/**
 * Funções de cada endpoint da API. Os dados enviados já passam pelo esquema Zod do
 * `@vacina/shared` e as respostas são validadas pelo cliente (CLAUDE.md §7).
 */
export const endpoints = {
  register: (ctx: ApiContext, input: RegisterInput) =>
    apiRequest(
      ctx,
      { path: '/auth/register', method: 'POST', body: input, anonymous: true },
      authSessionSchema,
    ),

  login: (ctx: ApiContext, input: LoginInput) =>
    apiRequest(
      ctx,
      { path: '/auth/login', method: 'POST', body: input, anonymous: true },
      authSessionSchema,
    ),

  refreshSession: (ctx: ApiContext, refreshToken: string) =>
    apiRequest(
      ctx,
      { path: '/auth/refresh', method: 'POST', body: { refreshToken }, anonymous: true },
      authSessionSchema,
    ),

  logout: (ctx: ApiContext, refreshToken: string) =>
    apiRequestNoContent(ctx, {
      path: '/auth/logout',
      method: 'POST',
      body: { refreshToken },
      anonymous: true,
    }),

  getMe: (ctx: ApiContext, signal?: AbortSignal) =>
    apiRequest(ctx, { path: '/auth/me', ...(signal ? { signal } : {}) }, accountInfoSchema),

  getConsent: (ctx: ApiContext, signal?: AbortSignal) =>
    apiRequest(ctx, { path: '/consent', ...(signal ? { signal } : {}) }, consentResponseSchema),

  acceptConsent: (ctx: ApiContext, input: ConsentInput) =>
    apiRequest(
      ctx,
      { path: '/consent', method: 'PUT', body: consentInputSchema.parse(input) },
      consentResponseSchema,
    ),

  deleteAccount: (ctx: ApiContext) =>
    apiRequestNoContent(ctx, { path: '/account', method: 'DELETE' }),

  listMembers: (ctx: ApiContext, signal?: AbortSignal) =>
    apiRequest(ctx, { path: '/members', ...(signal ? { signal } : {}) }, memberListResponseSchema),

  createMember: (ctx: ApiContext, input: MemberInput) =>
    apiRequest(ctx, { path: '/members', method: 'POST', body: input }, memberResponseSchema),

  updateMember: (ctx: ApiContext, id: string, input: MemberInput) =>
    apiRequest(
      ctx,
      { path: `/members/${encodeURIComponent(id)}`, method: 'PUT', body: input },
      memberResponseSchema,
    ),

  deleteMember: (ctx: ApiContext, id: string) =>
    apiRequestNoContent(ctx, { path: `/members/${encodeURIComponent(id)}`, method: 'DELETE' }),

  getMemberDoses: (ctx: ApiContext, id: string, signal?: AbortSignal) =>
    apiRequest(
      ctx,
      { path: `/members/${encodeURIComponent(id)}/doses`, ...(signal ? { signal } : {}) },
      memberDosesResponseSchema,
    ),

  getDose: (ctx: ApiContext, id: string, signal?: AbortSignal) =>
    apiRequest(
      ctx,
      { path: `/doses/${encodeURIComponent(id)}`, ...(signal ? { signal } : {}) },
      doseResponseSchema,
    ),

  sendDoseEvent: (ctx: ApiContext, id: string, event: DoseEventInput) =>
    apiRequest(
      ctx,
      { path: `/doses/${encodeURIComponent(id)}/events`, method: 'POST', body: event },
      doseResponseSchema,
    ),

  sendAssistantMessage: (ctx: ApiContext, input: AssistantMessageInput) =>
    apiRequest(
      ctx,
      { path: '/assistant/message', method: 'POST', body: input },
      assistantResponseSchema,
    ),

  sendAssistantVoice: (ctx: ApiContext, wav: Uint8Array) =>
    apiRequest(
      ctx,
      {
        path: '/assistant/voice',
        method: 'POST',
        binary: { data: wav, contentType: 'audio/wav' },
      },
      assistantResponseSchema,
    ),
} as const;
