import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useMovimentoReduzido } from '../theme/theme-provider';
import { CURVA, USA_DRIVER_NATIVO, VistaAnimada } from './animacao';

const CaminhoAnimado = Animated.createAnimatedComponent(Path);

/** Tamanho do traço do visto do ícone "aplicada" (um pouco acima do comprimento real, 11,5). */
const TRACO_DO_VISTO = 14;

/** Duração de um ciclo da onda da voz e dos pontos de "escrevendo". */
const CICLO = 900;

/**
 * Ícone "aplicada" em que o visto se desenha em 520 ms ao aparecer. Com "Reduzir movimento" o
 * visto já vem pronto.
 *
 * @param props.cor - Cor do traço.
 * @param props.tamanho - Lado em pixels.
 */
export function VistoDesenhado({ cor, tamanho = 24 }: { cor: string; tamanho?: number }) {
  const reduzido = useMovimentoReduzido();
  const traco = useRef(new Animated.Value(reduzido ? 0 : TRACO_DO_VISTO)).current;

  useEffect(() => {
    if (reduzido) {
      traco.setValue(0);
      return undefined;
    }
    const animacao = Animated.timing(traco, {
      toValue: 0,
      duration: 520,
      easing: CURVA.saida,
      useNativeDriver: false,
    });
    animacao.start();
    return () => animacao.stop();
  }, [reduzido, traco]);

  return (
    <Svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <Circle cx="12" cy="12" r="9" />
      <CaminhoAnimado
        d="M8 12.2l2.8 2.8L16 9.5"
        strokeDasharray={TRACO_DO_VISTO}
        strokeDashoffset={traco}
      />
    </Svg>
  );
}

/**
 * Faz o filho aparecer crescendo (de 0 a 1) com a curva de mola, depois de um atraso. Usado nos
 * brilhos da comemoração, um a um. Com "Reduzir movimento" aparece pronto.
 *
 * @param props.atraso - Espera antes de começar, em milissegundos.
 */
export function AparecerComMola({
  atraso = 0,
  children,
}: {
  atraso?: number;
  children: ReactNode;
}) {
  const reduzido = useMovimentoReduzido();
  const escala = useRef(new Animated.Value(reduzido ? 1 : 0)).current;

  useEffect(() => {
    if (reduzido) {
      escala.setValue(1);
      return undefined;
    }
    const animacao = Animated.timing(escala, {
      toValue: 1,
      duration: 500,
      delay: atraso,
      easing: CURVA.mola,
      useNativeDriver: USA_DRIVER_NATIVO,
    });
    animacao.start();
    return () => animacao.stop();
  }, [reduzido, atraso, escala]);

  return (
    <VistaAnimada
      style={{
        opacity: escala.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }),
        transform: [{ scale: escala }],
      }}
    >
      {children}
    </VistaAnimada>
  );
}

/**
 * Barras da "onda" mostrada enquanto o microfone grava: cada uma sobe e desce em ritmo próprio
 * (900 ms por ciclo). Com "Reduzir movimento" ficam paradas.
 *
 * @param props.alturas - Altura de cada barra, em pixels.
 */
export function OndaDaVoz({ alturas }: { alturas: readonly number[] }) {
  const reduzido = useMovimentoReduzido();
  const fase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduzido) return undefined;
    const laco = Animated.loop(
      Animated.timing(fase, {
        toValue: 1,
        duration: CICLO,
        easing: CURVA.padrao,
        useNativeDriver: USA_DRIVER_NATIVO,
      }),
    );
    laco.start();
    return () => laco.stop();
  }, [reduzido, fase]);

  return (
    <View className="h-[48px] flex-row items-center justify-center gap-[5px]" aria-hidden>
      {alturas.map((altura, indice) => {
        // Cada barra começa numa fase diferente para a onda não subir toda junta.
        const escala = reduzido
          ? 1
          : fase.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: indice % 2 === 0 ? [0.45, 1, 0.45] : [1, 0.45, 1],
            });
        return (
          <VistaAnimada
            key={indice}
            className="w-[6px] rounded-selo bg-primaria"
            style={{ height: altura, transform: [{ scaleY: escala }] }}
          />
        );
      })}
    </View>
  );
}

/**
 * Três pontos de "o assistente está escrevendo": acendem em sequência, 900 ms por ciclo e no
 * máximo 3 vezes (nada fica em laço sem fim). Com "Reduzir movimento" ficam parados.
 */
export function PontosEscrevendo() {
  const reduzido = useMovimentoReduzido();
  const fase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduzido) return undefined;
    const laco = Animated.loop(
      Animated.timing(fase, {
        toValue: 1,
        duration: CICLO,
        easing: CURVA.padrao,
        useNativeDriver: USA_DRIVER_NATIVO,
      }),
      { iterations: 3 },
    );
    laco.start();
    return () => laco.stop();
  }, [reduzido, fase]);

  return (
    <>
      {[0, 1, 2].map((ponto) => {
        const opacidade = reduzido
          ? 1
          : fase.interpolate({
              inputRange: [0, ponto / 3 + 0.01, Math.min(ponto / 3 + 0.33, 0.99), 1],
              outputRange: [0.35, 0.35, 1, 0.35],
            });
        return (
          <VistaAnimada
            key={ponto}
            className="h-[10px] w-[10px] rounded-selo bg-textoSecundario"
            style={{ opacity: opacidade }}
          />
        );
      })}
    </>
  );
}
