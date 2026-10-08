import { Pressable, View } from 'react-native';
import { useTheme } from '../theme/theme-provider';
import type { ThemePreference } from '../theme/resolve-theme';
import { getThemeColors, THEME_LABELS, THEME_NAMES, type ThemeName } from '../theme/tokens';
import { Texto } from './texto';

const OPCOES: readonly {
  valor: ThemePreference;
  rotulo: string;
  miniatura: ThemeName;
}[] = [
  { valor: 'system', rotulo: 'Seguir o aparelho', miniatura: 'light' },
  ...THEME_NAMES.map((valor) => ({ valor, rotulo: THEME_LABELS[valor], miniatura: valor })),
];

/** Miniatura de uma tela no tema: fundo, três linhas de texto e uma de destaque. */
function Miniatura({ tema }: { tema: ThemeName }) {
  const cores = getThemeColors(tema);
  return (
    <View
      aria-hidden
      className="h-[56px] gap-[6px] rounded-[12px] border-fina p-sm"
      style={{ backgroundColor: cores.fundo, borderColor: cores.borda }}
    >
      <View className="h-[6px] w-[60%] rounded-selo" style={{ backgroundColor: cores.texto }} />
      <View
        className="h-[6px] w-[85%] rounded-selo"
        style={{ backgroundColor: cores.textoSecundario }}
      />
      <View className="h-[6px] w-[35%] rounded-selo" style={{ backgroundColor: cores.primaria }} />
    </View>
  );
}

/**
 * Escolha da aparência: seguir o aparelho, Claro, Escuro ou Alto contraste, em cartões com uma
 * miniatura de cada tema. A escolha do usuário (não o tema resolvido) é a marcada, com borda e o
 * estado anunciado ao leitor de tela.
 */
export function SeletorDeTema() {
  const { preference, setPreference } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Tema"
      className="flex-row flex-wrap gap-md"
    >
      {OPCOES.map(({ valor, rotulo, miniatura }) => {
        const escolhida = valor === preference;
        return (
          <Pressable
            key={valor}
            accessibilityRole="radio"
            accessibilityLabel={rotulo}
            accessibilityState={{ checked: escolhida }}
            aria-checked={escolhida}
            onPress={() => setPreference(valor)}
            className={`min-h-toque min-w-[140px] flex-1 gap-sm rounded-[18px] bg-superficie p-md ${
              escolhida ? 'border-[3px] border-primaria' : 'border-padrao border-borda'
            }`}
          >
            <Miniatura tema={miniatura} />
            <View className="flex-row items-center gap-sm">
              <View
                className={`h-[20px] w-[20px] items-center justify-center rounded-selo border-padrao ${
                  escolhida ? 'border-primaria' : 'border-borda'
                }`}
              >
                {escolhida ? <View className="h-[10px] w-[10px] rounded-selo bg-primaria" /> : null}
              </View>
              <Texto
                variante={escolhida ? 'rotulo' : 'apoio'}
                className="flex-1 text-texto"
                importantForAccessibility="no"
              >
                {rotulo}
              </Texto>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
