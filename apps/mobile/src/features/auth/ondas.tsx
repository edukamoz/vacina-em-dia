import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useMovimentoReduzido } from '../../theme/theme-provider';

const ATRASOS = [0, 400, 800, 1200, 200, 600, 1000] as const;

/**
 * Ondas de voz: barras que sobem e descem em ciclos de 1,6 s. Só decoração (escondida do leitor de
 * tela). Com "Reduzir movimento" ficam paradas, a 70% da altura.
 *
 * @param props.cor - Cor das barras.
 * @param props.barras - Quantas barras (até 7).
 * @param props.altura - Altura máxima, em pixels.
 */
export function Ondas({
  cor,
  barras = 5,
  altura = 22,
}: {
  cor: string;
  barras?: number;
  altura?: number;
}) {
  const reduzido = useMovimentoReduzido();
  const valores = useRef(ATRASOS.map(() => new Animated.Value(0.7))).current;

  useEffect(() => {
    if (reduzido) {
      valores.forEach((valor) => valor.setValue(0.7));
      return undefined;
    }
    const ciclos = valores.slice(0, barras).map((valor, indice) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(ATRASOS[indice] ?? 0),
          Animated.timing(valor, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(valor, {
            toValue: 0.25,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]),
      ),
    );
    ciclos.forEach((ciclo) => ciclo.start());
    return () => ciclos.forEach((ciclo) => ciclo.stop());
  }, [reduzido, valores, barras]);

  return (
    <View aria-hidden className="flex-row items-center gap-[3px]" style={{ height: altura }}>
      {valores.slice(0, barras).map((valor, indice) => (
        <Animated.View
          key={indice}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: cor,
            height: valor.interpolate({ inputRange: [0, 1], outputRange: [0, altura] }),
          }}
        />
      ))}
    </View>
  );
}
