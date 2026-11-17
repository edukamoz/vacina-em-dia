import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { VistaAnimada } from '../../components/animacao';
import { Cartao } from '../../components/cartao';
import { Icone } from '../../components/icone';
import { Texto } from '../../components/texto';
import { useMovimentoReduzido, useThemeColors, useVisual } from '../../theme/theme-provider';
import { Ondas } from './ondas';

/** Pinos do mapa de exemplo: posição em porcentagem da caixa. */
const PINOS = [
  { x: 22, y: 52 },
  { x: 44, y: 40 },
  { x: 70, y: 62 },
  { x: 84, y: 34 },
  { x: 58, y: 82 },
  { x: 12, y: 80 },
] as const;

/**
 * Ícone do sino que balança a cada 3,4 s (pausa de 2,6 s, depois cinco oscilações curtas). Parado com
 * "Reduzir movimento".
 */
function SinoQueBalanca({ cor }: { cor: string }) {
  const reduzido = useMovimentoReduzido();
  const giro = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduzido) {
      giro.setValue(0);
      return undefined;
    }
    const passo = (para: number) =>
      Animated.timing(giro, {
        toValue: para,
        duration: 160,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      });
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.delay(2600),
        passo(1),
        passo(-0.85),
        passo(0.55),
        passo(-0.3),
        passo(0),
      ]),
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [reduzido, giro]);
  return (
    <VistaAnimada
      style={{
        transform: [
          { rotate: giro.interpolate({ inputRange: [-1, 1], outputRange: ['-14deg', '14deg'] }) },
        ],
      }}
    >
      <Icone nome="lembrete" cor={cor} tamanho={32} />
    </VistaAnimada>
  );
}

/** Quadro de ícone dos recursos (fundo suave da marca, sem contorno fora do Alto contraste). */
function QuadroDeIcone({ icone }: { icone: 'lembrete' | 'voz' | 'familia' | 'local' }) {
  const cores = useThemeColors();
  return (
    <View
      aria-hidden
      className="h-[64px] w-[64px] items-center justify-center rounded-[20px] bg-primariaSuave"
    >
      {icone === 'lembrete' ? (
        <SinoQueBalanca cor={cores.primaria} />
      ) : (
        <Icone nome={icone} cor={cores.primaria} tamanho={32} />
      )}
    </View>
  );
}

/** Mapa de exemplo (desenho): ruas, a posição da pessoa e seis postos ao redor, numa área ampla. */
function MapaDeExemplo() {
  const cores = useThemeColors();
  return (
    <View
      aria-hidden
      className="relative h-[190px] w-full overflow-hidden rounded-[22px] bg-superficieSuave"
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <Path
          d="M-20 220 C 60 190, 120 240, 200 170 S 340 120, 430 140"
          fill="none"
          stroke={cores.bordaSuave}
          strokeWidth={9}
        />
        <Path
          d="M-20 90 C 80 110, 140 60, 230 80 S 360 40, 430 60"
          fill="none"
          stroke={cores.bordaSuave}
          strokeWidth={7}
        />
        <Path
          d="M120 -10 C 130 80, 170 140, 160 310"
          fill="none"
          stroke={cores.bordaSuave}
          strokeWidth={7}
        />
        <Path
          d="M290 -10 C 280 70, 320 150, 300 310"
          fill="none"
          stroke={cores.bordaSuave}
          strokeWidth={6}
        />
        <Path d="M-20 270 L 430 250" fill="none" stroke={cores.bordaSuave} strokeWidth={5} />
        <Circle
          cx={215}
          cy={150}
          r={30}
          fill="none"
          stroke={cores.agendada}
          strokeOpacity={0.25}
          strokeWidth={2}
        />
        <Circle
          cx={215}
          cy={150}
          r={9}
          fill={cores.agendada}
          stroke={cores.superficie}
          strokeWidth={4}
        />
      </Svg>
      {PINOS.map((pino) => (
        <View
          key={`${pino.x}-${pino.y}`}
          className="absolute"
          style={{ left: `${pino.x}%`, top: `${pino.y}%`, marginLeft: -11, marginTop: -22 }}
        >
          <Icone nome="local" cor={cores.primaria} tamanho={22} />
        </View>
      ))}
    </View>
  );
}

/** Gráfico em anel de exemplo: 7 de 10 doses aplicadas. */
function AnelDeExemplo() {
  const cores = useThemeColors();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Exemplo: 7 de 10 doses aplicadas"
      className="h-[150px] w-[150px] items-center justify-center"
    >
      <Svg width={150} height={150} viewBox="0 0 140 140">
        <G transform="rotate(-90 70 70)">
          <Circle cx={70} cy={70} r={60} fill="none" stroke={cores.bordaSuave} strokeWidth={16} />
          <Circle
            cx={70}
            cy={70}
            r={60}
            fill="none"
            stroke={cores.primaria}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray="264 377"
          />
        </G>
      </Svg>
      <View className="absolute items-center" importantForAccessibility="no">
        <Texto variante="titulo3">7 de 10</Texto>
        <Texto variante="rotulo" className="text-textoSecundario">
          aplicadas
        </Texto>
      </View>
    </View>
  );
}

/**
 * "O que o app faz": grade de recursos com visuais de interface (dados de exemplo): o assistente de
 * voz em destaque, os lembretes, o código de convite, o mapa de postos e o gráfico da família.
 */
export function RecursosDoApp() {
  const cores = useThemeColors();
  const { altoContraste, gradienteMarca, sombra } = useVisual();
  const cartao = 'gap-md overflow-hidden rounded-folha p-xl';
  return (
    <View className="gap-lg">
      <View className="gap-lg expandido:flex-row">
        <View
          style={[gradienteMarca, sombra(2)]}
          className={`${cartao} min-h-[340px] bg-primaria expandido:flex-[7] ${
            altoContraste ? 'border-altoContraste border-borda' : ''
          }`}
        >
          <Texto variante="titulo2" className="text-sobrePrimaria" accessibilityRole="header">
            Assistente por voz
          </Texto>
          <Texto className="text-sobrePrimaria">
            Pergunte falando ou escrevendo. As respostas são curadas e citam a fonte oficial. O app
            não dá orientação médica.
          </Texto>
          <View className="gap-sm pt-sm">
            <View className="max-w-[92%] self-start rounded-[22px] bg-superficieSuave px-lg py-md">
              <Texto>Quando é a próxima dose da Helena?</Texto>
            </View>
            <View className="max-w-[92%] self-end rounded-[22px] bg-superficie px-lg py-md">
              <Texto>A próxima é a Covid-19, reforço, agendada para 25/11/2026.</Texto>
              <Texto variante="rotulo" className="text-textoSecundario">
                Fonte: Calendário Nacional de Vacinação, Ministério da Saúde
              </Texto>
            </View>
          </View>
          <View className="mt-auto flex-row items-center gap-md pt-md">
            <View
              aria-hidden
              className="h-[54px] w-[54px] items-center justify-center rounded-selo bg-superficie"
            >
              <Icone nome="voz" cor={cores.primaria} tamanho={26} />
            </View>
            <Ondas cor={cores.sobrePrimaria} barras={7} altura={30} />
            <Texto variante="corpoNegrito" className="text-sobrePrimaria">
              Ouvindo
            </Texto>
          </View>
        </View>
        <Cartao className={`${cartao} expandido:flex-[5]`}>
          <QuadroDeIcone icone="lembrete" />
          <Texto variante="titulo3" accessibilityRole="header">
            Lembretes que não expõem ninguém
          </Texto>
          <Texto className="text-textoSecundario">
            Aviso às 8h, no dia da vacina e na antecedência que você escolher. O e-mail traz só a
            quantidade de vacinas, sem nomes.
          </Texto>
        </Cartao>
      </View>
      <View className="gap-lg expandido:flex-row">
        <Cartao className={`${cartao} expandido:flex-1`}>
          <Texto variante="titulo3" accessibilityRole="header">
            Vários responsáveis
          </Texto>
          <Texto className="text-textoSecundario">Convide quem cuida junto, com um código.</Texto>
          <View className="mt-auto flex-row items-center justify-between gap-md rounded-cartao border-padrao border-dashed border-borda px-lg py-md">
            <View>
              <Texto variante="rotulo" className="text-textoSecundario">
                Código de convite (exemplo)
              </Texto>
              <Texto variante="titulo2">K7M 4QX</Texto>
            </View>
          </View>
        </Cartao>
        <Cartao className={`${cartao} expandido:flex-1`}>
          <Texto variante="titulo3" accessibilityRole="header">
            Postos de saúde
          </Texto>
          <Texto className="text-textoSecundario">
            Veja os postos da região no mapa, escolha o mais perto e trace a rota.
          </Texto>
          <MapaDeExemplo />
        </Cartao>
        <Cartao className={`${cartao} expandido:flex-1`}>
          <Texto variante="titulo3" accessibilityRole="header">
            Painel da família
          </Texto>
          <Texto className="text-textoSecundario">
            A situação das vacinas em um gráfico simples.
          </Texto>
          <AnelDeExemplo />
        </Cartao>
      </View>
    </View>
  );
}
