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

/**
 * Soma meses a uma data civil válida. Quando o dia não existe no mês de destino (por exemplo,
 * 31 de janeiro mais um mês), usa o último dia desse mês.
 *
 * @param date - Data de partida.
 * @param months - Quantidade de meses; negativa para voltar no tempo.
 * @returns A nova data civil.
 * @throws RangeError se a data de partida não for uma data civil válida.
 */
export function addMonths(date: CivilDate, months: number): CivilDate {
  const match = CIVIL_DATE_PATTERN.exec(date);
  if (!match || !isValidCivilDate(date)) throw new RangeError('Data civil inválida.');
  const day = Number(match[3]);
  const total = Number(match[1]) * 12 + (Number(match[2]) - 1) + months;
  const year = Math.floor(total / 12);
  const month = total - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

/**
 * Calcula a idade em meses completos numa data. Usa a mesma regra de {@link addMonths}, então
 * `addMonths(nascimento, idade) <= hoje` sempre vale.
 *
 * @param birthDate - Data de nascimento.
 * @param today - Data de referência (recebida de fora para manter a regra pura).
 * @returns Meses completos de vida; zero se a data de referência for anterior ao nascimento.
 * @throws RangeError se alguma data não for uma data civil válida.
 */
export function ageInMonths(birthDate: CivilDate, today: CivilDate): number {
  const birth = CIVIL_DATE_PATTERN.exec(birthDate);
  const now = CIVIL_DATE_PATTERN.exec(today);
  if (!birth || !now || !isValidCivilDate(birthDate) || !isValidCivilDate(today)) {
    throw new RangeError('Data civil inválida.');
  }
  let months = (Number(now[1]) - Number(birth[1])) * 12 + (Number(now[2]) - Number(birth[2]));
  while (months > 0 && compareCivilDates(addMonths(birthDate, months), today) > 0) months -= 1;
  return Math.max(months, 0);
}
