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
 * @param props.tom - `marca` (padrão), `cheio` (fundo verde, ícone claro: destaque como "Apoie o projeto")
 *   ou `perigo` (tons de atrasada: exclusão da conta).
 */
export function AzulejoDeMarca({
  icone,
  tamanho = 48,
  tom = 'marca',
}: {
  icone: NomeDoIcone;
  tamanho?: 48 | 56;
  tom?: 'marca' | 'cheio' | 'perigo';
}) {
  const cores = useThemeColors();
  const { altoContraste } = useVisual();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      className={`items-center justify-center rounded-quadro border-padrao ${
        tom === 'cheio' ? 'bg-primaria' : tom === 'perigo' ? 'bg-atrasadaSuave' : 'bg-primariaSuave'
      } ${
        altoContraste
          ? tom === 'perigo'
            ? 'border-atrasada'
            : 'border-primaria'
          : 'border-transparent'
      }`}
      style={{ width: tamanho, height: tamanho }}
    >
      <Icone
        nome={icone}
        cor={
          tom === 'cheio' ? cores.sobrePrimaria : tom === 'perigo' ? cores.atrasada : cores.primaria
        }
        tamanho={tamanho === 56 ? 28 : 24}
      />
    </View>
  );
}
