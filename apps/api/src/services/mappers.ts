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
    relationship: member.relationship,
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
    origin: 'OFFICIAL',
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
 * Resposta de uma dose avulsa (cadastrada pela pessoa): não tem linha do calendário, doenças
 * evitadas nem notas oficiais; o texto do app deixa claro que não é do calendário oficial.
 *
 * @param dose - Dose guardada com `custom` preenchido.
 */
export function toCustomDoseResponse(dose: StoredDose): DoseResponse | undefined {
  if (!dose.custom) return undefined;
  return {
    id: dose.id,
    memberId: dose.memberId,
    origin: 'CUSTOM',
    ruleId: null,
    vaccine: dose.custom.vaccine,
    doseLabel: dose.custom.doseLabel,
    diseases: '',
    timingKind: 'CUSTOM',
    timingLabel: 'Data escolhida por você',
    conditional: false,
    notes: [],
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
