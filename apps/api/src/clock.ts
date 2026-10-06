import type { CivilDate } from '@vacina/shared';

/** Relógio injetável: devolve o instante atual em texto ISO 8601 (UTC). */
export type Clock = () => string;

const CIVIL_TIME_ZONE = 'America/Sao_Paulo';
const civilFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: CIVIL_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Converte o instante do relógio no dia civil de Brasília (`AAAA-MM-DD`), que é o "hoje" das regras
 * de dose. Assim, às 23h30 de Brasília o dia ainda é o mesmo, mesmo que o UTC já tenha virado.
 *
 * @param clock - Relógio que informa o instante atual.
 * @returns A data civil de hoje em Brasília.
 * @throws Error se o relógio devolver um instante inválido.
 */
export function civilToday(clock: Clock): CivilDate {
  const instant = new Date(clock());
  if (Number.isNaN(instant.getTime())) throw new Error('Instante inválido.');
  return civilFormat.format(instant);
}
