import { Pressable, View } from 'react-native';
import type { OpcaoDeRadio } from './grupo-de-radios';
import { Texto } from './texto';

/**
 * Seletor segmentado: poucas opções lado a lado em uma faixa, com a escolhida em destaque (tema,
 * tamanho do texto, tipo de membro). É um grupo de rádios: cada segmento tem 48 dp de altura ou
 * mais, o texto quebra de linha em vez de ser cortado, e a escolhida é anunciada ao leitor de tela
 * (e tem fundo da marca, não só uma cor diferente do texto).
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
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={rotulo}
      className="flex-row gap-xs rounded-quadro border-padrao border-borda bg-superficieSuave p-xs"
    >
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
              escolhida ? 'bg-primaria' : 'bg-transparent'
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
  );
}
