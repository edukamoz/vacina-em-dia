import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import { useMovimentoReduzido } from '../theme/theme-provider';
import { DURACAO, RolagemAnimadaBase, VistaAnimada } from './animacao';

/** Posição vertical da rolagem, compartilhada com `Revelar` e `Paralaxe` (sem re-renderizar). */
const PosicaoDaRolagem = createContext<Animated.Value | null>(null);

/**
 * Rolagem que informa a posição aos filhos. É o que dá o "revelar na rolagem" e a paralaxe da tela
 * de apresentação; as outras telas usam a rolagem comum.
 */
export function RolagemAnimada({ children }: { children: ReactNode }) {
  const posicao = useRef(new Animated.Value(0)).current;
  const aoRolar = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: posicao } } }], {
        useNativeDriver: false,
      }),
    [posicao],
  );
  return (
    <PosicaoDaRolagem.Provider value={posicao}>
      <RolagemAnimadaBase onScroll={aoRolar} scrollEventThrottle={16}>
        {children}
      </RolagemAnimadaBase>
    </PosicaoDaRolagem.Provider>
  );
}

/**
 * Revela a seção quando ela entra na tela durante a rolagem: sobe 24 px e aparece ao longo de
 * `duracao-lenta`-equivalente de rolagem. Sempre visível com "Reduzir movimento" e fora de uma
 * `RolagemAnimada`. Seções já visíveis ao abrir a página aparecem prontas.
 */
export function Revelar({ children }: { children: ReactNode }) {
  const rolagem = useContext(PosicaoDaRolagem);
  const reduzido = useMovimentoReduzido();
  const altura = useWindowDimensions().height;
  const [topo, setTopo] = useState<number | null>(null);

  if (reduzido || !rolagem) return <>{children}</>;

  // Antes de medir a seção fica visível: nunca esconde conteúdo sem saber onde ele está.
  const inicio = (topo ?? 0) - altura + 48;
  const progresso =
    topo === null
      ? 1
      : rolagem.interpolate({
          inputRange: [inicio, inicio + DURACAO.lenta],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });
  return (
    <View onLayout={(evento: LayoutChangeEvent) => setTopo(evento.nativeEvent.layout.y)}>
      <VistaAnimada
        style={{
          opacity: progresso,
          transform: [
            {
              translateY:
                typeof progresso === 'number'
                  ? 0
                  : progresso.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }),
            },
          ],
        }}
      >
        {children}
      </VistaAnimada>
    </View>
  );
}

/**
 * Faz o filho andar mais devagar que a rolagem (paralaxe), até `maximo` pixels. Parado com
 * "Reduzir movimento" e fora de uma `RolagemAnimada`.
 *
 * @param props.fator - Quanto anda para cada pixel rolado (por exemplo `0.08`).
 * @param props.maximo - Deslocamento máximo, em pixels (entre 12 e 26 no design).
 */
export function Paralaxe({
  fator,
  maximo,
  children,
  ...rest
}: {
  fator: number;
  maximo: number;
  children: ReactNode;
  className?: string;
  style?: object;
  'aria-hidden'?: boolean;
}) {
  const rolagem = useContext(PosicaoDaRolagem);
  const reduzido = useMovimentoReduzido();
  if (reduzido || !rolagem) {
    return <VistaAnimada {...rest}>{children}</VistaAnimada>;
  }
  const deslocamento = rolagem.interpolate({
    inputRange: [0, maximo / fator],
    outputRange: [0, maximo],
    extrapolate: 'clamp',
  });
  return (
    <VistaAnimada {...rest} style={[rest.style, { transform: [{ translateY: deslocamento }] }]}>
      {children}
    </VistaAnimada>
  );
}
