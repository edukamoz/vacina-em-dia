import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useMovimentoReduzido } from '../theme/theme-provider';
import { CURVA, DURACAO, USA_DRIVER_NATIVO, VistaAnimada } from './animacao';
import { Texto } from './texto';

/** Quanto o botão da chave anda de uma ponta à outra, em dp (trilho de 56 menos botão e bordas). */
const PERCURSO = 24;

/**
 * Chave de liga e desliga (lembretes por e-mail, por exemplo). Mostra o rótulo, o estado em texto
 * ("Ligado" ou "Desligado") e a posição do botão, então nada depende só da cor. Área de toque de
 * pelo menos 48 dp e papel `switch` para o leitor de tela. O botão atravessa o trilho em 350 ms e
 * passa um pouco do fim antes de assentar (curva `salto`); com "Reduzir movimento" troca na hora.
 *
 * @param props.rotulo - Texto ao lado da chave (também é o rótulo de acessibilidade).
 * @param props.ligada - Se está ligada.
 * @param props.aoAlterar - Chamada com o novo valor.
 */
export function Chave({
  rotulo,
  ligada,
  aoAlterar,
}: {
  rotulo: string;
  ligada: boolean;
  aoAlterar: (valor: boolean) => void;
}) {
  const reduzido = useMovimentoReduzido();
  const posicao = useRef(new Animated.Value(ligada ? 1 : 0)).current;
  useEffect(() => {
    if (reduzido) {
      posicao.setValue(ligada ? 1 : 0);
      return undefined;
    }
    const animacao = Animated.timing(posicao, {
      toValue: ligada ? 1 : 0,
      duration: DURACAO.media,
      easing: CURVA.salto,
      useNativeDriver: USA_DRIVER_NATIVO,
    });
    animacao.start();
    return () => animacao.stop();
  }, [ligada, reduzido, posicao]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: ligada }}
      // Na web, o estado só chega ao leitor de tela pela propriedade `aria-checked`.
      aria-checked={ligada}
      onPress={() => aoAlterar(!ligada)}
      className="min-h-toque flex-row items-center justify-between gap-md"
    >
      <Texto className="flex-1" importantForAccessibility="no">
        {rotulo}
      </Texto>
      <View className="flex-row items-center gap-sm">
        <Texto variante="rotulo" className="text-textoSecundario" importantForAccessibility="no">
          {ligada ? 'Ligado' : 'Desligado'}
        </Texto>
        <View
          className={`h-[32px] w-[56px] justify-center rounded-selo border-padrao px-[2px] ${
            ligada ? 'border-primaria bg-primaria' : 'border-borda bg-superficieSuave'
          }`}
        >
          <VistaAnimada
            className={`h-[24px] w-[24px] rounded-selo ${ligada ? 'bg-sobrePrimaria' : 'bg-borda'}`}
            style={{
              transform: [
                {
                  translateX: posicao.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, PERCURSO],
                  }),
                },
              ],
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}
