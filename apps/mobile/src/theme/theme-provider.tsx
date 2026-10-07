import { vars } from 'nativewind';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, View } from 'react-native';
import { resolveTheme, type ThemePreference } from './resolve-theme';
import { getThemeColors, type ThemeName } from './tokens';

/** Valor entregue pelo contexto de tema. */
export interface ThemeContextValue {
  /** Tema aplicado agora. */
  readonly theme: ThemeName;
  /** Escolha do usuário (inclui "seguir o sistema"). */
  readonly preference: ThemePreference;
  /** Troca a escolha do usuário. */
  readonly setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Aplica o tema às telas: grava as cores como variáveis CSS (`--cor-<token>`) que as classes do
 * NativeWind (`bg-fundo`, `text-texto`...) consomem. Guarda a escolha do usuário na Context API
 * (ADR-006).
 *
 * @param props.initialPreference - Escolha inicial; por padrão segue o sistema.
 */
export function ThemeProvider({
  children,
  initialPreference = 'system',
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
}) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference);
  const systemScheme = useColorScheme();
  const theme = resolveTheme(preference, systemScheme);

  const value = useMemo(() => ({ theme, preference, setPreference }), [theme, preference]);
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
