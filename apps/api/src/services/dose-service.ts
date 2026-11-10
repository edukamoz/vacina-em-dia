import {
  canBecomeOverdue,
  compareCivilDates,
  createDose,
  nextRecurrenceDate,
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
import {
  toCustomDoseResponse,
  toDoseResponse,
  toMemberResponse,
  toSourceResponse,
} from './mappers';

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
  /** Gera o identificador da próxima dose de uma série que se repete. */
  readonly newId: () => string;
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
  newId,
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
      const rule = dose.ruleId === null ? undefined : rules.get(dose.ruleId);
      // Dose avulsa tem sempre uma data prevista; a oficial só atrasa se a regra tem idade fixa.
      const eligible =
        dose.status === 'SCHEDULED' ||
        (dose.status === 'PENDING' && (dose.ruleId === null || (!!rule && canBecomeOverdue(rule))));
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

  /**
   * Cria a próxima dose de uma série que se repete, ou `undefined` quando a série terminou.
   *
   * Ao aplicar, a conta parte da data da aplicação. Ao cancelar só esta dose, a dose é "pulada": a
   * conta parte da data prevista dela (ou de hoje, se já passou), para a próxima não nascer vencida.
   * Não cria nada se a próxima já existe (aplicação repetida ou concorrente).
   */
  async function nextInSeries(
    ownerId: string,
    done: StoredDose,
    event: DoseEventInput,
    today: CivilDate,
  ): Promise<StoredDose | undefined> {
    const { recurrence, seriesId, occurrence } = done;
    if (!recurrence || !seriesId || !occurrence) return undefined;
    const appliedDate =
      event.type === 'APPLY'
        ? event.date
        : compareCivilDates(done.dueDate, today) >= 0
          ? done.dueDate
          : today;
    const dueDate = nextRecurrenceDate(recurrence, {
      occurrence,
      dueDate: done.dueDate,
      appliedDate,
    });
    if (dueDate === null) return undefined;
    const siblings = await doses.listByMember(ownerId, done.memberId);
    if (siblings.some((d) => d.seriesId === seriesId && d.occurrence === occurrence + 1)) {
      return undefined;
    }
    return {
      id: newId(),
      memberId: done.memberId,
      ruleId: null,
      custom: done.custom ?? null,
      ...createDose(dueDate),
      remindDaysBefore: done.remindDaysBefore ?? null,
      recurrence,
      seriesId,
      occurrence: occurrence + 1,
    };
  }

  const respond = (dose: StoredDose): DoseResponse | undefined => {
    if (dose.ruleId === null) return toCustomDoseResponse(dose);
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
            (order.get(a.ruleId ?? '') ?? 0) - (order.get(b.ruleId ?? '') ?? 0),
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

      let updated: StoredDose = { ...base, ...result.dose };
      let next: StoredDose | undefined;
      if (updated.recurrence && updated.seriesId && updated.occurrence) {
        if (event.type === 'CANCEL' && event.scope === 'SERIES') {
          updated = { ...updated, recurrence: null };
        } else if (event.type === 'APPLY' || event.type === 'CANCEL') {
          next = await nextInSeries(ownerId, updated, event, today);
        }
      }
      // A dose e a próxima são gravadas juntas: não sobra série sem a próxima dose.
      await doses.saveMany(ownerId, next ? [updated, next] : [updated]);
      const response = respond(updated);
      return response ? success(response) : failure({ code: 'NOT_FOUND' });
    },
  };
}
