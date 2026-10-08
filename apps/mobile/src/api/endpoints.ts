import {
  accountInfoSchema,
  reminderListResponseSchema,
  reminderPreferencesInputSchema,
  reminderPreferencesResponseSchema,
  type ReminderPreferencesInput,
  assistantResponseSchema,
  authSessionSchema,
  type CustomDoseInput,
  consentInputSchema,
  consentResponseSchema,
  doseResponseSchema,
  memberDosesResponseSchema,
  memberListResponseSchema,
  memberResponseSchema,
  nearbyUnitsResponseSchema,
  type NearbyUnitsQuery,
  type AssistantMessageInput,
  type ConsentInput,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
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

  forgotPassword: (ctx: ApiContext, input: ForgotPasswordInput) =>
    apiRequestNoContent(ctx, {
      path: '/auth/forgot-password',
      method: 'POST',
      body: input,
      anonymous: true,
    }),

  resetPassword: (ctx: ApiContext, input: ResetPasswordInput) =>
    apiRequestNoContent(ctx, {
      path: '/auth/reset-password',
      method: 'POST',
      body: input,
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

  /**
   * Unidades básicas de saúde perto de uma posição (RF10). A posição vai arredondada para 3 casas
   * decimais (cerca de 110 m): basta para achar o posto e revela menos.
   */
  getNearbyUnits: (ctx: ApiContext, query: NearbyUnitsQuery, signal?: AbortSignal) => {
    const round = (value: number) => Math.round(value * 1000) / 1000;
    const params = `lat=${round(query.lat)}&lon=${round(query.lon)}&radiusKm=${query.radiusKm}&limit=${query.limit}`;
    return apiRequest(
      ctx,
      { path: `/units/nearby?${params}`, ...(signal ? { signal } : {}) },
      nearbyUnitsResponseSchema,
    );
  },

  getReminders: (ctx: ApiContext, signal?: AbortSignal) =>
    apiRequest(
      ctx,
      { path: '/reminders', ...(signal ? { signal } : {}) },
      reminderListResponseSchema,
    ),

  setReminderPreferences: (ctx: ApiContext, input: ReminderPreferencesInput) =>
    apiRequest(
      ctx,
      {
        path: '/reminders/preferences',
        method: 'PUT',
        body: reminderPreferencesInputSchema.parse(input),
      },
      reminderPreferencesResponseSchema,
    ),

  deleteAccount: (ctx: ApiContext) =>
    apiRequestNoContent(ctx, { path: '/account', method: 'DELETE' }),

  listMembers: (ctx: ApiContext, signal?: AbortSignal) =>
    apiRequest(ctx, { path: '/members', ...(signal ? { signal } : {}) }, memberListResponseSchema),

  createMember: (ctx: ApiContext, input: MemberInput) =>
    apiRequest(ctx, { path: '/members', method: 'POST', body: input }, memberResponseSchema),

  createCustomDose: (ctx: ApiContext, memberId: string, input: CustomDoseInput) =>
    apiRequest(
      ctx,
      { path: `/members/${encodeURIComponent(memberId)}/doses`, method: 'POST', body: input },
      doseResponseSchema,
    ),

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
