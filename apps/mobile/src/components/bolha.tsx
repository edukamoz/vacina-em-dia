import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * Forma orgânica de fundo (só decoração, escondida do leitor de tela). Use as cores
 * `decorMenta`, `decorSol` e `primariaSuave`; nunca para texto nem para estado.
 *
 * @param props.cor - Cor de preenchimento.
 * @param props.tamanho - Lado em pixels.
 * @param props.opacidade - De 0 a 1.
 * @param props.className - Posição (por exemplo `absolute -right-[60px] -top-[40px]`).
 */
export function Bolha({
  cor,
  tamanho,
  opacidade = 1,
  className = '',
}: {
  cor: string;
  tamanho: number;
  opacidade?: number;
  className?: string;
}) {
  return (
    <View aria-hidden pointerEvents="none" className={className} style={{ opacity: opacidade }}>
      <Svg width={tamanho} height={tamanho} viewBox="0 0 100 100">
        <Path
          fill={cor}
          d="M51 2C76 -1 98 19 97 47C96 76 73 98 47 96C20 94 1 74 3 47C5 21 27 4 51 2Z"
        />
      </Svg>
    </View>
  );
}
