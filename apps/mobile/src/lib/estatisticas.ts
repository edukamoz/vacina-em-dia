import type { CivilDate, DoseResponse, DoseStatus } from '@vacina/shared';

/** Estados que entram nos gráficos (as doses canceladas não contam). */
export const ESTADOS_DO_GRAFICO = ['APPLIED', 'SCHEDULED', 'PENDING', 'OVERDUE'] as const;
export type EstadoDoGrafico = (typeof ESTADOS_DO_GRAFICO)[number];

/** Quantidade de doses de cada estado. */
export type ContagemPorEstado = Readonly<Record<EstadoDoGrafico, number>>;

const MESES_ABREVIADOS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
] as const;

/** Um mês do gráfico de barras. */
export interface MesDoGrafico {
  /** Mês no formato `AAAA-MM`. */
  readonly chave: string;
  /** Rótulo curto, por exemplo `out`. */
  readonly rotulo: string;
  /** Rótulo com o ano, por exemplo `outubro de 2026` (para leitor de tela). */
  readonly rotuloCompleto: string;
  readonly total: number;
}

const MESES_POR_EXTENSO = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** Conta as doses de uma lista por estado; as canceladas ficam de fora. */
export function contarPorEstado(doses: readonly DoseResponse[]): ContagemPorEstado {
  const contagem: Record<EstadoDoGrafico, number> = {
    APPLIED: 0,
    SCHEDULED: 0,
    PENDING: 0,
    OVERDUE: 0,
  };
  for (const dose of doses) {
    if (dose.status !== 'CANCELLED') contagem[dose.status] += 1;
  }
  return contagem;
}

/** Soma de todos os estados de uma contagem. */
export function totalDaContagem(contagem: ContagemPorEstado): number {
  return ESTADOS_DO_GRAFICO.reduce((soma, estado) => soma + contagem[estado], 0);
}

/**
 * Cobertura: a parte das doses (sem as canceladas) que já foi aplicada, de 0 a 100, arredondada.
 * Sem nenhuma dose, devolve 0.
 */
export function cobertura(contagem: ContagemPorEstado): number {
  const total = totalDaContagem(contagem);
  return total === 0 ? 0 : Math.round((contagem.APPLIED / total) * 100);
}

/** Mês (`AAAA-MM`) de uma data civil. */
export function mesDe(data: CivilDate): string {
  return data.slice(0, 7);
}

/** Soma `n` meses (positivo ou negativo) a um mês `AAAA-MM`. */
export function somarMeses(mes: string, n: number): string {
  const [ano = 0, numero = 1] = mes.split('-').map(Number);
  const indice = ano * 12 + (numero - 1) + n;
  const novoAno = Math.floor(indice / 12);
  return `${novoAno}-${String((indice % 12) + 1).padStart(2, '0')}`;
}

function rotulosDoMes(chave: string): Pick<MesDoGrafico, 'rotulo' | 'rotuloCompleto'> {
  const [ano, numero = '1'] = chave.split('-');
  const indice = Number(numero) - 1;
  return {
    rotulo: MESES_ABREVIADOS[indice] ?? '',
    rotuloCompleto: `${MESES_POR_EXTENSO[indice] ?? ''} de ${ano}`,
  };
}

function serie(
  inicio: string,
  quantidade: number,
  total: (chave: string) => number,
): MesDoGrafico[] {
  return Array.from({ length: quantidade }, (_, i) => {
    const chave = somarMeses(inicio, i);
    return { chave, ...rotulosDoMes(chave), total: total(chave) };
  });
}

/**
 * Doses aplicadas por mês, nos últimos `meses` meses (o mês de `hoje` é o último). Vale a data em
 * que a dose foi aplicada.
 */
export function aplicadasPorMes(
  doses: readonly DoseResponse[],
  hoje: CivilDate,
  meses = 12,
): MesDoGrafico[] {
  const contagem = new Map<string, number>();
  for (const dose of doses) {
    if (dose.status === 'APPLIED' && dose.appliedDate) {
      const chave = mesDe(dose.appliedDate);
      contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
  }
  return serie(somarMeses(mesDe(hoje), -(meses - 1)), meses, (chave) => contagem.get(chave) ?? 0);
}

/** Doses previstas num mês: a data de agendamento ou, sem ela, o prazo. */
function dataPrevista(dose: DoseResponse): CivilDate | null {
  return dose.scheduledDate ?? dose.dueDate ?? null;
}

/** Resultado das doses previstas: a série por mês e as que ficaram de fora do gráfico. */
export interface Previstas {
  readonly meses: MesDoGrafico[];
  /** Doses atrasadas (prazo anterior ao mês de hoje): aparecem à parte, como "em atraso". */
  readonly emAtraso: number;
  /** Doses abertas sem data (por exemplo "conforme histórico vacinal"). */
  readonly semData: number;
  /** Doses com data depois do último mês do gráfico. */
  readonly depois: number;
}

/**
 * Doses ainda não aplicadas, por mês, a partir do mês de `hoje` e pelos próximos `meses` meses.
 * Doses atrasadas, sem data ou além do período não entram nas barras e são contadas à parte.
 */
export function previstasPorMes(
  doses: readonly DoseResponse[],
  hoje: CivilDate,
  meses = 6,
): Previstas {
  const primeiro = mesDe(hoje);
  const ultimo = somarMeses(primeiro, meses - 1);
  const contagem = new Map<string, number>();
  let emAtraso = 0;
  let semData = 0;
  let depois = 0;
  for (const dose of doses) {
    if (dose.status !== 'PENDING' && dose.status !== 'SCHEDULED' && dose.status !== 'OVERDUE') {
      continue;
    }
    const data = dataPrevista(dose);
    if (dose.status === 'OVERDUE') {
      emAtraso += 1;
    } else if (!data) {
      semData += 1;
    } else {
      const chave = mesDe(data);
      if (chave < primeiro) emAtraso += 1;
      else if (chave > ultimo) depois += 1;
      else contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
    }
  }
  return {
    meses: serie(primeiro, meses, (chave) => contagem.get(chave) ?? 0),
    emAtraso,
    semData,
    depois,
  };
}

/** Rótulo em português de cada estado do gráfico, no plural. */
export const ROTULO_DO_ESTADO: Readonly<Record<DoseStatus, string>> = {
  APPLIED: 'Aplicadas',
  SCHEDULED: 'Agendadas',
  PENDING: 'Pendentes',
  OVERDUE: 'Atrasadas',
  CANCELLED: 'Canceladas',
};
