import type { CivilDate } from '@vacina/shared';

/** Um mês do calendário (`month` de 1 a 12). */
export interface Month {
  readonly year: number;
  readonly month: number;
}

const NOMES_DOS_MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** Monta a data civil `AAAA-MM-DD` de um dia de um mês. */
export function civilOf({ year, month }: Month, day: number): CivilDate {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Mês de uma data civil. */
export function monthOf(date: CivilDate): Month {
  return { year: Number(date.slice(0, 4)), month: Number(date.slice(5, 7)) };
}

/** Mês deslocado em `delta` meses (negativo volta no tempo). */
export function addMonths({ year, month }: Month, delta: number): Month {
  const indice = year * 12 + (month - 1) + delta;
  return { year: Math.floor(indice / 12), month: (indice % 12) + 1 };
}

/** Quantos dias o mês tem (conta os anos bissextos). */
export function daysInMonth({ year, month }: Month): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Grade do mês em semanas que começam no domingo. Os dias de fora do mês vêm como `null`, para a
 * primeira e a última semana ficarem completas.
 */
export function monthGrid(mes: Month): (CivilDate | null)[][] {
  const vazios = new Date(Date.UTC(mes.year, mes.month - 1, 1)).getUTCDay();
  const celulas: (CivilDate | null)[] = [
    ...Array<null>(vazios).fill(null),
    ...Array.from({ length: daysInMonth(mes) }, (_, i) => civilOf(mes, i + 1)),
  ];
  while (celulas.length % 7 !== 0) celulas.push(null);
  return Array.from({ length: celulas.length / 7 }, (_, semana) =>
    celulas.slice(semana * 7, semana * 7 + 7),
  );
}

/** Nome do mês por extenso, por exemplo "outubro de 2026". */
export function monthLabel({ year, month }: Month): string {
  return `${NOMES_DOS_MESES[month - 1] ?? ''} de ${year}`;
}

/** Data por extenso, por exemplo "6 de outubro de 2026" (lida pelo leitor de tela). */
export function longDateLabel(date: CivilDate): string {
  return `${Number(date.slice(8, 10))} de ${monthLabel(monthOf(date))}`;
}
