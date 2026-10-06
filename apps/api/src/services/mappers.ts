import {
  ageGroupOf,
  describeTiming,
  notesForRule,
  type CalendarDataset,
  type CalendarRule,
  type CalendarSourceResponse,
  type CivilDate,
  type DoseResponse,
  type MemberResponse,
} from '@vacina/shared';
import type { StoredDose, StoredMember } from '../repositories/repositories';

/**
 * Converte um membro guardado na resposta da API, calculando a faixa etária de hoje.
 *
 * @param member - Membro guardado.
 * @param today - Data de hoje (dia civil de Brasília), vinda do relógio injetado.
 */
export function toMemberResponse(member: StoredMember, today: CivilDate): MemberResponse {
  return {
    id: member.id,
    name: member.name,
    birthDate: member.birthDate,
    isPregnant: member.isPregnant,
    ageGroup: ageGroupOf(member.birthDate, today),
  };
}

/**
 * Junta a dose guardada com os dados da linha do calendário que a originou.
 *
 * @param dose - Dose guardada.
 * @param rule - Linha do calendário da dose.
 * @param dataset - Calendário, de onde saem as notas de rodapé.
 */
export function toDoseResponse(
  dose: StoredDose,
  rule: CalendarRule,
  dataset: CalendarDataset,
): DoseResponse {
  return {
    id: dose.id,
    memberId: dose.memberId,
    ruleId: dose.ruleId,
    vaccine: rule.vaccine,
    doseLabel: rule.dose,
    diseases: rule.diseases,
    timingKind: rule.timing.kind,
    timingLabel: describeTiming(rule.timing),
    conditional: rule.conditional,
    notes: [...notesForRule(dataset, rule)],
    status: dose.status,
    dueDate: dose.dueDate,
    scheduledDate: dose.scheduledDate,
    appliedDate: dose.appliedDate,
  };
}

/**
 * Fonte e versão do calendário, para acompanhar todo conteúdo vacinal (RNF10).
 *
 * @param dataset - Calendário.
 */
export function toSourceResponse(dataset: CalendarDataset): CalendarSourceResponse {
  const { name, publisher, version, url, retrievedAt, isFictitious, notice } = dataset.source;
  return { name, publisher, version, url, retrievedAt, isFictitious, notice };
}
