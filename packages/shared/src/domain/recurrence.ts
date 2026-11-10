import { addDays, addMonths, compareCivilDates, type CivilDate } from './civil-date';

/** Unidades de tempo de uma vacina que se repete. */
export const RECURRENCE_UNITS = ['DAY', 'WEEK', 'MONTH', 'YEAR'] as const;

/** Unidade de tempo da repetição. */
export type RecurrenceUnit = (typeof RECURRENCE_UNITS)[number];

/**
 * De onde a próxima data é contada.
 *
 * - `APPLICATION`: da data em que a dose foi de fato aplicada ("6 meses depois de tomar").
 * - `SCHEDULE`: de uma grade fixa que parte da primeira data prevista ("todo ano em março"); tomar
 *   antes ou depois do prazo não desloca as datas seguintes.
 */
export const RECURRENCE_ANCHORS = ['APPLICATION', 'SCHEDULE'] as const;

/** Forma de contar a próxima data. */
export type RecurrenceAnchor = (typeof RECURRENCE_ANCHORS)[number];

/** Maior valor de "a cada N" aceito em cada unidade (evita períodos absurdos). */
export const RECURRENCE_MAX_EVERY: Readonly<Record<RecurrenceUnit, number>> = {
  DAY: 365,
  WEEK: 104,
  MONTH: 120,
  YEAR: 50,
};

/** Teto de doses de uma mesma série, mesmo sem limite informado; protege contra séries sem fim. */
export const MAX_SERIES_DOSES = 120;

/** Regra de repetição de uma dose, copiada de uma dose para a seguinte da mesma série. */
export interface RecurrenceRule {
  /** Unidade de tempo. */
  readonly unit: RecurrenceUnit;
  /** A cada quantas unidades a dose se repete (1 ou mais). */
  readonly every: number;
  /** De onde a próxima data é contada. */
  readonly anchor: RecurrenceAnchor;
  /** Primeira data prevista da série; é o ponto de partida da grade em `SCHEDULE`. */
  readonly anchorDate: CivilDate;
  /** Data limite: nenhuma dose é criada depois dela. `null` quando não há. */
  readonly endDate: CivilDate | null;
  /** Total de doses da série, contando a primeira. `null` quando não há limite. */
  readonly maxDoses: number | null;
}

/** O que a regra precisa saber da dose recém-aplicada para calcular a próxima. */
export interface RecurrenceContext {
  /** Número da dose na série (1 é a primeira). */
  readonly occurrence: number;
  /** Data prevista da dose que acabou de ser aplicada. */
  readonly dueDate: CivilDate;
  /** Data em que a dose foi aplicada. */
  readonly appliedDate: CivilDate;
}

/**
 * Soma `every` períodos a uma data civil. Em meses e anos, quando o dia não existe no destino
 * (31/01 + 1 mês, 29/02 + 1 ano), usa o último dia do mês.
 *
 * @param date - Data de partida.
 * @param unit - Unidade de tempo.
 * @param every - Quantidade de períodos; inteiro maior ou igual a 1.
 * @returns A nova data civil.
 * @throws RangeError se a data for inválida ou a quantidade não for um inteiro positivo.
 */
export function addPeriod(date: CivilDate, unit: RecurrenceUnit, every: number): CivilDate {
  if (!Number.isInteger(every) || every < 1) {
    throw new RangeError('A quantidade de períodos deve ser um inteiro positivo.');
  }
  switch (unit) {
    case 'DAY':
      return addDays(date, every);
    case 'WEEK':
      return addDays(date, every * 7);
    case 'MONTH':
      return addMonths(date, every);
    case 'YEAR':
      return addMonths(date, every * 12);
  }
}

/**
 * Calcula a data prevista da próxima dose de uma série, ou `null` quando a série termina.
 *
 * A série termina quando a dose aplicada é a última permitida (limite de doses informado ou o teto
 * {@link MAX_SERIES_DOSES}) ou quando a próxima data passaria da data final.
 *
 * Em `APPLICATION` conta-se da data da aplicação. Em `SCHEDULE` usa-se a grade que parte de
 * `anchorDate` (a n-ésima data é `anchorDate + n períodos`, calculada sempre a partir do início,
 * então o mês curto não desloca as datas seguintes) e escolhe-se a primeira data da grade **depois**
 * da aplicação e da data prevista: tomar antes do prazo não antecipa a próxima, e tomar com muito
 * atraso pula as datas que já passaram.
 *
 * Função pura: não lê o relógio.
 *
 * @param rule - Regra de repetição da série.
 * @param context - Número da dose e datas da dose aplicada.
 * @returns A data prevista da próxima dose; `null` se a série terminou.
 * @throws RangeError se `occurrence` não for um inteiro positivo ou alguma data for inválida.
 */
export function nextRecurrenceDate(
  rule: RecurrenceRule,
  context: RecurrenceContext,
): CivilDate | null {
  const { occurrence, dueDate, appliedDate } = context;
  if (!Number.isInteger(occurrence) || occurrence < 1) {
    throw new RangeError('O número da dose na série deve ser um inteiro positivo.');
  }
  const limit = Math.min(rule.maxDoses ?? MAX_SERIES_DOSES, MAX_SERIES_DOSES);
  if (occurrence >= limit) return null;

  let next: CivilDate;
  if (rule.anchor === 'APPLICATION') {
    next = addPeriod(appliedDate, rule.unit, rule.every);
  } else {
    const reference = compareCivilDates(appliedDate, dueDate) >= 0 ? appliedDate : dueDate;
    let step = 1;
    next = addPeriod(rule.anchorDate, rule.unit, rule.every * step);
    while (compareCivilDates(next, reference) <= 0) {
      step += 1;
      next = addPeriod(rule.anchorDate, rule.unit, rule.every * step);
    }
  }

  if (rule.endDate !== null && compareCivilDates(next, rule.endDate) > 0) return null;
  return next;
}
