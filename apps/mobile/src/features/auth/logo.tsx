import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Texto } from '../../components/texto';
import { useThemeColors } from '../../theme/theme-provider';

/**
 * Marca do Vacina em Dia: escudo com um visto e o nome ao lado. O desenho é decorativo (o nome
 * escrito já diz tudo ao leitor de tela) e usa as cores do tema atual.
 *
 * @param props.grande - Versão maior, para a tela de apresentação e a lateral das telas de entrada.
 */
export function Logo({ grande = false }: { grande?: boolean }) {
  const cores = useThemeColors();
  const lado = grande ? 56 : 40;
  return (
    <View className="flex-row items-center gap-sm" accessibilityRole="header">
      <Svg width={lado} height={lado} viewBox="0 0 48 48" aria-hidden>
        <Path
          d="M24 4 L40 10 V22 C40 32 33.5 40 24 44 C14.5 40 8 32 8 22 V10 Z"
          fill={cores.primaria}
          stroke={cores.primaria}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        <Path
          d="M16 23.5 L22 29.5 L33 17.5"
          fill="none"
          stroke={cores.sobrePrimaria}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Texto variante={grande ? 'titulo1' : 'titulo2'}>
        {'Vacina '}
        <Texto variante={grande ? 'titulo1' : 'titulo2'} className="text-primaria">
          em Dia
        </Texto>
      </Texto>
    </View>
  );
}
