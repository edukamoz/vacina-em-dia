import { Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAssistente } from '../features/assistant/assistente-contexto';
import { modoDeLayout } from '../lib/layout';
import { useBotaoRecolhido } from '../lib/rolagem-balao';
import { useMovimentoReduzido, useThemeColors, useVisual } from '../theme/theme-provider';
import { Icone } from './icone';

/**
 * Botão flutuante do assistente, como o balão de conversa de uma rede social: círculo de 64 px no
 * canto inferior direito (acima da barra de baixo no celular) que abre a janela do assistente.
 * Some enquanto a janela está aberta e se recolhe (menor e translúcido) enquanto a tela é rolada
 * para baixo. O ícone é decorativo; o rótulo de acessibilidade diz "Abrir
 * o assistente".
 *
 * @param props.largura - Largura a considerar; por padrão, a da janela (útil para testar).
 */
export function BalaoAssistente({ largura }: { largura?: number }) {
  const { aberto, abrir } = useAssistente();
  const cores = useThemeColors();
  const { altoContraste, gradienteMarca, sombra } = useVisual();
  const janela = useWindowDimensions().width;
  const { bottom } = useSafeAreaInsets();
  const recolhido = useBotaoRecolhido();
  const reduzido = useMovimentoReduzido();
  if (aberto) return null;
  const compacto = modoDeLayout(largura ?? janela) === 'compacto';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir o assistente"
      accessibilityHint="Pergunte sobre vacinas por texto ou por voz"
      onPress={abrir}
      // Rolando para baixo o botão fica menor e translúcido, junto à borda, para não cobrir o
      // conteúdo; continua tocável e volta ao tamanho ao rolar para cima.
      style={[
        gradienteMarca,
        sombra(3),
        compacto ? { marginBottom: bottom } : null,
        recolhido ? { opacity: 0.55, transform: [{ translateX: 18 }, { scale: 0.75 }] } : null,
        reduzido
          ? null
          : ({ transitionProperty: 'opacity, transform', transitionDuration: '150ms' } as object),
      ]}
      className={`absolute h-[64px] w-[64px] items-center justify-center rounded-selo bg-primaria ${
        compacto ? 'bottom-[88px] right-lg' : 'bottom-xl right-xl'
      } ${altoContraste ? 'border-altoContraste border-borda' : ''}`}
    >
      <Icone nome="assistente" cor={cores.sobrePrimaria} tamanho={28} />
    </Pressable>
  );
}
