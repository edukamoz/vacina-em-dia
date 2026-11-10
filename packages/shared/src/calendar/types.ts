/** Faixas do calendário nacional. Cada membro pertence a uma faixa etária; a gestante soma a sua. */
export const CALENDAR_GROUPS = [
  'CHILD',
  'ADOLESCENT_YOUTH',
  'ADULT',
  'ELDERLY',
  'PREGNANT',
] as const;

/** Faixa do calendário nacional. */
export type CalendarGroup = (typeof CALENDAR_GROUPS)[number];

/**
 * Quando a dose é indicada.
 *
 * - `AGE`: numa idade exata, em meses completos (por exemplo, 12 meses ou 4 anos = 48).
 * - `HISTORY`: "conforme histórico vacinal": o calendário não fixa idade; vale conferir a caderneta.
 * - `GESTATION`: na gestação; `week` é a semana gestacional mínima, ou `null` para "ao saber da
 *   gravidez".
 */
export type CalendarTiming =
  | { readonly kind: 'AGE'; readonly months: number }
  | { readonly kind: 'HISTORY' }
  | { readonly kind: 'GESTATION'; readonly week: number | null };

/**
 * Repetição de uma linha do calendário, **só quando o texto oficial diz a periodicidade** (por
 * exemplo, "1 dose anual" ou "1 dose semestral"). Nada é deduzido nem preenchido de memória
 * (CLAUDE.md §8): `basis` cita de onde o texto oficial a tira.
 */
export interface CalendarRecurrence {
  /** Unidade do intervalo. */
  readonly unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  /** A cada quantas unidades a dose se repete. */
  readonly every: number;
  /**
   * Idade, em meses, em que a repetição acaba: nenhuma dose cai a partir do dia em que a pessoa a
   * completa. Só para linhas com limite de idade no texto oficial ("menores de 6 anos" = 72).
   */
  readonly endsAtAgeMonths?: number | null;
  /** O trecho oficial em que a periodicidade está escrita. */
  readonly basis: string;
}

/** Uma linha do calendário oficial: uma vacina, numa faixa, com sua dose e prazo. */
export interface CalendarRule {
  /** Identificador estável da regra (usado no banco e nas doses geradas). */
  readonly id: string;
  /** Faixa do calendário em que a regra aparece. */
  readonly group: CalendarGroup;
  /** Nome da vacina, como no calendário oficial. */
  readonly vaccine: string;
  /** Dose indicada (por exemplo, "1ª dose" ou "3 doses"). */
  readonly dose: string;
  /** Doenças evitadas, como no calendário oficial. */
  readonly diseases: string;
  /** Quando a dose é indicada. */
  readonly timing: CalendarTiming;
  /** Identificadores das notas de rodapé oficiais que se aplicam à linha. */
  readonly noteIds: readonly string[];
  /** Verdadeiro quando a indicação depende de condição (risco, profissão, grupo específico). */
  readonly conditional: boolean;
  /** Se a dose se repete e de quanto em quanto tempo, conforme o texto oficial; ausente se não. */
  readonly recurrence?: CalendarRecurrence | null;
}

/** Fonte e versão do calendário (RNF10). */
export interface CalendarSourceInfo {
  readonly name: string;
  readonly publisher: string;
  readonly version: string;
  readonly url: string;
  /** Data em que os arquivos oficiais foram obtidos e transcritos. */
  readonly retrievedAt: string;
  readonly files: readonly string[];
  /** Verdadeiro apenas para dados de exemplo; o calendário oficial é `false`. */
  readonly isFictitious: boolean;
  /** Aviso obrigatório em toda tela com conteúdo vacinal. */
  readonly notice: string;
}

/** Calendário completo: fonte, regras e notas de rodapé por identificador. */
export interface CalendarDataset {
  readonly source: CalendarSourceInfo;
  readonly rules: readonly CalendarRule[];
  readonly notes: Readonly<Record<string, string>>;
}
