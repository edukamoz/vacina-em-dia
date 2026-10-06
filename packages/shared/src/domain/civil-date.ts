/**
 * Data civil no formato `AAAA-MM-DD`, sem horário e sem fuso.
 *
 * As regras de dose trabalham com datas do calendário brasileiro, e não com instantes. Usar texto
 * ISO evita erros de fuso e permite comparar datas por ordem alfabética.
 */
export type CivilDate = string;

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Indica se o texto é uma data civil real (`AAAA-MM-DD`), conferindo mês, dia e anos bissextos.
 *
 * @param value - Texto a conferir.
 * @returns `true` quando o texto representa uma data existente no calendário.
 */
export function isValidCivilDate(value: string): boolean {
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/**
 * Compara duas datas civis válidas.
 *
 * @param a - Primeira data.
 * @param b - Segunda data.
 * @returns Número negativo se `a` for anterior a `b`, zero se forem iguais, positivo se posterior.
 */
export function compareCivilDates(a: CivilDate, b: CivilDate): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Soma (ou subtrai) dias a uma data civil válida, sem depender do relógio.
 *
 * @param date - Data de partida.
 * @param days - Quantidade de dias; negativa para voltar no tempo.
 * @returns A nova data civil.
 */
export function addDays(date: CivilDate, days: number): CivilDate {
  const match = CIVIL_DATE_PATTERN.exec(date);
  if (!match) throw new RangeError('Data civil inválida.');
  const base = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days);
  return new Date(base).toISOString().slice(0, 10);
}
