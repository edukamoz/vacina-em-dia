import { Pressable, View } from 'react-native';
import { useThemeColors } from '../theme/theme-provider';
import { AzulejoDeMarca } from './azulejo-de-marca';
import { Icone, type NomeDoIcone } from './icone';
import { Texto } from './texto';

/**
 * Atalho para outra tela: cartão com o azulejo da marca, título, frase de apoio e a seta. Todo o
 * cartão é um link (papel `link`), com rótulo de acessibilidade completo. Título e apoio quebram
 * de linha, sem reticências.
 *
 * @param props.icone - Ícone do azulejo.
 * @param props.titulo - Título do atalho.
 * @param props.apoio - Frase de apoio.
 * @param props.rotuloAcessivel - Rótulo para o leitor de tela (por padrão, título e apoio juntos).
 * @param props.aoAbrir - Chamada ao tocar.
 */
export function Atalho({
  icone,
  titulo,
  apoio,
  rotuloAcessivel,
  aoAbrir,
}: {
  icone: NomeDoIcone;
  titulo: string;
  apoio: string;
  rotuloAcessivel?: string;
  aoAbrir: () => void;
}) {
  const cores = useThemeColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={rotuloAcessivel ?? `${titulo}. ${apoio}`}
      onPress={aoAbrir}
      className="min-h-principal flex-row items-center gap-md rounded-cartao border-fina border-bordaSuave bg-superficie p-lg hover:bg-superficieSuave"
    >
      <AzulejoDeMarca icone={icone} />
      <View className="min-w-0 flex-1">
        <Texto variante="titulo3" importantForAccessibility="no">
          {titulo}
        </Texto>
        <Texto variante="apoio" className="text-textoSecundario" importantForAccessibility="no">
          {apoio}
        </Texto>
      </View>
      <Icone nome="seta" cor={cores.textoSecundario} />
    </Pressable>
  );
}
