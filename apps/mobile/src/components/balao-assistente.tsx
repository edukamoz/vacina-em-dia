import { usePathname, useRouter } from 'expo-router';
import { Pressable, useWindowDimensions } from 'react-native';
import { modoDeLayout } from '../lib/layout';
import { useThemeColors } from '../theme/theme-provider';
import { Icone } from './icone';
import { Texto } from './texto';

/**
 * Balão do assistente: botão flutuante no canto inferior direito, presente em todas as abas, que
 * abre a conversa com o assistente (texto e voz). Tem ícone e texto, nunca só o desenho, e fica
 * acima da barra inferior no celular. Some na própria tela do assistente.
 */
export function BalaoAssistente() {
  const router = useRouter();
  const pathname = usePathname();
  const cores = useThemeColors();
  const compacto = modoDeLayout(useWindowDimensions().width) === 'compacto';
  if (pathname === '/assistente') return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir o assistente"
      accessibilityHint="Pergunte sobre vacinas por texto ou por voz"
      onPress={() => router.push('/assistente')}
      className={`absolute min-h-principal flex-row items-center gap-sm rounded-selo border-padrao border-primaria bg-primaria px-lg ${
        compacto ? 'bottom-[88px] right-lg' : 'bottom-xl right-xl'
      }`}
    >
      <Icone nome="assistente" cor={cores.sobrePrimaria} />
      <Texto variante="botao" className="text-sobrePrimaria" importantForAccessibility="no">
        Assistente
      </Texto>
    </Pressable>
  );
}
