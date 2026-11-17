import { forwardRef, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';
import tokensJson from '../../../../docs/04-design-system/tokens.json';
import { useMovimentoReduzido } from '../theme/theme-provider';

/**
 * Durações do design system, em milissegundos (`duracoes` em `tokens.json`, régua de movimento do
 * ADR-037): escalonamento 40, micro 80, rapida 150, passo 250, media 350, lenta 400, enfase 500.
 */
export const DURACAO = tokensJson.duracoes;

/** Curva padrão em CSS (`curvas.padrao`), para os poucos efeitos feitos com `transition` na web. */
export const CURVA_CSS = tokensJson.curvas.padrao;

/**
 * Curvas do design system (`curvas` em `tokens.json`): `padrao` para tudo que abre, fecha, desliza
 * ou muda de tamanho; `salto` só para entradas curtas (visto, interruptor, número), nunca em saída.
 */
export const CURVA = {
  padrao: Easing.bezier(0.22, 1, 0.36, 1),
  salto: Easing.bezier(0.34, 1.35, 0.64, 1),
} as const;

// O `Animated` do React Native força `collapsable={false}` em tudo que anima; na web esse atributo
// vai parar no DOM e o React reclama no console. Estes dois componentes o descartam.
const VistaSemColapso = forwardRef<View, ViewProps & { collapsable?: boolean }>(
  function VistaSemColapso(props, ref) {
    const { collapsable, ...rest } = props;
    void collapsable;
    return <View ref={ref} {...rest} />;
  },
);
const RolagemSemColapso = forwardRef<ScrollView, ScrollViewProps & { collapsable?: boolean }>(
  function RolagemSemColapso(props, ref) {
    const { collapsable, ...rest } = props;
    void collapsable;
    return <ScrollView ref={ref} {...rest} />;
  },
);

/** `View` animável (use no lugar de `Animated.View`). */
export const VistaAnimada = Animated.createAnimatedComponent(VistaSemColapso);
/** `ScrollView` animável (use no lugar de `Animated.ScrollView`). */
export const RolagemAnimadaBase = Animated.createAnimatedComponent(RolagemSemColapso);

/** A web não usa o driver nativo (ele só existe no Android e no iOS). */
export const USA_DRIVER_NATIVO = Platform.OS !== 'web';

/** Quantos itens seguidos escalonam; a partir daí todos entram juntos. */
const MAXIMO_ESCALONADO = 8;

/**
 * Entrada de um bloco ao trocar de tela: sobe 14 px e aparece em 350 ms, com 40 ms de atraso por posição
 * (até 8 itens). Com "Reduzir movimento" o bloco já aparece pronto, sem nenhuma camada extra.
 *
 * @param props.indice - Posição do bloco na tela, que define o atraso.
 */
export function Entrada({ indice = 0, children }: { indice?: number; children: ReactNode }) {
  const reduzido = useMovimentoReduzido();
  const progresso = useRef(new Animated.Value(reduzido ? 1 : 0)).current;

  useEffect(() => {
    if (reduzido) {
      progresso.setValue(1);
      return;
    }
    const animacao = Animated.timing(progresso, {
      toValue: 1,
      duration: DURACAO.media,
      delay: Math.min(indice, MAXIMO_ESCALONADO - 1) * DURACAO.escalonamento,
      easing: CURVA.padrao,
      useNativeDriver: USA_DRIVER_NATIVO,
    });
    animacao.start();
    return () => animacao.stop();
  }, [reduzido, indice, progresso]);

  if (reduzido) return <>{children}</>;
  return (
    <VistaAnimada
      style={{
        opacity: progresso,
        transform: [
          { translateY: progresso.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
        ],
      }}
    >
      {children}
    </VistaAnimada>
  );
}

/**
 * Valor que sobe de 0 até `final` em `duracao` ms, desacelerando. Com "Reduzir movimento" (ou no
 * primeiro quadro de um teste) vale `final` direto.
 *
 * @param final - Valor de chegada.
 * @param duracao - Duração em milissegundos.
 * @returns O valor atual, de 0 a `final`.
 */
export function useProgresso(final: number, duracao: number): number {
  const reduzido = useMovimentoReduzido();
  const [valor, setValor] = useState(reduzido ? final : 0);

  useEffect(() => {
    if (reduzido) {
      setValor(final);
      return;
    }
    const animado = new Animated.Value(0);
    const ouvinte = animado.addListener(({ value }) => setValor(value));
    const animacao = Animated.timing(animado, {
      toValue: final,
      duration: duracao,
      easing: CURVA.padrao,
      useNativeDriver: false,
    });
    animacao.start();
    return () => {
      animacao.stop();
      animado.removeListener(ouvinte);
    };
  }, [final, duracao, reduzido]);

  return valor;
}
