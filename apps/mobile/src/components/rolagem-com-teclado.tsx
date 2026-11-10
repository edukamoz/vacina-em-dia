import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from 'react-native';
import { rolagemParaVerCampo, sobreposicaoDoTeclado } from '../lib/teclado';

/**
 * Ocupa o espaço que sobra, mas sem fixar a altura em zero (`flex: 1` faria isso): numa janela com
 * altura só máxima (a folha do celular), a rolagem precisa medir o conteúdo para saber o tamanho.
 */
const CRESCE = { flexGrow: 1, flexShrink: 1 } as const;

const EVENTOS_DO_TECLADO =
  Platform.OS === 'ios'
    ? ({ mostrar: 'keyboardWillChangeFrame', esconder: 'keyboardWillHide' } as const)
    : ({ mostrar: 'keyboardDidShow', esconder: 'keyboardDidHide' } as const);

/**
 * Quanto do quadro o teclado cobre agora, em pixels (0 sem teclado, e sempre 0 na web, onde o
 * navegador já cuida disso). Mede o quadro na janela a cada abertura ou mudança do teclado, então
 * funciona igual no iOS, no Android que redimensiona a janela e no Android de tela inteira, que não
 * redimensiona.
 *
 * @param quadro - Referência da vista cujo fundo se compara ao topo do teclado. Ela não deve se
 *   mover com o resultado (senão a conta gira em círculo): meça uma vista fixa.
 */
export function useSobreposicaoDoTeclado(quadro: RefObject<View | null>): number {
  const [sobreposicao, setSobreposicao] = useState(0);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const mostrar = Keyboard.addListener(EVENTOS_DO_TECLADO.mostrar, (evento) => {
      const topoDoTeclado = evento.endCoordinates.screenY;
      quadro.current?.measureInWindow((_x, y, _largura, altura) => {
        setSobreposicao(sobreposicaoDoTeclado(y + altura, topoDoTeclado));
      });
    });
    const esconder = Keyboard.addListener(EVENTOS_DO_TECLADO.esconder, () => setSobreposicao(0));
    return () => {
      mostrar.remove();
      esconder.remove();
    };
  }, [quadro]);
  return sobreposicao;
}

/** Qualquer campo que sabe medir a própria posição dentro de outra vista (`View`, `TextInput`). */
type CampoMedivel = Pick<View, 'measureInWindow'>;

/** Pede à rolagem mais próxima que mostre o campo. `null` fora de uma `RolagemComTeclado`. */
const RolarParaCampoContext = createContext<((campo: CampoMedivel | null) => void) | null>(null);

/** Devolve a função que rola a tela até o campo; `null` quando não há rolagem por perto. */
export function useRolarParaCampo(): ((campo: CampoMedivel | null) => void) | null {
  return useContext(RolarParaCampoContext);
}

/**
 * `ScrollView` que não deixa o teclado cobrir o que a pessoa digita: encolhe a área de rolagem
 * pela parte coberta pelo teclado (o último campo sempre alcança a tela) e, quando um campo ganha
 * o foco, rola até ele. Os campos avisam o foco por `useRolarParaCampo` (o `CampoTexto` já faz).
 * Aceita as mesmas propriedades de um `ScrollView`.
 */
export function RolagemComTeclado({ children, onScroll, onLayout, ...resto }: ScrollViewProps) {
  const quadro = useRef<View>(null);
  const rolagem = useRef<ScrollView>(null);
  const posicao = useRef({ y: 0, altura: 0 });
  const coberto = useSobreposicaoDoTeclado(quadro);

  const aoRolar = (evento: NativeSyntheticEvent<NativeScrollEvent>) => {
    posicao.current.y = evento.nativeEvent.contentOffset.y;
    onScroll?.(evento);
  };
  const aoMedir = (evento: LayoutChangeEvent) => {
    posicao.current.altura = evento.nativeEvent.layout.height;
    onLayout?.(evento);
  };

  const rolarParaCampo = useCallback((campo: CampoMedivel | null) => {
    const alvo = rolagem.current;
    const moldura = quadro.current;
    if (!campo || !alvo || !moldura) return;
    // Espera o teclado terminar de subir: só então a área visível tem o tamanho final.
    setTimeout(() => {
      // O quadro e a rolagem começam no mesmo ponto (o quadro só acrescenta folga embaixo).
      moldura.measureInWindow((_x, topoDaRolagem) => {
        campo.measureInWindow((_cx, topoDoCampo, _largura, altura) => {
          // Posição do campo dentro do conteúdo: a distância até o topo da rolagem mais o que já rolou.
          const noConteudo = topoDoCampo - topoDaRolagem + posicao.current.y;
          const destino = rolagemParaVerCampo(
            noConteudo,
            altura,
            posicao.current.y,
            posicao.current.altura,
          );
          if (destino !== null) alvo.scrollTo({ y: destino, animated: true });
        });
      });
    }, 120);
  }, []);

  if (Platform.OS === 'web') {
    return (
      <ScrollView {...resto} onScroll={onScroll} onLayout={onLayout}>
        {children}
      </ScrollView>
    );
  }
  return (
    <RolarParaCampoContext.Provider value={rolarParaCampo}>
      <View ref={quadro} style={CRESCE}>
        <View style={[CRESCE, { paddingBottom: coberto }]}>
          <ScrollView
            ref={rolagem}
            keyboardShouldPersistTaps="handled"
            {...resto}
            onScroll={aoRolar}
            scrollEventThrottle={16}
            onLayout={aoMedir}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </RolarParaCampoContext.Provider>
  );
}
