import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useThemeColors } from '../theme/theme-provider';
import { useProgresso } from './animacao';
import { Texto } from './texto';

const RAIO = 48;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

/**
 * Anel que mostra quantas doses da pessoa já foram aplicadas. É uma imagem com rótulo de texto
 * ("2 de 5 doses aplicadas"): o número no centro e a frase ao lado dizem o mesmo que o traço.
 *
 * @param props.aplicadas - Doses aplicadas.
 * @param props.total - Total de doses consideradas (sem as canceladas).
 */
export function AnelProgresso({ aplicadas, total }: { aplicadas: number; total: number }) {
  const cores = useThemeColors();
  const fracaoFinal = total > 0 ? Math.min(aplicadas / total, 1) : 0;
  // O traço se desenha em 900 ms e o número sobe em 600 ms; com "Reduzir movimento" já chegam prontos.
  const fracao = useProgresso(fracaoFinal, 900);
  const contagem = Math.round(useProgresso(aplicadas, 600));
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${aplicadas} de ${total} doses aplicadas`}
      className="h-[112px] w-[112px] items-center justify-center"
    >
      <Svg width={112} height={112} viewBox="0 0 112 112" style={{ position: 'absolute' }}>
        <Circle cx={56} cy={56} r={RAIO} fill="none" stroke={cores.bordaSuave} strokeWidth={12} />
        <Circle
          cx={56}
          cy={56}
          r={RAIO}
          fill="none"
          stroke={cores.primaria}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={CIRCUNFERENCIA}
          strokeDashoffset={CIRCUNFERENCIA * (1 - fracao)}
          transform="rotate(-90 56 56)"
        />
      </Svg>
      <Texto variante="titulo2" importantForAccessibility="no">
        {String(contagem)}
      </Texto>
      <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
        {`de ${total}`}
      </Texto>
    </View>
  );
}
