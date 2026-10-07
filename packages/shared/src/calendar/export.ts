import { describeTiming } from './rules';
import type { CalendarDataset, CalendarGroup, CalendarSourceInfo } from './types';

/** Linha do calendário como o serviço de PLN (Python) a recebe. */
export interface NlpCalendarRule {
  readonly id: string;
  readonly group: CalendarGroup;
  readonly vaccine: string;
  readonly dose: string;
  readonly diseases: string;
  readonly timingKind: 'AGE' | 'HISTORY' | 'GESTATION';
  /** Idade em meses das regras por idade; `null` nas demais. */
  readonly ageMonths: number | null;
  /** Texto pronto ("2 meses", "Ao nascer"...), para o Python não repetir a regra de texto. */
  readonly timingLabel: string;
  readonly conditional: boolean;
  readonly noteIds: readonly string[];
}

/** Calendário em formato neutro (JSON) para o serviço de PLN. */
export interface NlpCalendar {
  readonly source: CalendarSourceInfo;
  readonly rules: readonly NlpCalendarRule[];
  readonly notes: Readonly<Record<string, string>>;
}

/**
 * Converte o calendário oficial no JSON consumido pelo serviço de PLN. O arquivo gerado
 * (`apps/nlp/vacina_nlp/data/pni-2026.json`) é a **única** cópia do calendário no lado Python; um
 * teste confere que ele não diverge deste dado (fonte única, CLAUDE.md §8).
 *
 * @param dataset - Calendário oficial.
 */
export function exportCalendarForNlp(dataset: CalendarDataset): NlpCalendar {
  return {
    source: dataset.source,
    rules: dataset.rules.map((rule) => ({
      id: rule.id,
      group: rule.group,
      vaccine: rule.vaccine,
      dose: rule.dose,
      diseases: rule.diseases,
      timingKind: rule.timing.kind,
      ageMonths: rule.timing.kind === 'AGE' ? rule.timing.months : null,
      timingLabel: describeTiming(rule.timing),
      conditional: rule.conditional,
      noteIds: rule.noteIds,
    })),
    notes: dataset.notes,
  };
}
