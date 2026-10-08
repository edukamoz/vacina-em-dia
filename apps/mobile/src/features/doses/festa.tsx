import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Cartao } from '../../components/cartao';
import { AparecerComMola } from '../../components/indicadores-animados';
import { Texto } from '../../components/texto';
import { useThemeColors } from '../../theme/theme-provider';
import { Simbolo } from '../auth/logo';

/** Brilho de quatro pontas centrado em (x, y). */
function Brilho({ x, y, cor, contorno }: { x: number; y: number; cor: string; contorno: string }) {
  return (
    <Path
      d={`M${x} ${y - 9}l2.5 6.5 6.5 2.5-6.5 2.5L${x} ${y + 9}l-2.5-6.5-6.5-2.5 6.5-2.5z`}
      fill={cor}
      stroke={contorno}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  );
}

/** Posição dos quatro brilhos dentro do quadro de 180 por 120. */
const POSICOES = [
  { x: 26, y: 34 },
  { x: 156, y: 30 },
  { x: 160, y: 92 },
  { x: 22, y: 90 },
] as const;

/**
 * Cartão comemorativo da aba Doses quando a pessoa não tem doses atrasadas nem pendentes: o
 * símbolo da marca cercado de brilhos (só decoração) e o texto que diz a mesma coisa.
 *
 * @param props.nome - Primeiro nome da pessoa.
 */
export function Festa({ nome }: { nome: string }) {
  const cores = useThemeColors();
  return (
    <Cartao className="items-center gap-sm border-padrao border-primaria bg-primariaSuave px-lg py-xxl">
      <View className="h-[120px] w-[180px] items-center justify-center" aria-hidden>
        {POSICOES.map(({ x, y }, indice) => (
          <View key={indice} style={{ position: 'absolute', left: x - 12, top: y - 12 }}>
            <AparecerComMola atraso={indice * 160}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Brilho x={12} y={12} cor={cores.decorSol} contorno={cores.texto} />
              </Svg>
            </AparecerComMola>
          </View>
        ))}
        <Simbolo tamanho={96} />
      </View>
      <Texto variante="titulo2" accessibilityRole="header">
        Tudo em dia por aqui
      </Texto>
      <Texto variante="apoio" className="text-center text-textoSecundario">
        {`${nome} não tem doses atrasadas nem pendentes.`}
      </Texto>
    </Cartao>
  );
}
