import type { MemberResponse } from '@vacina/shared';
import { useSession } from '../../session/session-provider';
import { useMembers } from '../data/hooks';

/**
 * Pessoa cuja carteira está aberta: a escolhida pelo usuário ou, se não houver escolha válida, a
 * primeira da família.
 */
export function useSelectedMember() {
  const { selectedMemberId, selectMember } = useSession();
  const members = useMembers();
  const items = members.data?.items ?? [];
  const selected: MemberResponse | undefined =
    items.find((member) => member.id === selectedMemberId) ?? items[0];
  return { members, items, selected, selectMember };
}
