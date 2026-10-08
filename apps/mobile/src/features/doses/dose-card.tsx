import type { DoseResponse, DoseStatus } from '@vacina/shared';
import { Pressable, View } from 'react-native';
import { Cartao } from '../../components/cartao';
import { Icone } from '../../components/icone';
import { SELO_POR_ESTADO, SeloEstadoDose } from '../../components/selo-estado-dose';
import { SeloOrigem } from '../../components/selo-origem';
import { Texto } from '../../components/texto';
import { useThemeColors } from '../../theme/theme-provider';
import { formatCivilDate } from './format-date';

const DICA: Readonly<Record<DoseStatus, string>> = {
  PENDING: 'Prevista para',
  SCHEDULED: 'Marcada para',
  OVERDUE: 'Era para',
  APPLIED: 'Aplicada em',
  CANCELLED: 'Não é mais necessária',
};

/** Classe da faixa lateral de cada estado (ainda usada no Histórico; sai com o redesenho dele). */
export const FAIXA_POR_ESTADO: Readonly<Record<DoseStatus, string>> = {
  PENDING: 'bg-pendente',
  SCHEDULED: 'bg-agendada',
  OVERDUE: 'bg-atrasada',
  APPLIED: 'bg-aplicada',
  CANCELLED: 'bg-cancelada',
};

/**
 * Texto de apoio do cartão, por exemplo "Marcada para 04/11/2026". Dose "conforme histórico" e de
 * gestação não tem data fixa: o texto manda conferir a caderneta.
 */
export function doseHint(
  dose: Pick<DoseResponse, 'status' | 'dueDate' | 'scheduledDate' | 'appliedDate' | 'timingKind'>,
): string {
  if (dose.status === 'PENDING' && dose.timingKind !== 'AGE' && dose.timingKind !== 'CUSTOM') {
    return 'Confira na sua caderneta';
  }
  const linha = doseDateRow(dose);
  return linha ? `${linha.rotulo} ${linha.valor}` : DICA[dose.status];
}

/**
 * A data que importa no estado atual, separada em rótulo e valor ("Prevista para" e "20/09/2026"),
 * para o detalhe da dose. `null` quando não há data (dose cancelada ou sem idade fixa).
 */
export function doseDateRow(
  dose: Pick<DoseResponse, 'status' | 'dueDate' | 'scheduledDate' | 'appliedDate' | 'timingKind'>,
): { rotulo: string; valor: string } | null {
  if (dose.status === 'PENDING' && dose.timingKind !== 'AGE' && dose.timingKind !== 'CUSTOM') {
    return null;
  }
  const date = {
    SCHEDULED: dose.scheduledDate,
    OVERDUE: dose.dueDate,
    APPLIED: dose.appliedDate,
    PENDING: dose.dueDate,
    CANCELLED: null,
  }[dose.status];
  return date ? { rotulo: DICA[dose.status], valor: formatCivilDate(date) } : null;
}

/**
 * Cartão de dose: quadro de 56 px com o ícone do estado, nome da vacina, quando é indicada, selo
 * e dica de leitura. Com `aoAbrir`, o cartão inteiro vira um botão que abre o detalhe.
 *
 * @param props.dose - Dose a exibir.
 * @param props.aoAbrir - Chamada ao tocar no cartão.
 */
export function DoseCard({ dose, aoAbrir }: { dose: DoseResponse; aoAbrir?: () => void }) {
  const cores = useThemeColors();
  const selo = SELO_POR_ESTADO[dose.status];
  const conteudo = (
    <Cartao className="flex-row items-start gap-lg">
      <View
        className={`h-[56px] w-[56px] items-center justify-center rounded-quadro border-padrao ${selo.caixa}`}
      >
        <Icone nome={selo.icone} cor={cores[selo.cor]} tamanho={28} />
      </View>
      <View className="flex-1 gap-sm">
        <Texto variante="titulo3">{`${dose.vaccine}, ${dose.doseLabel}`}</Texto>
        <Texto variante="apoio" className="text-textoSecundario">
          {dose.timingLabel}
          {dose.conditional ? ' · depende de condições' : ''}
        </Texto>
        <View className="flex-row flex-wrap gap-sm">
          <SeloEstadoDose status={dose.status} />
          <SeloOrigem origem={dose.origin} />
        </View>
        <Texto variante="apoio" className="text-textoSecundario">
          {doseHint(dose)}
        </Texto>
      </View>
    </Cartao>
  );
  if (!aoAbrir) return conteudo;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dose.vaccine}, ${dose.doseLabel}. Abrir detalhes`}
      onPress={aoAbrir}
    >
      {conteudo}
    </Pressable>
  );
}
