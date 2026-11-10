import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CivilDate,
  ConsentInput,
  CustomDoseInput,
  DoseEventInput,
  JoinInput,
  MemberInput,
  ProfilePhoto,
  TransferInput,
} from '@vacina/shared';
import { ApiRequestError } from '../../api/client';
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

/** Baixa a carteira de vacinação de uma pessoa em PDF (RF11): devolve os bytes do arquivo. */
export function useBaixarCarteiraPdf(memberId: string) {
  const { api } = useSession();
  return useMutation({ mutationFn: () => endpoints.downloadCarteiraPdf(api, memberId) });
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

/** Uma dose a marcar como aplicada, com a data confirmada pela pessoa. */
export interface AplicacaoEmLote {
  readonly id: string;
  readonly data: CivilDate;
}

/** Resultado de registrar várias aplicações: quantas deram certo e quais doses falharam. */
export interface ResultadoDoLote {
  readonly aplicadas: number;
  readonly falhas: readonly string[];
}

/**
 * Marca várias doses como aplicadas, uma de cada vez (cada uma passa pelas mesmas regras do ciclo
 * de vida). Uma falha não impede as outras: o resultado diz quantas deram certo e quais não. No
 * fim, atualiza as telas que mostram doses e lembretes.
 */
export function useAplicarDoses() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (itens: readonly AplicacaoEmLote[]): Promise<ResultadoDoLote> => {
      let aplicadas = 0;
      const falhas: string[] = [];
      for (const item of itens) {
        try {
          await endpoints.sendDoseEvent(api, item.id, { type: 'APPLY', date: item.data });
          aplicadas += 1;
        } catch {
          falhas.push(item.id);
        }
      }
      return { aplicadas, falhas };
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ['member-doses'] });
      await client.invalidateQueries({ queryKey: ['dose'] });
      await client.invalidateQueries({ queryKey: ['reminders'] });
    },
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

/**
 * Novidades de saúde: títulos e links das notícias do Ministério da Saúde. A API já guarda uma
 * cópia por uma hora, então o app só repete a consulta depois de 30 minutos e não insiste se falhar.
 */
export function useNews() {
  const { api } = useSession();
  return useQuery({
    queryKey: ['news'],
    queryFn: ({ signal }) => endpoints.getNews(api, signal),
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}

/**
 * Quando o calendário oficial foi conferido com o portal do Ministério (vigia, B72). É um detalhe
 * do rodapé da fonte: a consulta é pública, guardada por 6 horas e, se falhar, o rodapé só some.
 */
export function useConferenciaDoCalendario() {
  const { api } = useSession();
  return useQuery({
    queryKey: ['calendar-watch'],
    queryFn: ({ signal }) => endpoints.getCalendarWatch(api, signal),
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
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

/** Foto de perfil da conta: a foto, ou `null` quando a conta ainda não tem uma. */
export function useProfilePhoto() {
  const { api } = useSession();
  return useQuery({
    queryKey: ['profile-photo'],
    queryFn: async ({ signal }): Promise<ProfilePhoto | null> => {
      try {
        return await endpoints.getProfilePhoto(api, signal);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 404) return null;
        throw error;
      }
    },
    // A foto é dado pessoal e pesa mais que o resto: não fica guardada além da sessão.
    staleTime: 5 * 60 * 1000,
  });
}

/** Guarda (ou troca) a foto de perfil e já a mostra, sem nova busca. */
export function useSaveProfilePhoto() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (photo: ProfilePhoto) => endpoints.putProfilePhoto(api, photo),
    onSuccess: (_resultado, photo) => client.setQueryData(['profile-photo'], photo),
  });
}

/** Remove a foto de perfil. */
export function useRemoveProfilePhoto() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => endpoints.deleteProfilePhoto(api),
    onSuccess: () => client.setQueryData(['profile-photo'], null),
  });
}

/** A família da conta e os responsáveis (B15, ADR-029). */
export function useHousehold() {
  const { api } = useSession();
  return useQuery({
    queryKey: ['household'],
    queryFn: ({ signal }) => endpoints.getHousehold(api, signal),
  });
}

/**
 * Atualiza tudo o que depende de quem está na família: a lista de responsáveis e, como entrar,
 * sair ou ser removido muda quais pessoas aparecem, as pessoas, as doses e os lembretes.
 */
async function refreshAfterHouseholdChange(client: ReturnType<typeof useQueryClient>) {
  await client.invalidateQueries({ queryKey: ['household'] });
  await client.invalidateQueries({ queryKey: ['members'] });
  await client.invalidateQueries({ queryKey: ['member-doses'] });
  await client.invalidateQueries({ queryKey: ['reminders'] });
}

/** O dono gera um convite; o código só vem nesta resposta. */
export function useCreateHouseholdInvite() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => endpoints.createHouseholdInvite(api),
    onSuccess: () => client.invalidateQueries({ queryKey: ['household'] }),
  });
}

/** O dono cancela os convites ainda não usados. */
export function useRevokeHouseholdInvites() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => endpoints.revokeHouseholdInvites(api),
    onSuccess: () => client.invalidateQueries({ queryKey: ['household'] }),
  });
}

/** Entra numa família com um código de convite. */
export function useJoinHousehold() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: JoinInput) => endpoints.joinHousehold(api, input),
    onSuccess: () => refreshAfterHouseholdChange(client),
  });
}

/** Sai da família. */
export function useLeaveHousehold() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => endpoints.leaveHousehold(api),
    onSuccess: () => refreshAfterHouseholdChange(client),
  });
}

/** O dono remove um responsável. */
export function useRemoveGuardian() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (guardianId: string) => endpoints.removeGuardian(api, guardianId),
    onSuccess: () => refreshAfterHouseholdChange(client),
  });
}

/** O dono passa a propriedade a outro responsável. */
export function useTransferHousehold() {
  const { api } = useSession();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: TransferInput) => endpoints.transferHousehold(api, input),
    onSuccess: () => refreshAfterHouseholdChange(client),
  });
}
