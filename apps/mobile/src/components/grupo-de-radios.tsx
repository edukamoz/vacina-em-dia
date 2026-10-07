import { Pressable, View } from 'react-native';
import { Texto } from './texto';

/** Uma opção do grupo de rádios. */
export interface OpcaoDeRadio<T extends string> {
  readonly valor: T;
  readonly rotulo: string;
}

/**
 * Grupo de botões de rádio com todas as opções à vista (para poucas opções, como o tema). Cada
 * opção tem área de toque de pelo menos 48 dp, e a escolhida tem o círculo preenchido, o texto em
 * negrito e o estado anunciado ao leitor de tela: nada depende só da cor.
 *
 * @param props.rotulo - Título do grupo (também é o rótulo de acessibilidade).
 * @param props.valor - Valor escolhido agora.
 * @param props.opcoes - Opções, na ordem de exibição.
 * @param props.aoEscolher - Chamada com o valor tocado.
 */
export function GrupoDeRadios<T extends string>({
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
    <View accessibilityRole="radiogroup" accessibilityLabel={rotulo} className="gap-sm">
      {opcoes.map((opcao) => {
        const escolhida = opcao.valor === valor;
        return (
          <Pressable
            key={opcao.valor}
            accessibilityRole="radio"
            accessibilityLabel={opcao.rotulo}
            accessibilityState={{ checked: escolhida }}
            aria-checked={escolhida}
            onPress={() => aoEscolher(opcao.valor)}
            className="min-h-toque flex-row items-center gap-md"
          >
            <View
              className={`h-[24px] w-[24px] items-center justify-center rounded-selo border-padrao ${
                escolhida ? 'border-primaria' : 'border-borda'
              }`}
            >
              {escolhida ? <View className="h-[12px] w-[12px] rounded-selo bg-primaria" /> : null}
            </View>
            <Texto variante={escolhida ? 'corpoNegrito' : 'corpo'} importantForAccessibility="no">
              {opcao.rotulo}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
