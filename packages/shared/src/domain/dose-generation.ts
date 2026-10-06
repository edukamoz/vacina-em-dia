/**
 * Escolhe quais regras do calendário ainda precisam gerar uma dose para um membro.
 *
 * Garante que gerar as doses mais de uma vez não duplica nada: existe no máximo uma dose por regra
 * e por membro (espelha a restrição única do banco).
 *
 * @param applicableRuleIds - Regras indicadas para a faixa etária e o grupo do membro.
 * @param existingRuleIds - Regras que já têm dose para o membro.
 * @returns As regras que ainda faltam, sem repetição e na ordem recebida.
 */
export function selectDoseRulesToGenerate(
  applicableRuleIds: readonly string[],
  existingRuleIds: readonly string[],
): string[] {
  const existing = new Set(existingRuleIds);
  const result: string[] = [];
  for (const id of applicableRuleIds) {
    if (!existing.has(id)) {
      existing.add(id);
      result.push(id);
    }
  }
  return result;
}
