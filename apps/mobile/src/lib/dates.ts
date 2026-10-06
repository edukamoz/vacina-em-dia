import { ageInMonths, isValidCivilDate, type CivilDate } from '@vacina/shared';

/**
 * Dia de hoje (calendário local do aparelho) como data civil. É o único ponto da interface que lê
 * o relógio; a API revalida toda data pelo dia civil de Brasília.
 *
 * @param now - Instante atual, injetável para testar.
 */
export function todayCivil(now: Date = new Date()): CivilDate {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Aplica a máscara `DD/MM/AAAA` enquanto a pessoa digita: guarda só os dígitos e coloca as barras.
 *
 * @param input - Texto digitado.
 */
export function maskBrDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Converte `DD/MM/AAAA` em data civil `AAAA-MM-DD`.
 *
 * @param text - Texto no formato brasileiro.
 * @returns A data civil, ou `null` se estiver incompleta ou não existir no calendário.
 */
export function parseBrDate(text: string): CivilDate | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const civil = `${match[3]}-${match[2]}-${match[1]}`;
  return isValidCivilDate(civil) ? civil : null;
}

/**
 * Idade por extenso, em linguagem simples: "5 meses", "2 anos e 3 meses" ou "34 anos".
 *
 * @param birthDate - Data de nascimento.
 * @param today - Data de referência.
 */
export function describeAge(birthDate: CivilDate, today: CivilDate): string {
  const months = ageInMonths(birthDate, today);
  if (months < 1) return 'menos de 1 mês';
  if (months < 24) return months === 1 ? '1 mês' : `${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearsText = `${years} anos`;
  if (years >= 6 || rest === 0) return yearsText;
  return `${yearsText} e ${rest} ${rest === 1 ? 'mês' : 'meses'}`;
}
