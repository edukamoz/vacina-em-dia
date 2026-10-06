import {
  canBecomeOverdue,
  transitionDose,
  type CalendarDataset,
  type CalendarRule,
  type CivilDate,
  type DoseEventInput,
  type DoseResponse,
  type MemberDosesResponse,
} from '@vacina/shared';
import { civilToday, type Clock } from '../clock';
import type { DoseRepository, MemberRepository, StoredDose } from '../repositories/repositories';
import { failure, success, type Result } from './errors';
import { toDoseResponse, toMemberResponse, toSourceResponse } from './mappers';

/** Casos de uso de dose e do calendário de cada membro (RF03 e RF04). */
export interface DoseService {
  /** Calendário do membro: fonte e versão, o membro e as doses (com atrasos já atualizados). */
  listForMember(ownerId: string, memberId: string): Promise<Result<MemberDosesResponse>>;
  /** Busca uma dose do dono. */
  get(ownerId: string, id: string): Promise<Result<DoseResponse>>;
  /** Aplica um evento do usuário pela máquina de estados e grava o resultado. */
  applyEvent(ownerId: string, id: string, event: DoseEventInput): Promise<Result<DoseResponse>>;
}

/** Dependências do serviço, todas injetadas para testar sem rede. */
export interface DoseServiceDeps {
  readonly members: MemberRepository;
  readonly doses: DoseRepository;
  readonly clock: Clock;
  readonly calendar: CalendarDataset;
}

/**
 * Cria os casos de uso de dose. As regras de transição vivem no domínio (`@vacina/shared`); aqui se
 * busca a dose do dono, descobre o "hoje" pelo relógio injetado e grava o novo estado.
 *
 * **Rotina de prazo:** o atraso (T4 e T7) é aplicado sempre que as doses são lidas, pelo mesmo
 * ator `SCHEDULER` do domínio. Equivale à rotina diária por tempo: nunca parte do cliente, e o
 * resultado é o mesmo, porque depende só da data de hoje. Uma rotina agendada (gatilho de tempo)
 * entra com o banco, para sinalizar atrasos mesmo sem ninguém abrir o app (SCRUM-19).
 *
 * @param deps - Repositórios, relógio e calendário.
 */
export function createDoseService({
  members,
  doses,
  clock,
  calendar,
}: DoseServiceDeps): DoseService {
  const rules = new Map<string, CalendarRule>(calendar.rules.map((rule) => [rule.id, rule]));

  /** Marca como atrasadas as doses vencidas e grava só as que mudaram. */
  async function refreshOverdue(
    ownerId: string,
    list: readonly StoredDose[],
    today: CivilDate,
  ): Promise<readonly StoredDose[]> {
    const changed: StoredDose[] = [];
    const result = list.map((dose) => {
      const rule = rules.get(dose.ruleId);
      const eligible =
        dose.status === 'SCHEDULED' ||
        (dose.status === 'PENDING' && !!rule && canBecomeOverdue(rule));
      if (!eligible) return dose;
      const moved = transitionDose(dose, { type: 'MARK_OVERDUE' }, { today, actor: 'SCHEDULER' });
      if (!moved.ok) return dose;
      const updated: StoredDose = { ...dose, ...moved.dose };
      changed.push(updated);
      return updated;
    });
    if (changed.length > 0) await doses.saveMany(ownerId, changed);
    return result;
  }

  const respond = (dose: StoredDose): DoseResponse | undefined => {
    const rule = rules.get(dose.ruleId);
    return rule ? toDoseResponse(dose, rule, calendar) : undefined;
  };

  return {
    async listForMember(ownerId, memberId) {
      const member = await members.get(ownerId, memberId);
      if (!member) return failure({ code: 'NOT_FOUND' });
      const today = civilToday(clock);
      const fresh = await refreshOverdue(
        ownerId,
        await doses.listByMember(ownerId, memberId),
        today,
      );
      const order = new Map(calendar.rules.map((rule, index) => [rule.id, index]));
      const items = fresh
        .map(respond)
        .filter((dose): dose is DoseResponse => dose !== undefined)
        .sort(
          (a, b) =>
            a.dueDate.localeCompare(b.dueDate) ||
            (order.get(a.ruleId) ?? 0) - (order.get(b.ruleId) ?? 0),
        );
      return success({
        source: toSourceResponse(calendar),
        member: toMemberResponse(member, today),
        items,
      });
    },

    async get(ownerId, id) {
      const current = await doses.get(ownerId, id);
      if (!current) return failure({ code: 'NOT_FOUND' });
      const [fresh] = await refreshOverdue(ownerId, [current], civilToday(clock));
      const response = fresh ? respond(fresh) : undefined;
      return response ? success(response) : failure({ code: 'NOT_FOUND' });
    },

    async applyEvent(ownerId, id, event) {
      const current = await doses.get(ownerId, id);
      if (!current) return failure({ code: 'NOT_FOUND' });
      const today = civilToday(clock);
      // Atualiza o atraso antes: uma dose vencida precisa estar Atrasada para ser reagendada.
      const [fresh] = await refreshOverdue(ownerId, [current], today);
      const base = fresh ?? current;

      const result = transitionDose(base, event, { today, actor: 'USER' });
      if (!result.ok) return failure(result.error);

      const updated: StoredDose = { ...base, ...result.dose };
      await doses.saveMany(ownerId, [updated]);
      const response = respond(updated);
      return response ? success(response) : failure({ code: 'NOT_FOUND' });
    },
  };
}
