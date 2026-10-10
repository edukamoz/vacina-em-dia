import { vars } from 'nativewind';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, useColorScheme, View, type ViewStyle } from 'react-native';
import {
  ESCALA_DO_TEXTO,
  guardarPreferencias,
  lerPreferencias,
  MOVIMENTO_PADRAO,
  type ModoDeMovimento,
  type TamanhoDoTexto,
} from './preferencias';
import { resolveTheme, type ThemePreference } from './resolve-theme';
import {
  getBackgroundGradient,
  getBrandGradient,
  getShadow,
  getThemeColors,
  type ThemeName,
} from './tokens';

/** Valor entregue pelo contexto de tema. */
export interface ThemeContextValue {
  /** Tema aplicado agora. */
  readonly theme: ThemeName;
  /** Escolha do usuário (inclui "seguir o sistema"). */
  readonly preference: ThemePreference;
  /** Troca a escolha do usuário. */
  readonly setPreference: (preference: ThemePreference) => void;
  /** Se o movimento deve ficar parado: escolha da pessoa, preferência do sistema ou Alto contraste. */
  readonly movimentoReduzido: boolean;
  /** Escolha da pessoa na Conta: animar sempre, seguir o aparelho ou reduzir. */
  readonly movimento: ModoDeMovimento;
  /** Troca o modo de movimento. */
  readonly setMovimento: (valor: ModoDeMovimento) => void;
  /** Tamanho do texto escolhido. */
  readonly tamanhoDoTexto: TamanhoDoTexto;
  /** Troca o tamanho do texto. */
  readonly setTamanhoDoTexto: (valor: TamanhoDoTexto) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Aplica o tema às telas: grava as cores como variáveis CSS (`--cor-<token>`) que as classes do
 * NativeWind (`bg-fundo`, `text-texto`...) consomem. Guarda a escolha do usuário na Context API
 * (ADR-006).
 *
 * Também guarda, neste aparelho, o modo de movimento e o tamanho do texto, e acompanha a
 * preferência de movimento do sistema.
 *
 * @param props.initialPreference - Escolha inicial; por padrão segue o sistema.
 * @param props.initialReduceMotion - `true` começa em "Reduzir movimento" (os testes ligam para não animar); senão começa em "Animar sempre".
 * @param props.initialTextSize - Tamanho do texto inicial.
 */
export function ThemeProvider({
  children,
  initialPreference = 'system',
  initialReduceMotion = false,
  initialTextSize = 'normal',
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
  initialReduceMotion?: boolean;
  initialTextSize?: TamanhoDoTexto;
}) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const [movimento, setMovimento] = useState<ModoDeMovimento>(
    initialReduceMotion ? 'reduzir' : MOVIMENTO_PADRAO,
  );
  const [tamanhoDoTexto, setTamanhoDoTexto] = useState<TamanhoDoTexto>(initialTextSize);
  const [movimentoDoSistema, setMovimentoDoSistema] = useState(false);
  const systemScheme = useColorScheme();
  const theme = resolveTheme(preference, systemScheme);

  useEffect(() => {
    let ativo = true;
    void lerPreferencias().then((guardadas) => {
      if (!ativo) return;
      if (guardadas.movimento !== undefined) setMovimento(guardadas.movimento);
      if (guardadas.tamanhoDoTexto !== undefined) setTamanhoDoTexto(guardadas.tamanhoDoTexto);
    });
    void AccessibilityInfo.isReduceMotionEnabled?.()
      .then((ligado) => ativo && setMovimentoDoSistema(ligado))
      .catch(() => undefined);
    const assinatura = AccessibilityInfo.addEventListener?.(
      'reduceMotionChanged',
      setMovimentoDoSistema,
    );
    return () => {
      ativo = false;
      assinatura?.remove();
    };
  }, []);

  const movimentoReduzido =
    theme === 'highContrast' ||
    movimento === 'reduzir' ||
    (movimento === 'sistema' && movimentoDoSistema);

  // A web usa o CSS global (global.css), que só anima quando <html> não está marcado como reduzido.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.dataset.movimento = movimentoReduzido ? 'reduzido' : 'normal';
  }, [movimentoReduzido]);

  const value = useMemo(
    () => ({
      theme,
      preference,
      setPreference,
      movimentoReduzido,
      movimento,
      setMovimento: (valor: ModoDeMovimento) => {
        setMovimento(valor);
        void guardarPreferencias({ movimento: valor, tamanhoDoTexto });
      },
      tamanhoDoTexto,
      setTamanhoDoTexto: (valor: TamanhoDoTexto) => {
        setTamanhoDoTexto(valor);
        void guardarPreferencias({ movimento, tamanhoDoTexto: valor });
      },
    }),
    [theme, preference, movimento, movimentoReduzido, tamanhoDoTexto],
  );
  const cssVars = useMemo(
    () =>
      vars(
        Object.fromEntries(
          Object.entries(getThemeColors(theme)).map(([token, hex]) => [`--cor-${token}`, hex]),
        ),
      ),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, cssVars]} className="bg-fundo">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

/**
 * Lê o tema atual e a função para trocá-lo.
 *
 * @throws Error se usado fora do `ThemeProvider`.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme deve ser usado dentro do ThemeProvider.');
  return context;
}

/**
 * Cores do tema atual, para o que não aceita classe de estilo (como o traço de um ícone SVG). Fora
 * do `ThemeProvider` (em testes isolados) devolve as cores do tema Claro.
 */
export function useThemeColors() {
  const context = useContext(ThemeContext);
  return getThemeColors(context?.theme ?? 'light');
}

/**
 * Imagem de fundo CSS (gradiente) como estilo. A web lê `backgroundImage`; o React Native, a
 * propriedade `experimental_backgroundImage`. Uma cor chapada (Alto contraste) vira `backgroundColor`.
 */
function imagemDeFundo(valor: string): ViewStyle {
  if (!valor.startsWith('linear-gradient')) return { backgroundColor: valor };
  return (
    Platform.OS === 'web' ? { backgroundImage: valor } : { experimental_backgroundImage: valor }
  ) as ViewStyle;
}

/**
 * Estilos visuais que dependem do tema e não cabem em classe: sombra (`boxShadow`) e gradientes.
 * No Alto contraste todos viram "sem efeito" (sem sombra e sem gradiente). Fora do
 * `ThemeProvider` devolve os do tema Claro.
 */
export function useVisual() {
  const tema = useContext(ThemeContext)?.theme ?? 'light';
  return {
    tema,
    altoContraste: tema === 'highContrast',
    sombra: (nivel: 1 | 2 | 3): ViewStyle =>
      tema === 'highContrast' ? {} : { boxShadow: getShadow(`${nivel}`, tema) },
    gradienteMarca: imagemDeFundo(getBrandGradient(tema)),
    gradienteFundo: imagemDeFundo(getBackgroundGradient(tema)),
  };
}

/**
 * Se o movimento deve ficar parado (escolha da pessoa, preferência do sistema ou Alto contraste).
 * Fora do `ThemeProvider` (testes isolados) vale `true`: nada anima.
 */
export function useMovimentoReduzido(): boolean {
  return useContext(ThemeContext)?.movimentoReduzido ?? true;
}

/** Multiplicador do tamanho do texto escolhido na Conta; `1` fora do `ThemeProvider`. */
export function useEscalaDoTexto(): number {
  return ESCALA_DO_TEXTO[useContext(ThemeContext)?.tamanhoDoTexto ?? 'normal'];
}
