import { ActivityIndicator, View } from 'react-native';
import { Botao } from './botao';
import { Cartao } from './cartao';
import { Texto } from './texto';

/** Estado de carregamento: indicador com anúncio "Carregando" ao leitor de tela, sem tela em branco. */
export function EstadoCarregando({ rotulo }: { rotulo: string }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={rotulo}
      accessibilityLiveRegion="polite"
      className="items-center gap-sm py-xxl"
    >
      <ActivityIndicator size="large" />
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

/** Estado vazio: título que convida e, quando houver, um botão de ação. */
export function EstadoVazio({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <Cartao className="gap-sm">
      <Texto variante="titulo3" accessibilityRole="header">
        {titulo}
      </Texto>
      <Texto className="text-textoSecundario">{descricao}</Texto>
    </Cartao>
  );
}
