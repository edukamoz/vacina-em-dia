import { View } from 'react-native';
import { useThemeColors } from '../theme/theme-provider';
import { Texto } from './texto';

const CORES = ['avatarA', 'avatarB', 'avatarC', 'avatarD'] as const;

/**
 * Avatar de uma pessoa: círculo colorido com a inicial do nome. A cor vem da posição da pessoa na
 * lista (quatro tons do design system) e nunca é a única informação: o nome aparece ao lado. É
 * decorativo para o leitor de tela.
 *
 * @param props.nome - Nome ou apelido; a inicial é a primeira letra, em maiúscula.
 * @param props.indice - Posição na lista, para escolher a cor.
 * @param props.tamanho - Lado em pixels; 56 por padrão.
 */
export function Avatar({
  nome,
  indice,
  tamanho = 56,
}: {
  nome: string;
  indice: number;
  tamanho?: number;
}) {
  const cores = useThemeColors();
  const cor = CORES[((indice % CORES.length) + CORES.length) % CORES.length] ?? 'avatarA';
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      className="items-center justify-center rounded-selo border-padrao border-transparent"
      style={{ width: tamanho, height: tamanho, backgroundColor: cores[cor] }}
    >
      <Texto variante={tamanho >= 56 ? 'titulo3' : 'rotulo'} className="text-sobreAvatar">
        {nome.trim().charAt(0).toLocaleUpperCase('pt-BR')}
      </Texto>
    </View>
  );
}
