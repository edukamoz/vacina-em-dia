import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ConsentInput, CustomDoseInput, DoseEventInput, MemberInput } from '@vacina/shared';
import { endpoints } from '../../api/endpoints';
import { useSession } from '../../session/session-provider';

/** Consentimento do usuário (RF09). */
export function useConsent() {
  const { api } = useSession();
  return useQuery({
    queryKey: ['consent'],
    queryFn: ({ signal }) => endpoints.getConsent(api, signal),
  });
}

/** Registra o consentimento e já atualiza o cache, sem nova busca. */
export function useAcceptConsent() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: ConsentInput) => endpoints.acceptConsent(api, input),
    onSuccess: (consent) => client.setQueryData(['consent'], consent),
  });
}

/** Membros da família (RF02). */
export function useMembers() {
  const { api } = useSession();
  return useQuery({
    queryKey: ['members'],
    queryFn: ({ signal }) => endpoints.listMembers(api, signal),
  });
}

/** Cadastra um membro e atualiza a lista. */
export function useCreateMember() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberInput) => endpoints.createMember(api, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['members'] }),
  });
}

/** Cadastra uma dose avulsa de um membro; o calendário dele é recarregado. */
export function useCreateCustomDose(memberId: string) {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomDoseInput) => endpoints.createCustomDose(api, memberId, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['member-doses', memberId] });
      await client.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

/** Edita um membro; as doses do calendário dele são recarregadas. */
export function useUpdateMember(id: string) {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: MemberInput) => endpoints.updateMember(api, id, input),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['members'] });
      await client.invalidateQueries({ queryKey: ['member-doses', id] });
      await client.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

/** Exclui um membro (e as doses dele) e atualiza a lista. */
export function useDeleteMember() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => endpoints.deleteMember(api, id),
    onSuccess: () => client.invalidateQueries({ queryKey: ['members'] }),
  });
}

/** Calendário vacinal de um membro (RF03 e RF04); só busca quando há um membro escolhido. */
export function useMemberDoses(memberId: string | null) {
  const { api } = useSession();
  return useQuery({
    queryKey: ['member-doses', memberId],
    queryFn: ({ signal }) => endpoints.getMemberDoses(api, memberId ?? '', signal),
    enabled: memberId !== null,
  });
}

/**
 * Calendário de várias pessoas de uma vez (para o resumo da aba Família). Usa a mesma chave de
 * cache de `useMemberDoses`, então abrir a pessoa depois não busca de novo.
 */
export function useDosesOfMembers(memberIds: readonly string[]) {
  const { api } = useSession();
  return useQueries({
    queries: memberIds.map((id) => ({
      queryKey: ['member-doses', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => endpoints.getMemberDoses(api, id, signal),
    })),
  });
}

/** Uma dose pelo identificador. */
export function useDose(id: string) {
  const { api } = useSession();
  return useQuery({
    queryKey: ['dose', id],
    queryFn: ({ signal }) => endpoints.getDose(api, id, signal),
  });
}

/** Aplica um evento do ciclo de vida à dose e atualiza as telas que a mostram. */
export function useDoseEvent(id: string) {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (event: DoseEventInput) => endpoints.sendDoseEvent(api, id, event),
    onSuccess: async (dose) => {
      client.setQueryData(['dose', id], dose);
      await client.invalidateQueries({ queryKey: ['member-doses'] });
      await client.invalidateQueries({ queryKey: ['reminders'] });
    },
  });
}

/** Lembretes de hoje (RF05): doses atrasadas, de hoje e dos próximos 7 dias, de toda a família. */
export function useReminders() {
  const { api } = useSession();
  return useQuery({
    queryKey: ['reminders'],
    queryFn: ({ signal }) => endpoints.getReminders(api, signal),
  });
}

/** Liga ou desliga os lembretes por e-mail e atualiza a lista. */
export function useSetEmailReminders() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (emailEnabled: boolean) => endpoints.setReminderPreferences(api, { emailEnabled }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['reminders'] }),
  });
}

/** Exclui a conta e todos os dados; limpa tudo o que estava em cache. */
export function useDeleteAccount() {
  const { api, selectMember } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => endpoints.deleteAccount(api),
    onSuccess: () => {
      selectMember(null);
      client.clear();
    },
  });
}
