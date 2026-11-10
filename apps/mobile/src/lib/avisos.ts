import {
  REMINDER_LEAD_DAYS,
  addDays,
  compareCivilDates,
  type CivilDate,
  type DoseStatus,
} from '@vacina/shared';

/** Horários que a pessoa pode escolher para receber o aviso, em horas cheias (hora do aparelho). */
export const HORAS_DE_AVISO = [8, 12, 18] as const;

/** Hora do aviso quando a pessoa não escolheu: a mesma do e-mail diário (8h). */
export const HORA_PADRAO_DO_AVISO = 8;

/** Quantos dias à frente o app agenda avisos; depois disso, o próximo agendamento cobre o resto. */
export const HORIZONTE_DE_AVISOS_EM_DIAS = 45;

/** Teto de avisos agendados de uma vez (o iOS guarda no máximo 64). */
export const MAXIMO_DE_AVISOS = 60;

/** O que o planejador lê de uma dose (um pedaço do que a API devolve). */
export interface DoseParaAviso {
  readonly status: DoseStatus;
  readonly dueDate: CivilDate;
  readonly scheduledDate: CivilDate | null;
  /** Antecedência escolhida para esta dose; vazio usa o padrão (7 dias). */
  readonly remindDaysBefore?: number | null | undefined;
}

/** "Agora" no aparelho, recebido de fora para a regra ficar pura. */
export interface Agora {
  /** Dia civil de hoje. */
  readonly hoje: CivilDate;
  /** Minutos desde a meia-noite (hora local). */
  readonly minutos: number;
}

/** Um aviso a agendar: o dia, a hora cheia e o texto. */
export interface AvisoPlanejado {
  readonly data: CivilDate;
  readonly hora: number;
  readonly titulo: string;
  readonly corpo: string;
}

interface Contagem {
  naData: number;
  antecipado: number;
  atrasada: number;
}

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Junta as partes com vírgula e "e" no fim: "a", "a e b", "a, b e c". */
function juntar(partes: readonly string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
}

function corpoDoAviso({ naData, antecipado, atrasada }: Contagem): string {
  const partes: string[] = [];
  if (naData > 0) {
    partes.push(`${plural(naData, 'vacina é', 'vacinas são')} para hoje`);
  }
  if (antecipado > 0) {
    partes.push(`${plural(antecipado, 'vacina chega', 'vacinas chegam')} nos próximos dias`);
  }
  if (atrasada > 0) {
    partes.push(plural(atrasada, 'vacina está atrasada', 'vacinas estão atrasadas'));
  }
  return `${juntar(partes)}. Abra o aplicativo para ver quais.`;
}

/**
 * Decide quais avisos o aparelho deve agendar, a partir das doses de toda a família. Função pura:
 * não lê o relógio nem toca em notificações.
 *
 * Cada dose ainda não aplicada nem cancelada pode gerar até três avisos: um **na data** (a agendada
 * ou, se não houver, a prevista), um **na antecedência** escolhida para a dose (7 dias por padrão;
 * 0 avisa só no dia) e, se a data passou ontem, um de **atraso**. Dose atrasada há mais tempo não
 * gera aviso novo: o atraso já foi avisado e fica em destaque no aplicativo (ADR-017). Avisos da
 * mesma data viram um só, com **só quantidades**, sem nome de pessoa nem de vacina, porque o texto
 * aparece na tela bloqueada.
 *
 * Só entram avisos de hoje (se o horário ainda não passou) até {@link HORIZONTE_DE_AVISOS_EM_DIAS}
 * dias à frente, em ordem de data e no máximo {@link MAXIMO_DE_AVISOS}.
 *
 * @param doses - Doses da família.
 * @param agora - Dia de hoje e minutos desde a meia-noite.
 * @param hora - Hora cheia do aviso (uma de {@link HORAS_DE_AVISO}).
 */
export function planejarAvisos(
  doses: readonly DoseParaAviso[],
  agora: Agora,
  hora: number,
): AvisoPlanejado[] {
  const limite = addDays(agora.hoje, HORIZONTE_DE_AVISOS_EM_DIAS);
  const porDia = new Map<CivilDate, Contagem>();
  const somar = (data: CivilDate, campo: keyof Contagem) => {
    const antesDoHorario = data === agora.hoje && hora * 60 <= agora.minutos;
    if (compareCivilDates(data, agora.hoje) < 0 || compareCivilDates(data, limite) > 0) return;
    if (antesDoHorario) return;
    const atual = porDia.get(data) ?? { naData: 0, antecipado: 0, atrasada: 0 };
    atual[campo] += 1;
    porDia.set(data, atual);
  };

  for (const dose of doses) {
    if (dose.status === 'APPLIED' || dose.status === 'CANCELLED') continue;
    const data =
      dose.status === 'SCHEDULED' && dose.scheduledDate ? dose.scheduledDate : dose.dueDate;
    if (compareCivilDates(data, agora.hoje) >= 0) {
      somar(data, 'naData');
      const antecedencia = dose.remindDaysBefore ?? REMINDER_LEAD_DAYS;
      if (antecedencia > 0) somar(addDays(data, -antecedencia), 'antecipado');
    } else {
      somar(addDays(data, 1), 'atrasada');
    }
  }

  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, MAXIMO_DE_AVISOS)
    .map(([data, contagem]) => ({
      data,
      hora,
      titulo: 'Vacina em Dia',
      corpo: corpoDoAviso(contagem),
    }));
}
