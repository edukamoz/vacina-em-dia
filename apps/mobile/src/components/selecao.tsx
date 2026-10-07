import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Texto } from './texto';

/** Uma opção da seleção: o valor guardado e o texto mostrado. */
export interface OpcaoDeSelecao<T extends string> {
  readonly valor: T | null;
  readonly rotulo: string;
}

/**
 * Seleção de uma opção entre várias (um "select" que funciona igual na web, no Android e no iOS,
 * sem depender de biblioteca nativa). O botão mostra a escolha atual; ao tocar, a lista abre logo
 * abaixo e cada opção é um botão de rádio com área de toque de pelo menos 48 dp. A escolha atual
 * tem marca (✔) além da cor.
 *
 * @param props.rotulo - Texto acima do campo (também é o rótulo de acessibilidade).
 * @param props.valor - Valor escolhido; `null` para "nenhum".
 * @param props.opcoes - Opções, na ordem de exibição (a de valor `null` é a de "não informar").
 * @param props.aoEscolher - Chamada com o valor escolhido; a lista fecha em seguida.
 */
export function Selecao<T extends string>({
  rotulo,
  valor,
  opcoes,
  aoEscolher,
}: {
  rotulo: string;
  valor: T | null;
  opcoes: readonly OpcaoDeSelecao<T>[];
  aoEscolher: (valor: T | null) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const atual = opcoes.find((opcao) => opcao.valor === valor);

  return (
    <View className="gap-xs">
      <Texto variante="rotulo">{rotulo}</Texto>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${atual?.rotulo ?? 'nenhuma'}`}
        accessibilityState={{ expanded: aberta }}
        aria-expanded={aberta}
        onPress={() => setAberta((estaAberta) => !estaAberta)}
        className="min-h-toque flex-row items-center justify-between rounded-campo border-padrao border-borda bg-superficie px-lg py-md"
      >
        <Texto importantForAccessibility="no">{atual?.rotulo ?? ''}</Texto>
        <Texto variante="rotulo" importantForAccessibility="no">
          {aberta ? '▲' : '▼'}
        </Texto>
      </Pressable>
      {aberta ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={rotulo}
          className="overflow-hidden rounded-campo border-padrao border-borda bg-superficie"
        >
          {opcoes.map((opcao) => {
            const escolhida = opcao.valor === valor;
            return (
              <Pressable
                key={opcao.valor ?? 'nenhuma'}
                accessibilityRole="radio"
                accessibilityLabel={opcao.rotulo}
                accessibilityState={{ checked: escolhida }}
                aria-checked={escolhida}
                onPress={() => {
                  aoEscolher(opcao.valor);
                  setAberta(false);
                }}
                className={`min-h-toque flex-row items-center justify-between px-lg py-md hover:bg-primariaSuave ${
                  escolhida ? 'bg-primariaSuave' : ''
                }`}
              >
                <Texto
                  variante={escolhida ? 'corpoNegrito' : 'corpo'}
                  importantForAccessibility="no"
                >
                  {opcao.rotulo}
                </Texto>
                {escolhida ? (
                  <Texto variante="rotulo" className="text-primaria" importantForAccessibility="no">
                    ✔
                  </Texto>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
