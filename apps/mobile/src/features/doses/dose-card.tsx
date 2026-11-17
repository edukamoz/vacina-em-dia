import type { DoseResponse, DoseStatus } from '@vacina/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Botao } from '../../components/botao';
import { Cartao } from '../../components/cartao';
import { QuadroEstado } from '../../components/quadro-estado';
import { SeloEstadoDose } from '../../components/selo-estado-dose';
import { SeloOrigem } from '../../components/selo-origem';
import { Texto } from '../../components/texto';
import { formatCivilDate } from './format-date';
import { useMovimentoReduzido, useVisual } from '../../theme/theme-provider';

const DICA: Readonly<Record<DoseStatus, string>> = {
  PENDING: 'Prevista para',
  SCHEDULED: 'Marcada para',
  OVERDUE: 'Era para',
  APPLIED: 'Aplicada em',
  CANCELLED: 'Não é mais necessária',
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
 * e dica de leitura. O texto quebra de linha, sem reticências: nome da vacina e datas nunca são
 * cortados (ADR-036). Com `aoAbrir`, a parte de cima do cartão vira um botão que abre o detalhe;
 * com `aoAplicar`, o cartão ganha a ação rápida "Aplicar" embaixo (fora do botão do detalhe, para
 * não haver botão dentro de botão).
 *
 * @param props.dose - Dose a exibir.
 * @param props.aoAbrir - Chamada ao tocar no cartão.
 * @param props.aoAplicar - Chamada ao tocar em "Aplicar" (só para dose atrasada).
 */
export function DoseCard({
  dose,
  aoAbrir,
  aoAplicar,
}: {
  dose: DoseResponse;
  aoAbrir?: () => void;
  aoAplicar?: () => void;
}) {
  const reduzido = useMovimentoReduzido();
  const { sombra } = useVisual();
  const [passando, setPassando] = useState(false);
  const conteudo = (
    <>
      <QuadroEstado status={dose.status} />
      <View className="min-w-0 flex-1 gap-sm">
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
    </>
  );
  return (
    <Cartao
      className="grow gap-md"
      // Elevar ao passar (só na web, com mouse): sobe 3 px e ganha a sombra 2; "Reduzir movimento" mantém só a sombra.
      style={[
        passando ? sombra(2) : undefined,
        reduzido
          ? null
          : ({ transitionProperty: 'transform', transitionDuration: '200ms' } as object),
        passando && !reduzido ? { transform: [{ translateY: -3 }] } : null,
      ]}
    >
      {aoAbrir ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${dose.vaccine}, ${dose.doseLabel}. Abrir detalhes`}
          onPress={aoAbrir}
          onHoverIn={() => setPassando(true)}
          onHoverOut={() => setPassando(false)}
          className="flex-row items-start gap-lg"
        >
          {conteudo}
        </Pressable>
      ) : (
        <View className="flex-row items-start gap-lg">{conteudo}</View>
      )}
      {aoAplicar ? (
        <View className="items-start">
          <Botao
            titulo="Aplicar"
            tamanho="compacto"
            icone="aplicada"
            accessibilityLabel={`Registrar aplicação de ${dose.vaccine}, ${dose.doseLabel}`}
            onPress={aoAplicar}
          />
        </View>
      ) : null}
    </Cartao>
  );
}
