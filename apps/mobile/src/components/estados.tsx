import { ActivityIndicator, View } from 'react-native';
import { Botao } from './botao';
import { Cartao } from './cartao';
import { Icone, type NomeDoIcone } from './icone';
import { Texto } from './texto';
import { useThemeColors } from '../theme/theme-provider';

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
  const cores = useThemeColors();
  return (
    <Cartao className="gap-sm">
      {icone ? (
        <View
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          className="mb-xs h-[56px] w-[56px] items-center justify-center rounded-quadro bg-primariaSuave"
        >
          <Icone nome={icone} cor={cores.primaria} tamanho={28} />
        </View>
      ) : null}
      <Texto variante="titulo3" accessibilityRole="header">
        {titulo}
      </Texto>
      <Texto className="text-textoSecundario">{descricao}</Texto>
    </Cartao>
  );
}
