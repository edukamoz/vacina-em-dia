import { Pressable, useWindowDimensions } from 'react-native';
import { useAssistente } from '../features/assistant/assistente-contexto';
import { modoDeLayout } from '../lib/layout';
import { useThemeColors, useVisual } from '../theme/theme-provider';
import { Icone } from './icone';

/**
 * Botão flutuante do assistente, como o balão de conversa de uma rede social: círculo de 64 px no
 * canto inferior direito (acima da barra de baixo no celular) que abre a janela do assistente.
 * Some enquanto a janela está aberta. O ícone é decorativo; o rótulo de acessibilidade diz "Abrir
 * o assistente".
 *
 * @param props.largura - Largura a considerar; por padrão, a da janela (útil para testar).
 */
export function BalaoAssistente({ largura }: { largura?: number }) {
  const { aberto, abrir } = useAssistente();
  const cores = useThemeColors();
  const { altoContraste, gradienteMarca, sombra } = useVisual();
  const janela = useWindowDimensions().width;
  if (aberto) return null;
  const compacto = modoDeLayout(largura ?? janela) === 'compacto';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir o assistente"
      accessibilityHint="Pergunte sobre vacinas por texto ou por voz"
      onPress={abrir}
      style={[gradienteMarca, sombra(3)]}
      className={`absolute h-[64px] w-[64px] items-center justify-center rounded-selo bg-primaria ${
        compacto ? 'bottom-[88px] right-lg' : 'bottom-xl right-xl'
      } ${altoContraste ? 'border-altoContraste border-borda' : ''}`}
    >
      <Icone nome="assistente" cor={cores.sobrePrimaria} tamanho={28} />
    </Pressable>
  );
}
