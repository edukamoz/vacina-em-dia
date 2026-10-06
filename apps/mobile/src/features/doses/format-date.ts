/**
 * Converte uma data civil `AAAA-MM-DD` para `DD/MM/AAAA`, o formato de leitura no Brasil.
 *
 * @param civilDate - Data no formato `AAAA-MM-DD`.
 * @returns Data como `DD/MM/AAAA`.
 * @throws Error se o texto não estiver no formato esperado.
 */
export function formatCivilDate(civilDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(civilDate);
  if (!match) throw new Error(`Data civil inválida: ${civilDate}`);
  return `${match[3]}/${match[2]}/${match[1]}`;
}
