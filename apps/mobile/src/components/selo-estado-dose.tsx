import type { DoseStatus } from '@vacina/shared';
import { View } from 'react-native';
import { Texto } from './texto';

interface EstiloSelo {
  readonly rotulo: string;
  readonly icone: string;
  readonly caixa: string;
  readonly texto: string;
}

/** Rótulo, ícone e cores de cada estado (`docs/04-design-system.md`, seção 3). */
export const SELO_POR_ESTADO: Readonly<Record<DoseStatus, EstiloSelo>> = {
  PENDING: { rotulo: 'Pendente', icone: '◔', caixa: 'bg-pendenteSuave border-pendente', texto: 'text-pendente' },
  SCHEDULED: { rotulo: 'Agendada', icone: '▦', caixa: 'bg-agendadaSuave border-agendada', texto: 'text-agendada' },
  OVERDUE: { rotulo: 'Atrasada', icone: '▲', caixa: 'bg-atrasadaSuave border-atrasada', texto: 'text-atrasada' },
  APPLIED: { rotulo: 'Aplicada', icone: '✔', caixa: 'bg-aplicadaSuave border-aplicada', texto: 'text-aplicada' },
  CANCELLED: { rotulo: 'Cancelada', icone: '✖', caixa: 'bg-canceladaSuave border-cancelada', texto: 'text-cancelada' },
};

/**
 * Selo do estado da dose. Nunca depende só da cor: leva ícone e texto, e o rótulo de
 * acessibilidade diz "Dose atrasada", "Dose aplicada" etc.
 *
 * @param props.status - Estado da dose.
 */
export function SeloEstadoDose({ status }: { status: DoseStatus }) {
  const selo = SELO_POR_ESTADO[status];
  return (
    <View
      accessible
      accessibilityLabel={`Dose ${selo.rotulo.toLowerCase()}`}
      className={`flex-row items-center self-start rounded-selo border-padrao px-md py-xs ${selo.caixa}`}
    >
      <Texto variante="rotulo" className={selo.texto} importantForAccessibility="no">
        {`${selo.icone} ${selo.rotulo}`}
      </Texto>
    </View>
  );
}
