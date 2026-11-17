import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { baseTokens } from '../theme/tokens';
import { useMovimentoReduzido } from '../theme/theme-provider';
import { CURVA, DURACAO, VistaAnimada } from './animacao';
import type { OpcaoDeRadio } from './grupo-de-radios';
import { Texto } from './texto';

/** Folga entre os segmentos, em dp (`espacamento.xs`). */
const FOLGA = baseTokens.spacing.xs;

/**
 * Seletor segmentado: poucas opções lado a lado em uma faixa, com a escolhida em destaque (tema,
 * tamanho do texto, tipo de membro). É um grupo de rádios: cada segmento tem 48 dp de altura ou
 * mais, o texto quebra de linha em vez de ser cortado, e a escolhida é anunciada ao leitor de tela
 * (e tem fundo da marca, não só uma cor diferente do texto). O fundo da marca é uma pílula que
 * desliza até o segmento escolhido em 250 ms; com "Reduzir movimento" salta direto.
 *
 * @param props.rotulo - Título do grupo (rótulo de acessibilidade).
 * @param props.valor - Valor escolhido agora.
 * @param props.opcoes - Opções, na ordem de exibição (de 2 a 4).
 * @param props.aoEscolher - Chamada com o valor tocado.
 */
export function Segmentado<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoEscolher,
}: {
  rotulo: string;
  valor: T;
  opcoes: readonly OpcaoDeRadio<T>[];
  aoEscolher: (valor: T) => void;
}) {
  const reduzido = useMovimentoReduzido();
  const [largura, setLargura] = useState(0);
  const indice = Math.max(
    0,
    opcoes.findIndex((opcao) => opcao.valor === valor),
  );
  const segmento = largura > 0 ? (largura - FOLGA * (opcoes.length - 1)) / opcoes.length : 0;
  const posicao = useRef(new Animated.Value(indice)).current;
  useEffect(() => {
    if (reduzido || segmento === 0) {
      posicao.setValue(indice);
      return undefined;
    }
    const animacao = Animated.timing(posicao, {
      toValue: indice,
      duration: DURACAO.passo,
      easing: CURVA.padrao,
      useNativeDriver: false,
    });
    animacao.start();
    return () => animacao.stop();
  }, [indice, reduzido, segmento, posicao]);

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={rotulo}
      className="rounded-quadro border-padrao border-borda bg-superficieSuave p-xs"
    >
      <View
        className="relative flex-row gap-xs"
        onLayout={(evento) => setLargura(evento.nativeEvent.layout.width)}
      >
        {segmento > 0 ? (
          <VistaAnimada
            aria-hidden
            pointerEvents="none"
            className="absolute bottom-0 top-0 rounded-botao bg-primaria"
            style={{
              width: segmento,
              left: posicao.interpolate({
                inputRange: [0, Math.max(1, opcoes.length - 1)],
                outputRange: [0, (segmento + FOLGA) * Math.max(1, opcoes.length - 1)],
              }),
            }}
          />
        ) : null}
        {opcoes.map((opcao) => {
          const escolhida = opcao.valor === valor;
          return (
            <Pressable
              key={opcao.valor}
              accessibilityRole="radio"
              accessibilityLabel={opcao.rotulo}
              accessibilityState={{ checked: escolhida }}
              // Na web, o estado só chega ao leitor de tela pela propriedade `aria-checked`.
              aria-checked={escolhida}
              onPress={() => aoEscolher(opcao.valor)}
              className={`min-h-toque flex-1 items-center justify-center rounded-botao px-sm py-xs ${
                // Antes de medir a faixa não há pílula: o escolhido já nasce com o fundo da marca.
                escolhida && segmento === 0 ? 'bg-primaria' : 'bg-transparent'
              }`}
            >
              <Texto
                variante="rotulo"
                className={`text-center ${escolhida ? 'text-sobrePrimaria' : 'text-texto'}`}
                importantForAccessibility="no"
              >
                {opcao.rotulo}
              </Texto>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
