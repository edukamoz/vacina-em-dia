import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useMovimentoReduzido } from '../theme/theme-provider';

/** Durações do design system, em milissegundos (`duracoes` em `tokens.json`). */
export const DURACAO = { rapida: 120, padrao: 200, enfatica: 320, lenta: 400, passo: 55 } as const;

/** Curvas do design system (`curvas` em `tokens.json`). */
export const CURVA = {
  padrao: Easing.bezier(0.2, 0, 0, 1),
  saida: Easing.bezier(0.2, 0.8, 0.2, 1),
  mola: Easing.bezier(0.34, 1.56, 0.64, 1),
} as const;

/** A web não usa o driver nativo (ele só existe no Android e no iOS). */
export const USA_DRIVER_NATIVO = Platform.OS !== 'web';

/** Quantos itens seguidos escalonam; a partir daí todos entram juntos. */
const MAXIMO_ESCALONADO = 8;

/**
 * Entrada de um bloco ao trocar de tela: sobe 14 px e aparece, com um pequeno atraso por posição
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
      duration: DURACAO.enfatica,
      delay: Math.min(indice, MAXIMO_ESCALONADO - 1) * DURACAO.passo,
      easing: CURVA.saida,
      useNativeDriver: USA_DRIVER_NATIVO,
    });
    animacao.start();
    return () => animacao.stop();
  }, [reduzido, indice, progresso]);

  if (reduzido) return <>{children}</>;
  return (
    <Animated.View
      style={{
        opacity: progresso,
        transform: [
          { translateY: progresso.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
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
      easing: CURVA.saida,
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
