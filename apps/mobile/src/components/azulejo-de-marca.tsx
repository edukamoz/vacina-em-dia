import { View } from 'react-native';
import { useThemeColors, useVisual } from '../theme/theme-provider';
import { Icone, type NomeDoIcone } from './icone';

/**
 * Azulejo da marca: quadrado arredondado com um ícone na cor da marca sobre o fundo suave da marca.
 * Abre atalhos, seções da Conta e estados vazios. É decorativo para o leitor de tela (o texto ao
 * lado diz o que é). Sem contorno nos temas Claro e Escuro; no Alto contraste ganha borda.
 *
 * @param props.icone - Ícone do conjunto do projeto.
 * @param props.tamanho - Lado em dp; 48 por padrão (56 em destaque).
 */
export function AzulejoDeMarca({ icone, tamanho = 48 }: { icone: NomeDoIcone; tamanho?: 48 | 56 }) {
  const cores = useThemeColors();
  const { altoContraste } = useVisual();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      className={`items-center justify-center rounded-quadro border-padrao bg-primariaSuave ${
        altoContraste ? 'border-primaria' : 'border-transparent'
      }`}
      style={{ width: tamanho, height: tamanho }}
    >
      <Icone nome={icone} cor={cores.primaria} tamanho={tamanho === 56 ? 28 : 24} />
    </View>
  );
}
