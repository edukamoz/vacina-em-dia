import { Pressable, View } from 'react-native';
import { Texto } from './texto';

/**
 * Caixa de marcação com texto (aceite, gestante...). Área de toque de pelo menos 48 dp, estado
 * anunciado ao leitor de tela e marca visível (✔) que não depende só da cor.
 *
 * @param props.rotulo - Texto ao lado da caixa (também é o rótulo de acessibilidade).
 * @param props.marcado - Se está marcada.
 * @param props.aoAlterar - Chamada com o novo valor.
 */
export function Alternar({
  rotulo,
  marcado,
  aoAlterar,
}: {
  rotulo: string;
  marcado: boolean;
  aoAlterar: (valor: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: marcado }}
      // Na web, o estado só chega ao leitor de tela pela propriedade `aria-checked`.
      aria-checked={marcado}
      onPress={() => aoAlterar(!marcado)}
      className="min-h-toque flex-row items-center gap-md"
    >
      <View
        className={`h-[28px] w-[28px] items-center justify-center rounded-campo border-padrao ${
          marcado ? 'border-primaria bg-primaria' : 'border-borda bg-superficie'
        }`}
      >
        {marcado ? (
          <Texto variante="rotulo" className="text-sobrePrimaria" importantForAccessibility="no">
            ✔
          </Texto>
        ) : null}
      </View>
      <Texto className="flex-1" importantForAccessibility="no">
        {rotulo}
      </Texto>
    </Pressable>
  );
}
