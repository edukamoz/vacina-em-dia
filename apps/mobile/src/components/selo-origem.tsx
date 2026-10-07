import type { DoseOrigin } from '@vacina/shared';
import { View } from 'react-native';
import { Texto } from './texto';

/**
 * Etiqueta de origem da dose: "Oficial" (do calendário nacional) ou "Adicionada por você" (dose
 * avulsa, fora do calendário oficial). A diferença não depende só da cor: o texto muda, e o rótulo
 * de acessibilidade explica o que significa.
 *
 * @param props.origem - De onde vem a dose.
 */
export function SeloOrigem({ origem }: { origem: DoseOrigin }) {
  const avulsa = origem === 'CUSTOM';
  return (
    <View
      accessible
      accessibilityLabel={
        avulsa
          ? 'Dose adicionada por você, fora do calendário oficial'
          : 'Dose do calendário oficial'
      }
      className={`self-start rounded-selo border-padrao px-md py-xs ${
        avulsa ? 'border-primaria bg-primariaSuave' : 'border-borda bg-superficie'
      }`}
    >
      <Texto
        variante="rotulo"
        className={avulsa ? 'text-primaria' : 'text-textoSecundario'}
        importantForAccessibility="no"
      >
        {avulsa ? 'Adicionada por você' : 'Oficial'}
      </Texto>
    </View>
  );
}
