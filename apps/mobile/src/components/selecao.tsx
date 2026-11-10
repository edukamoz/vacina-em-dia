import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useEstiloDoTema } from '../theme/theme-provider';
import { Texto } from './texto';

/** Uma opção da seleção: o valor guardado e o texto mostrado. */
export interface OpcaoDeSelecao<T extends string> {
  readonly valor: T | null;
  readonly rotulo: string;
}

/** Altura de uma opção (área de toque de 48 dp) e teto da lista flutuante. */
const ALTURA_DA_OPCAO = 48;
const ALTURA_MAXIMA = 288;
const FOLGA = 12;

/** Onde o botão está na janela, para a lista abrir colada nele. */
interface Posicao {
  readonly x: number;
  readonly y: number;
  readonly largura: number;
  readonly altura: number;
}

/**
 * Seleção de uma opção entre várias (um "select" que funciona igual na web, no Android e no iOS,
 * sem depender de biblioteca nativa). O botão mostra a escolha atual; ao tocar, a lista **flutua**
 * por cima da tela, colada no botão (abaixo dele ou, se não couber, acima), sem empurrar o
 * conteúdo. Tocar fora, voltar ou Esc fecha. Cada opção é um botão de rádio com área de toque de
 * pelo menos 48 dp, e a escolha atual tem marca (✔) além da cor.
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
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const botao = useRef<View>(null);
  const janela = useWindowDimensions();
  const estiloDoTema = useEstiloDoTema();
  const atual = opcoes.find((opcao) => opcao.valor === valor);

  const abrir = () => {
    setAberta(true);
    botao.current?.measureInWindow((x, y, largura, altura) =>
      setPosicao({ x, y, largura, altura }),
    );
  };

  // Abaixo do botão, se couber a lista inteira (ou se houver mais espaço ali); senão, acima.
  const alturaDaLista = Math.min(ALTURA_MAXIMA, opcoes.length * ALTURA_DA_OPCAO + 4);
  const abaixo = posicao ? janela.height - (posicao.y + posicao.altura) - FOLGA : 0;
  const acima = posicao ? posicao.y - FOLGA : 0;
  const paraCima = posicao !== null && abaixo < alturaDaLista && acima > abaixo;
  const lugar = posicao
    ? paraCima
      ? { bottom: janela.height - posicao.y + 4, maxHeight: Math.min(alturaDaLista, acima - 4) }
      : { top: posicao.y + posicao.altura + 4, maxHeight: Math.min(alturaDaLista, abaixo - 4) }
    : { top: 96, maxHeight: alturaDaLista };

  return (
    <View className="gap-xs">
      <Texto variante="rotulo">{rotulo}</Texto>
      <Pressable
        ref={botao}
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${atual?.rotulo ?? 'nenhuma'}`}
        accessibilityState={{ expanded: aberta }}
        aria-expanded={aberta}
        onPress={() => (aberta ? setAberta(false) : abrir())}
        className="min-h-toque flex-row items-center justify-between rounded-campo border-padrao border-borda bg-superficie px-lg py-md"
      >
        <Texto importantForAccessibility="no">{atual?.rotulo ?? ''}</Texto>
        <Texto variante="rotulo" importantForAccessibility="no">
          {aberta ? '▲' : '▼'}
        </Texto>
      </Pressable>
      <Modal
        visible={aberta}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setAberta(false)}
      >
        {/* O Modal fica fora da árvore do tema: as variáveis de cor precisam ir junto. */}
        <View style={[{ flex: 1 }, estiloDoTema]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar a lista"
            onPress={() => setAberta(false)}
            className="absolute inset-0"
          />
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={rotulo}
            style={{
              position: 'absolute',
              left: posicao?.x ?? 16,
              width: posicao?.largura ?? janela.width - 32,
              ...lugar,
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
            }}
            className="overflow-hidden rounded-campo border-padrao border-borda bg-superficie"
          >
            <ScrollView keyboardShouldPersistTaps="handled">
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
                      <Texto
                        variante="rotulo"
                        className="text-primaria"
                        importantForAccessibility="no"
                      >
                        ✔
                      </Texto>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
