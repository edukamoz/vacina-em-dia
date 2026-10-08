import type { DoseStatus } from '@vacina/shared';
import { View } from 'react-native';
import { useThemeColors } from '../theme/theme-provider';
import { Icone } from './icone';
import { SELO_POR_ESTADO } from './selo-estado-dose';

/**
 * Quadro de 56 px com o ícone do estado da dose (cor do estado sobre o fundo suave dele). Decorativo:
 * o estado também aparece em texto no selo ao lado.
 *
 * @param props.status - Estado da dose.
 */
export function QuadroEstado({ status }: { status: DoseStatus }) {
  const cores = useThemeColors();
  const selo = SELO_POR_ESTADO[status];
  return (
    <View
      aria-hidden
      className={`h-[56px] w-[56px] items-center justify-center rounded-quadro border-padrao ${selo.caixa}`}
    >
      <Icone nome={selo.icone} cor={cores[selo.cor]} tamanho={28} />
    </View>
  );
}
