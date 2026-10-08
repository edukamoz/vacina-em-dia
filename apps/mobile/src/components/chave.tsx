import { Pressable, View } from 'react-native';
import { Texto } from './texto';

/**
 * Chave de liga e desliga (lembretes por e-mail, por exemplo). Mostra o rótulo, o estado em texto
 * ("Ligado" ou "Desligado") e a posição do botão, então nada depende só da cor. Área de toque de
 * pelo menos 48 dp e papel `switch` para o leitor de tela.
 *
 * @param props.rotulo - Texto ao lado da chave (também é o rótulo de acessibilidade).
 * @param props.ligada - Se está ligada.
 * @param props.aoAlterar - Chamada com o novo valor.
 */
export function Chave({
  rotulo,
  ligada,
  aoAlterar,
}: {
  rotulo: string;
  ligada: boolean;
  aoAlterar: (valor: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={rotulo}
      accessibilityState={{ checked: ligada }}
      // Na web, o estado só chega ao leitor de tela pela propriedade `aria-checked`.
      aria-checked={ligada}
      onPress={() => aoAlterar(!ligada)}
      className="min-h-toque flex-row items-center justify-between gap-md"
    >
      <Texto className="flex-1" importantForAccessibility="no">
        {rotulo}
      </Texto>
      <View className="flex-row items-center gap-sm">
        <Texto variante="rotulo" className="text-textoSecundario" importantForAccessibility="no">
          {ligada ? 'Ligado' : 'Desligado'}
        </Texto>
        <View
          className={`h-[32px] w-[56px] justify-center rounded-selo border-padrao px-[2px] ${
            ligada ? 'border-primaria bg-primaria' : 'border-borda bg-superficieSuave'
          }`}
        >
          <View
            className={`h-[24px] w-[24px] rounded-selo ${
              ligada ? 'self-end bg-sobrePrimaria' : 'self-start bg-borda'
            }`}
          />
        </View>
      </View>
    </Pressable>
  );
}
