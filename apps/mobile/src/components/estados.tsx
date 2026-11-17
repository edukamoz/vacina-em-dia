import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, View } from 'react-native';
import { useMovimentoReduzido } from '../theme/theme-provider';
import { VistaAnimada } from './animacao';
import { Botao } from './botao';
import { Cartao } from './cartao';
import { AzulejoDeMarca } from './azulejo-de-marca';
import type { NomeDoIcone } from './icone';
import { Texto } from './texto';

/**
 * Esqueleto de uma lista que carrega: blocos do tamanho de um cartão que pulsam devagar (1,4 s por
 * ciclo), para a tela já ter a forma do que vai chegar. É só decoração (escondida do leitor de
 * tela); quem anuncia o carregamento é o `EstadoCarregando`. Parado com "Reduzir movimento".
 */
function Esqueleto({ quantidade }: { quantidade: number }) {
  const reduzido = useMovimentoReduzido();
  const pulso = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduzido) {
      pulso.setValue(1);
      return undefined;
    }
    const ciclo = Animated.loop(
      Animated.sequence([
        Animated.timing(pulso, {
          toValue: 0.55,
          duration: 700,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
        Animated.timing(pulso, {
          toValue: 1,
          duration: 700,
          easing: Easing.linear,
          useNativeDriver: false,
        }),
      ]),
    );
    ciclo.start();
    return () => ciclo.stop();
  }, [reduzido, pulso]);
  return (
    <View aria-hidden className="gap-md" testID="esqueleto-da-lista">
      {Array.from({ length: quantidade }, (_, indice) => (
        <VistaAnimada
          key={indice}
          style={{ opacity: pulso }}
          className="h-[84px] rounded-cartao bg-superficieSuave"
        />
      ))}
    </View>
  );
}

/**
 * Estado de carregamento: anúncio "Carregando" ao leitor de tela, sem tela em branco. Em listas,
 * `esqueleto` mostra blocos no lugar do indicador; o conteúdo, ao chegar, entra com fade.
 *
 * @param props.esqueleto - Quantos blocos de esqueleto mostrar (0 usa o indicador de sempre).
 */
export function EstadoCarregando({
  rotulo,
  esqueleto = 0,
}: {
  rotulo: string;
  esqueleto?: number;
}) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={rotulo}
      accessibilityLiveRegion="polite"
      className={`items-center gap-sm ${esqueleto > 0 ? 'py-md' : 'py-xxl'}`}
    >
      {esqueleto > 0 ? (
        <View className="w-full">
          <Esqueleto quantidade={esqueleto} />
        </View>
      ) : (
        <ActivityIndicator size="large" />
      )}
      <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
        Carregando...
      </Texto>
    </View>
  );
}

/**
 * Estado de erro: diz o que aconteceu e o que fazer, com botão para tentar de novo. Nunca mostra
 * mensagem técnica.
 */
export function EstadoErro({
  mensagem,
  onTentarDeNovo,
}: {
  mensagem: string;
  onTentarDeNovo: () => void;
}) {
  return (
    <View
      accessibilityRole="alert"
      className="gap-md rounded-cartao border-padrao border-erro bg-erroSuave p-lg"
    >
      <Texto variante="corpoNegrito" className="text-erro">
        Algo deu errado
      </Texto>
      <Texto>{mensagem}</Texto>
      <Botao titulo="Tentar de novo" variante="secundario" onPress={onTentarDeNovo} />
    </View>
  );
}

/**
 * Estado vazio: título que convida, texto de apoio e, quando houver, um ícone no azulejo da marca.
 *
 * @param props.icone - Ícone decorativo no alto do cartão (opcional).
 */
export function EstadoVazio({
  titulo,
  descricao,
  icone,
}: {
  titulo: string;
  descricao: string;
  icone?: NomeDoIcone;
}) {
  return (
    <Cartao className="gap-sm">
      {icone ? <AzulejoDeMarca icone={icone} tamanho={56} /> : null}
      <Texto variante="titulo3" accessibilityRole="header">
        {titulo}
      </Texto>
      <Texto className="text-textoSecundario">{descricao}</Texto>
    </Cartao>
  );
}
