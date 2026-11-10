import {
  MAX_SERIES_DOSES,
  MAX_REMIND_DAYS_BEFORE,
  RECURRENCE_MAX_EVERY,
  compareCivilDates,
  addDays,
  type CivilDate,
  type CustomDoseInput,
  type DoseResponse,
  type RecurrenceAnchor,
  type RecurrenceUnit,
} from '@vacina/shared';
import { formatCivilDate } from './format-date';

/** Como termina uma repetição: nunca, em uma data ou depois de certo número de doses. */
export type Termino = 'NUNCA' | 'DATA' | 'DOSES';

/** Antecedência do aviso: o padrão do app ou um número de dias escolhido (como texto). */
export type EscolhaDeAviso = 'PADRAO' | '0' | '3' | '14' | '30';

/** Estado do formulário de repetição e de aviso da dose avulsa (tudo como a pessoa digita). */
export interface FormaDeRepetir {
  readonly repete: boolean;
  readonly cada: string;
  readonly unidade: RecurrenceUnit;
  readonly conta: RecurrenceAnchor;
  readonly termina: Termino;
  readonly dataFinal: CivilDate;
  readonly totalDoses: string;
  readonly avisar: EscolhaDeAviso;
}

/** Formulário de partida: a dose não se repete e o aviso segue o padrão do app. */
export const ESTADO_INICIAL_REPETICAO: FormaDeRepetir = {
  repete: false,
  cada: '1',
  unidade: 'YEAR',
  conta: 'APPLICATION',
  termina: 'NUNCA',
  dataFinal: '',
  totalDoses: '5',
  avisar: 'PADRAO',
};

/** Campos extras da dose avulsa que o formulário pode acrescentar. */
export type ExtrasDaDose = Pick<CustomDoseInput, 'recurrence' | 'remindDaysBefore'>;

/** Mensagens de erro por campo do formulário. */
export interface ErrosDeRepeticao {
  cada?: string;
  totalDoses?: string;
  dataFinal?: string;
}

/** Resultado de {@link montarRepeticao}. */
export type Montagem =
  | { readonly ok: true; readonly extras: ExtrasDaDose }
  | { readonly ok: false; readonly erros: ErrosDeRepeticao };

const INTEIRO = /^\d+$/;

/**
 * Confere o formulário e monta só os campos que precisam ir à API. Quando a dose não se repete e o
 * aviso é o padrão, não devolve nada (o corpo da requisição fica como antes).
 *
 * @param forma - O que a pessoa preencheu.
 * @param primeiraData - Data prevista da primeira dose; a data final precisa ser depois dela.
 */
export function montarRepeticao(forma: FormaDeRepetir, primeiraData: CivilDate): Montagem {
  const erros: ErrosDeRepeticao = {};
  const extras: { -readonly [K in keyof ExtrasDaDose]: ExtrasDaDose[K] } = {};

  if (forma.avisar !== 'PADRAO') {
    extras.remindDaysBefore = Math.min(Number(forma.avisar), MAX_REMIND_DAYS_BEFORE);
  }

  if (forma.repete) {
    const maximo = RECURRENCE_MAX_EVERY[forma.unidade];
    const cada = INTEIRO.test(forma.cada.trim()) ? Number(forma.cada.trim()) : Number.NaN;
    if (!(cada >= 1 && cada <= maximo)) erros.cada = `Informe um número de 1 a ${maximo}.`;

    const recurrence: NonNullable<ExtrasDaDose['recurrence']> = {
      unit: forma.unidade,
      every: cada,
      anchor: forma.conta,
    };
    if (forma.termina === 'DATA') {
      if (forma.dataFinal === '' || compareCivilDates(forma.dataFinal, primeiraData) <= 0) {
        erros.dataFinal = 'Escolha uma data depois da primeira dose.';
      } else {
        recurrence.endDate = forma.dataFinal;
      }
    }
    if (forma.termina === 'DOSES') {
      const total = INTEIRO.test(forma.totalDoses.trim())
        ? Number(forma.totalDoses.trim())
        : Number.NaN;
      if (!(total >= 2 && total <= MAX_SERIES_DOSES)) {
        erros.totalDoses = `Informe de 2 a ${MAX_SERIES_DOSES} doses.`;
      } else {
        recurrence.maxDoses = total;
      }
    }
    extras.recurrence = recurrence;
  }

  return Object.keys(erros).length > 0 ? { ok: false, erros } : { ok: true, extras };
}

const UNIDADES: Record<RecurrenceUnit, { varios: string; todo: string }> = {
  DAY: { varios: 'dias', todo: 'Todo dia' },
  WEEK: { varios: 'semanas', todo: 'Toda semana' },
  MONTH: { varios: 'meses', todo: 'Todo mês' },
  YEAR: { varios: 'anos', todo: 'Todo ano' },
};

/**
 * Descreve a repetição em linguagem simples, por exemplo "A cada 6 meses, em datas fixas, 4 doses
 * no total".
 *
 * @param recurrence - Repetição devolvida pela API.
 */
export function descreverRepeticao(recurrence: NonNullable<DoseResponse['recurrence']>): string {
  const unidade = UNIDADES[recurrence.unit];
  const quando =
    recurrence.every === 1 ? unidade.todo : `A cada ${recurrence.every} ${unidade.varios}`;
  const partes = [
    quando,
    recurrence.anchor === 'APPLICATION' ? 'contando da data da aplicação' : 'em datas fixas',
  ];
  if (recurrence.endDate) partes.push(`até ${formatCivilDate(recurrence.endDate)}`);
  else if (recurrence.maxDoses) partes.push(`${recurrence.maxDoses} doses no total`);
  return partes.join(', ');
}

/**
 * Descreve o aviso antecipado de uma dose.
 *
 * @param dias - Dias de antecedência; `null` ou ausente é o padrão do app (7 dias).
 */
export function descreverAviso(dias: number | null | undefined): string {
  if (dias === null || dias === undefined) return 'Padrão: 7 dias antes';
  if (dias === 0) return 'No próprio dia';
  return dias === 1 ? '1 dia antes' : `${dias} dias antes`;
}

/**
 * Primeira data possível para o fim da repetição: o dia seguinte à primeira dose.
 *
 * @param primeiraData - Data prevista da primeira dose.
 */
export function primeiroDiaDoFim(primeiraData: CivilDate): CivilDate {
  return addDays(primeiraData, 1);
}
