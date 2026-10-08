import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Texto } from '../../components/texto';
import { useThemeColors } from '../../theme/theme-provider';

/**
 * Símbolo da marca: um visto formado por um adulto e uma criança. É decorativo (o nome escrito já
 * diz tudo ao leitor de tela) e usa as cores do tema atual.
 *
 * @param props.tamanho - Lado em pixels.
 * @param props.invertido - Cores para fundo da marca (gradiente verde): adulto claro.
 */
export function Simbolo({ tamanho, invertido = false }: { tamanho: number; invertido?: boolean }) {
  const cores = useThemeColors();
  const adulto = invertido ? cores.sobrePrimaria : cores.primaria;
  const crianca = invertido ? cores.marcaInvCrianca : cores.marcaCrianca;
  const ponto = invertido ? cores.marcaInvPonto : cores.marcaPonto;
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 64 64" aria-hidden>
      <Path
        d="M27 50C36 42 44 31 49 20"
        fill="none"
        stroke={adulto}
        strokeWidth={9}
        strokeLinecap="round"
      />
      <Circle cx={52.5} cy={9} r={6.2} fill={adulto} />
      <Path d="M27 50 17.5 38" fill="none" stroke={crianca} strokeWidth={9} strokeLinecap="round" />
      <Circle cx={12} cy={28} r={5.2} fill={ponto} />
    </Svg>
  );
}

/**
 * Marca do Vacina em Dia: um visto formado por um adulto e uma criança, com o nome ao lado. O
 * desenho é decorativo (o nome escrito já diz tudo ao leitor de tela) e usa as cores do tema atual.
 *
 * @param props.grande - Versão maior, para a tela de apresentação e a lateral das telas de entrada.
 * @param props.pequena - Versão menor, para a barra de navegação lateral.
 */
export function Logo({ grande = false, pequena = false }: { grande?: boolean; pequena?: boolean }) {
  const lado = grande ? 64 : pequena ? 36 : 40;
  const variante = grande ? 'titulo1' : pequena ? 'corpoNegrito' : 'titulo2';
  return (
    <View className="flex-row items-center gap-sm" accessibilityRole="header">
      <Simbolo tamanho={lado} />
      <Texto variante={variante}>
        {'Vacina '}
        <Texto variante={variante} className="text-primaria">
          em Dia
        </Texto>
      </Texto>
    </View>
  );
}
