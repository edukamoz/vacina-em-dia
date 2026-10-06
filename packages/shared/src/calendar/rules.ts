import { addMonths, ageInMonths, type CivilDate } from '../domain/civil-date';
import type { CalendarDataset, CalendarGroup, CalendarRule, CalendarTiming } from './types';

/** Faixa etária (sem a gestante, que depende de um grupo específico do membro). */
export type AgeGroup = Exclude<CalendarGroup, 'PREGNANT'>;

/** Dados do membro que o calendário precisa. */
export interface CalendarMember {
  readonly birthDate: CivilDate;
  /** Grupo específico: gestante. */
  readonly isPregnant: boolean;
}

/**
 * Escolhe a faixa etária do calendário pela idade em meses, usando os limites oficiais: criança
 * até 9 anos, 11 meses e 29 dias; adolescente e jovem até 24 anos, 11 meses e 29 dias; adulto até
 * 59 anos, 11 meses e 29 dias; idoso a partir de 60 anos.
 *
 * @param months - Idade em meses completos.
 * @returns A faixa etária.
 */
export function ageGroupForMonths(months: number): AgeGroup {
  if (months < 120) return 'CHILD';
  if (months < 300) return 'ADOLESCENT_YOUTH';
  if (months < 720) return 'ADULT';
  return 'ELDERLY';
}

/**
 * Faixa etária de um membro numa data.
 *
 * @param birthDate - Data de nascimento.
 * @param today - Data de referência, recebida de fora para manter a regra pura.
 */
export function ageGroupOf(birthDate: CivilDate, today: CivilDate): AgeGroup {
  return ageGroupForMonths(ageInMonths(birthDate, today));
}

/**
 * Regras do calendário indicadas para um membro: as da sua faixa etária atual e, se for gestante,
 * as da gestação. Quem já passou da infância ao cadastrar não recebe as doses da faixa infantil,
 * porque o histórico anterior só consta na caderneta.
 *
 * @param dataset - Calendário (fonte, regras e notas).
 * @param member - Data de nascimento e grupo específico.
 * @param today - Data de referência.
 * @returns As regras na ordem do calendário, sem repetição.
 */
export function rulesForMember(
  dataset: CalendarDataset,
  member: CalendarMember,
  today: CivilDate,
): readonly CalendarRule[] {
  const group = ageGroupOf(member.birthDate, today);
  return dataset.rules.filter(
    (rule) => rule.group === group || (member.isPregnant && rule.group === 'PREGNANT'),
  );
}

/**
 * Data prevista de uma regra para um membro. Regras por idade usam o nascimento mais a idade em
 * meses; as demais ("conforme histórico" e gestação) não têm prazo fixo e usam a data de hoje, como
 * lembrete de conferir a caderneta.
 *
 * @param rule - Regra do calendário.
 * @param birthDate - Data de nascimento do membro.
 * @param today - Data de referência.
 */
export function dueDateForRule(
  rule: CalendarRule,
  birthDate: CivilDate,
  today: CivilDate,
): CivilDate {
  return rule.timing.kind === 'AGE' ? addMonths(birthDate, rule.timing.months) : today;
}

/**
 * Indica se a rotina de prazo pode marcar a dose como atrasada: só regras por idade e sem condição.
 * Dose "conforme histórico", de gestação ou condicional não tem prazo que possa vencer.
 *
 * @param rule - Regra do calendário.
 */
export function canBecomeOverdue(rule: CalendarRule): boolean {
  return rule.timing.kind === 'AGE' && !rule.conditional;
}

/**
 * Notas de rodapé oficiais de uma regra, na ordem em que aparecem.
 *
 * @param dataset - Calendário.
 * @param rule - Regra do calendário.
 * @returns Os textos das notas; notas ausentes no calendário são ignoradas.
 */
export function notesForRule(dataset: CalendarDataset, rule: CalendarRule): readonly string[] {
  return rule.noteIds.flatMap((id) => {
    const text = dataset.notes[id];
    return text === undefined ? [] : [text];
  });
}

/**
 * Texto curto do momento indicado, em português simples, para mostrar na tela.
 *
 * @param timing - Momento da regra.
 * @returns Por exemplo "Ao nascer", "2 meses", "4 anos", "Conforme histórico vacinal" ou
 *   "A partir da 20ª semana de gestação".
 */
export function describeTiming(timing: CalendarTiming): string {
  switch (timing.kind) {
    case 'HISTORY':
      return 'Conforme histórico vacinal';
    case 'GESTATION':
      return timing.week === null
        ? 'Ao saber da gravidez'
        : `A partir da ${timing.week}ª semana de gestação`;
    case 'AGE': {
      const { months } = timing;
      if (months === 0) return 'Ao nascer';
      if (months < 48) return months === 1 ? '1 mês' : `${months} meses`;
      const years = Math.floor(months / 12);
      const rest = months % 12;
      const yearsText = years === 1 ? '1 ano' : `${years} anos`;
      return rest === 0 ? yearsText : `${yearsText} e ${rest} ${rest === 1 ? 'mês' : 'meses'}`;
    }
  }
}
