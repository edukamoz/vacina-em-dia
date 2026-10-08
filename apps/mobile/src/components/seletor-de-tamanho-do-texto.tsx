import { Pressable, Text, View } from 'react-native';
import { ESCALA_DO_TEXTO, ROTULOS_DO_TAMANHO, TAMANHOS_DO_TEXTO } from '../theme/preferencias';
import { useTheme } from '../theme/theme-provider';
import { Texto } from './texto';

/**
 * Escolha do tamanho do texto: Normal, Grande ou Maior, cada um com uma amostra "Aa" já no
 * tamanho que terá. A escolhida ganha borda e é anunciada ao leitor de tela; ela soma-se ao tamanho
 * de fonte do sistema.
 */
export function SeletorDeTamanhoDoTexto() {
  const { tamanhoDoTexto, setTamanhoDoTexto } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel="Tamanho do texto"
      className="flex-row flex-wrap gap-md"
    >
      {TAMANHOS_DO_TEXTO.map((tamanho) => {
        const escolhido = tamanho === tamanhoDoTexto;
        return (
          <Pressable
            key={tamanho}
            accessibilityRole="radio"
            accessibilityLabel={ROTULOS_DO_TAMANHO[tamanho]}
            accessibilityState={{ checked: escolhido }}
            aria-checked={escolhido}
            onPress={() => setTamanhoDoTexto(tamanho)}
            className={`min-h-toque min-w-[96px] flex-1 items-center gap-xs rounded-[18px] bg-superficie p-md ${
              escolhido ? 'border-[3px] border-primaria' : 'border-padrao border-borda'
            }`}
          >
            <Text
              aria-hidden
              className="font-negrito text-texto"
              style={{ fontSize: 22 * ESCALA_DO_TEXTO[tamanho] }}
            >
              Aa
            </Text>
            <Texto variante="rotulo" importantForAccessibility="no">
              {ROTULOS_DO_TAMANHO[tamanho]}
            </Texto>
          </Pressable>
        );
      })}
    </View>
  );
}
