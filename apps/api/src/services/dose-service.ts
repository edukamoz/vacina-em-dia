import {
  canBecomeOverdue,
  compareCivilDates,
  createDose,
  nextRecurrenceDate,
  officialRecurrenceRule,
  transitionDose,
  type CalendarDataset,
  type CalendarRule,
  type CivilDate,
  type RecurrenceRule,
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

  /** A série a que a dose pertence: a regra de repetição e a posição dela nela. */
  interface Series {
    readonly rule: RecurrenceRule;
    readonly seriesId: string;
    readonly occurrence: number;
    /** Verdadeiro quando a repetição vem da linha do calendário oficial (e não da própria dose). */
    readonly official: boolean;
  }

  /**
   * Descobre se a dose se repete. Na dose avulsa, a regra está guardada na própria dose; na oficial,
   * ela vem da linha do calendário (só as linhas em que o texto oficial diz a periodicidade) e a
   * série ganha identificador na primeira aplicação.
   */
  async function seriesOf(ownerId: string, dose: StoredDose): Promise<Series | undefined> {
    if (dose.ruleId === null) {
      const { recurrence, seriesId, occurrence } = dose;
      return recurrence && seriesId && occurrence
        ? { rule: recurrence, seriesId, occurrence, official: false }
        : undefined;
    }
    const calendarRule = rules.get(dose.ruleId);
    if (!calendarRule?.recurrence) return undefined;
    const member = await members.get(ownerId, dose.memberId);
    if (!member) return undefined;
    const rule = officialRecurrenceRule(calendarRule, member.birthDate, dose.dueDate);
    return rule
      ? {
          rule,
          seriesId: dose.seriesId ?? newId(),
          occurrence: dose.occurrence ?? 1,
          official: true,
        }
      : undefined;
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
    series: Series,
    event: DoseEventInput,
    today: CivilDate,
  ): Promise<StoredDose | undefined> {
    const { rule, seriesId, occurrence } = series;
    const appliedDate =
      event.type === 'APPLY'
        ? event.date
        : compareCivilDates(done.dueDate, today) >= 0
          ? done.dueDate
          : today;
    const dueDate = nextRecurrenceDate(rule, { occurrence, dueDate: done.dueDate, appliedDate });
    if (dueDate === null) return undefined;
    const siblings = await doses.listByMember(ownerId, done.memberId);
    if (siblings.some((d) => d.seriesId === seriesId && d.occurrence === occurrence + 1)) {
      return undefined;
    }
    return {
      id: newId(),
      memberId: done.memberId,
      ruleId: done.ruleId,
      // Dose avulsa leva o nome e a regra; a oficial vem da linha do calendário e não guarda a regra.
      ...(done.ruleId === null ? { custom: done.custom ?? null, recurrence: rule } : {}),
      ...createDose(dueDate),
      remindDaysBefore: done.remindDaysBefore ?? null,
      seriesId,
      occurrence: occurrence + 1,
    };
  }

  /** Resposta de uma dose; `birthDate` só importa para a repetição com limite de idade. */
  const respond = (dose: StoredDose, birthDate?: CivilDate): DoseResponse | undefined => {
    if (dose.ruleId === null) return toCustomDoseResponse(dose);
    const rule = rules.get(dose.ruleId);
    return rule ? toDoseResponse(dose, rule, calendar, birthDate) : undefined;
  };

  /** Nascimento da pessoa, só quando a repetição da linha tem limite de idade (evita uma consulta). */
  async function birthDateIfNeeded(
    ownerId: string,
    dose: StoredDose,
  ): Promise<CivilDate | undefined> {
    const rule = dose.ruleId === null ? undefined : rules.get(dose.ruleId);
    if (rule?.recurrence?.endsAtAgeMonths == null) return undefined;
    return (await members.get(ownerId, dose.memberId))?.birthDate;
  }

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
        .map((dose) => respond(dose, member.birthDate))
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
      const response = fresh ? respond(fresh, await birthDateIfNeeded(ownerId, fresh)) : undefined;
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
      const series = await seriesOf(ownerId, updated);
      if (series) {
        if (event.type === 'CANCEL' && event.scope === 'SERIES') {
          // Dose avulsa guarda a regra e a perde; a oficial só não cria a próxima.
          if (!series.official) updated = { ...updated, recurrence: null };
        } else if (event.type === 'APPLY' || event.type === 'CANCEL') {
          next = await nextInSeries(ownerId, updated, series, event, today);
          // A oficial ganha o identificador da série e o número na primeira aplicação.
          if (series.official) {
            updated = { ...updated, seriesId: series.seriesId, occurrence: series.occurrence };
          }
        }
      }
      // A dose e a próxima são gravadas juntas: não sobra série sem a próxima dose.
      await doses.saveMany(ownerId, next ? [updated, next] : [updated]);
      const response = respond(updated, await birthDateIfNeeded(ownerId, updated));
      return response ? success(response) : failure({ code: 'NOT_FOUND' });
    },
  };
}
