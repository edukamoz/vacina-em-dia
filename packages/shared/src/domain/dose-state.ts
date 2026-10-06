import type { CivilDate } from './civil-date';
import { compareCivilDates } from './civil-date';

/**
 * Estados do ciclo de vida de uma dose (RF04), conforme `docs/03-uml/estados-dose.md`.
 *
 * Os rótulos exibidos na interface são Pendente, Agendada, Atrasada, Aplicada e Cancelada.
 */
export const DOSE_STATUSES = ['PENDING', 'SCHEDULED', 'OVERDUE', 'APPLIED', 'CANCELLED'] as const;

/** Estado de uma dose. */
export type DoseStatus = (typeof DOSE_STATUSES)[number];

/** Identificadores das transições do diagrama de estados (T1 a T12). */
export type TransitionId =
  'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'T8' | 'T9' | 'T10' | 'T11' | 'T12';

/** Tipos de evento registrados no histórico da dose (`dose_event.event_type`). */
export type DoseEventType =
  'GENERATE' | 'SCHEDULE' | 'UNSCHEDULE' | 'RESCHEDULE' | 'APPLY' | 'MARK_OVERDUE' | 'CANCEL';

/** Quem provoca a mudança de estado: o usuário ou a rotina diária de prazo. */
export type Actor = 'USER' | 'SCHEDULER';

/**
 * Evento que tenta mudar o estado de uma dose.
 *
 * - `SCHEDULE`: primeiro agendamento (T2), a partir de Pendente.
 * - `UNSCHEDULE`: remove o agendamento (T8), a partir de Agendada.
 * - `RESCHEDULE`: reagenda uma dose atrasada (T10).
 * - `APPLY`: registra a aplicação (T3, T6 e T11).
 * - `MARK_OVERDUE`: atraso por prazo vencido (T4 e T7); **só a rotina** pode usá-lo.
 * - `CANCEL`: cancela a dose (T5, T9 e T12); exige confirmação.
 */
export type DoseEvent =
  | { readonly type: 'SCHEDULE'; readonly date: CivilDate }
  | { readonly type: 'UNSCHEDULE' }
  | { readonly type: 'RESCHEDULE'; readonly date: CivilDate }
  | { readonly type: 'APPLY'; readonly date: CivilDate }
  | { readonly type: 'MARK_OVERDUE' }
  | { readonly type: 'CANCEL'; readonly confirmed: boolean };

/** Dados da dose que a máquina de estados lê e devolve. */
export interface DoseSnapshot {
  /** Estado atual. */
  readonly status: DoseStatus;
  /** Data prevista pelo calendário. */
  readonly dueDate: CivilDate;
  /** Data agendada, quando houver. */
  readonly scheduledDate: CivilDate | null;
  /** Data da aplicação, quando houver. */
  readonly appliedDate: CivilDate | null;
}

/** Contexto de uma tentativa de transição. */
export interface TransitionContext {
  /** Data de hoje, recebida de fora para manter a regra pura e testável. */
  readonly today: CivilDate;
  /** Quem provoca o evento. */
  readonly actor: Actor;
}

/** Motivos de recusa por regra de data, de confirmação ou de origem do evento. */
export type GuardReason =
  'DATE_IN_PAST' | 'DATE_IN_FUTURE' | 'CONFIRMATION_REQUIRED' | 'SCHEDULER_ONLY' | 'NOT_OVERDUE';

/** Erro de transição: o evento não é permitido a partir do estado atual (HTTP 409). */
export interface InvalidTransitionError {
  readonly code: 'INVALID_TRANSITION';
  readonly from: DoseStatus;
  readonly event: DoseEvent['type'];
  /** Mensagem em português simples, segura para mostrar ao usuário. */
  readonly message: string;
}

/** Erro de regra: o evento é possível, mas uma condição não foi atendida (HTTP 422). */
export interface GuardViolationError {
  readonly code: 'GUARD_VIOLATION';
  readonly reason: GuardReason;
  readonly from: DoseStatus;
  readonly event: DoseEvent['type'];
  /** Mensagem em português simples, segura para mostrar ao usuário. */
  readonly message: string;
}

/** Erros possíveis de uma transição. */
export type TransitionError = InvalidTransitionError | GuardViolationError;

/** Resultado de uma tentativa de transição: o novo estado ou um erro, nunca uma exceção. */
export type TransitionResult =
  | {
      readonly ok: true;
      readonly dose: DoseSnapshot;
      readonly transition: TransitionId;
      readonly eventType: DoseEventType;
    }
  | { readonly ok: false; readonly error: TransitionError };

type Rule = { readonly to: DoseStatus; readonly id: TransitionId };

/** Tabela das transições válidas: evento, estado de origem, estado de destino e identificador. */
const RULES: Record<DoseEvent['type'], Partial<Record<DoseStatus, Rule>>> = {
  SCHEDULE: { PENDING: { to: 'SCHEDULED', id: 'T2' } },
  UNSCHEDULE: { SCHEDULED: { to: 'PENDING', id: 'T8' } },
  RESCHEDULE: { OVERDUE: { to: 'SCHEDULED', id: 'T10' } },
  APPLY: {
    PENDING: { to: 'APPLIED', id: 'T3' },
    SCHEDULED: { to: 'APPLIED', id: 'T6' },
    OVERDUE: { to: 'APPLIED', id: 'T11' },
  },
  MARK_OVERDUE: {
    PENDING: { to: 'OVERDUE', id: 'T4' },
    SCHEDULED: { to: 'OVERDUE', id: 'T7' },
  },
  CANCEL: {
    PENDING: { to: 'CANCELLED', id: 'T5' },
    SCHEDULED: { to: 'CANCELLED', id: 'T9' },
    OVERDUE: { to: 'CANCELLED', id: 'T12' },
  },
};

const GUARD_MESSAGES: Record<GuardReason, string> = {
  DATE_IN_PAST: 'Escolha uma data de hoje em diante.',
  DATE_IN_FUTURE: 'A data da aplicação não pode ser no futuro.',
  CONFIRMATION_REQUIRED: 'Confirme para continuar.',
  SCHEDULER_ONLY: 'Esta mudança é feita automaticamente pelo sistema.',
  NOT_OVERDUE: 'A data ainda não passou.',
};

function guard(from: DoseStatus, event: DoseEvent['type'], reason: GuardReason): TransitionResult {
  return {
    ok: false,
    error: { code: 'GUARD_VIOLATION', reason, from, event, message: GUARD_MESSAGES[reason] },
  };
}

/**
 * Gera uma dose nova, ainda sem data marcada (T1: inicial para Pendente).
 *
 * @param dueDate - Data prevista, calculada a partir do calendário e da data de nascimento.
 * @returns A dose no estado Pendente.
 */
export function createDose(dueDate: CivilDate): DoseSnapshot {
  return { status: 'PENDING', dueDate, scheduledDate: null, appliedDate: null };
}

/**
 * Tenta mudar o estado de uma dose. É uma função pura: não lê o relógio, não altera o argumento e
 * não lança exceção; devolve o novo estado ou um erro.
 *
 * Primeiro confere se o evento é permitido no estado atual (erro de transição, HTTP 409). Depois
 * confere as regras de data, de confirmação e de origem (erro de regra, HTTP 422).
 *
 * @param dose - Estado atual da dose.
 * @param event - Evento a aplicar.
 * @param context - "Hoje" e quem provoca o evento.
 * @returns O resultado da tentativa; em caso de erro, a dose original permanece como estava.
 */
export function transitionDose(
  dose: DoseSnapshot,
  event: DoseEvent,
  context: TransitionContext,
): TransitionResult {
  const rule = RULES[event.type][dose.status];
  if (!rule) {
    return {
      ok: false,
      error: {
        code: 'INVALID_TRANSITION',
        from: dose.status,
        event: event.type,
        message: 'Esta ação não é possível para a situação atual da dose.',
      },
    };
  }

  const { today, actor } = context;
  switch (event.type) {
    case 'SCHEDULE':
    case 'RESCHEDULE':
      if (compareCivilDates(event.date, today) < 0) {
        return guard(dose.status, event.type, 'DATE_IN_PAST');
      }
      return ok(dose, rule, 'SCHEDULED' as const, { scheduledDate: event.date }, event.type);
    case 'UNSCHEDULE':
      return ok(dose, rule, 'PENDING' as const, { scheduledDate: null }, event.type);
    case 'APPLY':
      if (compareCivilDates(event.date, today) > 0) {
        return guard(dose.status, event.type, 'DATE_IN_FUTURE');
      }
      return ok(dose, rule, 'APPLIED' as const, { appliedDate: event.date }, event.type);
    case 'MARK_OVERDUE': {
      if (actor !== 'SCHEDULER') return guard(dose.status, event.type, 'SCHEDULER_ONLY');
      const reference = dose.status === 'SCHEDULED' ? dose.scheduledDate : dose.dueDate;
      if (reference === null || compareCivilDates(reference, today) >= 0) {
        return guard(dose.status, event.type, 'NOT_OVERDUE');
      }
      return ok(dose, rule, 'OVERDUE' as const, {}, event.type);
    }
    case 'CANCEL':
      if (!event.confirmed) return guard(dose.status, event.type, 'CONFIRMATION_REQUIRED');
      return ok(dose, rule, 'CANCELLED' as const, {}, event.type);
  }
}

function ok(
  dose: DoseSnapshot,
  rule: Rule,
  status: DoseStatus,
  changes: Partial<Pick<DoseSnapshot, 'scheduledDate' | 'appliedDate'>>,
  eventType: DoseEventType,
): TransitionResult {
  return {
    ok: true,
    dose: { ...dose, ...changes, status },
    transition: rule.id,
    eventType,
  };
}
