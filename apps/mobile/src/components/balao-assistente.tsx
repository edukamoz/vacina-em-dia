import { usePathname, useRouter } from 'expo-router';
import { Pressable, useWindowDimensions } from 'react-native';
import { modoDeLayout } from '../lib/layout';
import { useThemeColors, useVisual } from '../theme/theme-provider';
import { Icone } from './icone';

/**
 * Botão flutuante do assistente, só no celular (nas barras laterais o assistente é um item do
 * menu): círculo de 64 px no canto inferior direito, acima da barra inferior, que abre a conversa
 * (texto e voz). O ícone é decorativo; o rótulo de acessibilidade diz "Abrir o assistente". Some
 * na própria tela do assistente.
 *
 * @param props.largura - Largura a considerar; por padrão, a da janela (útil para testar).
 */
export function BalaoAssistente({ largura }: { largura?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const cores = useThemeColors();
  const { altoContraste, gradienteMarca, sombra } = useVisual();
  const janela = useWindowDimensions().width;
  if (modoDeLayout(largura ?? janela) !== 'compacto' || pathname === '/assistente') return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir o assistente"
      accessibilityHint="Pergunte sobre vacinas por texto ou por voz"
      onPress={() => router.push('/assistente')}
      style={[gradienteMarca, sombra(3)]}
      className={`absolute bottom-[88px] right-lg h-[64px] w-[64px] items-center justify-center rounded-selo bg-primaria ${
        altoContraste ? 'border-altoContraste border-borda' : ''
      }`}
    >
      <Icone nome="assistente" cor={cores.sobrePrimaria} tamanho={28} />
    </Pressable>
  );
}
