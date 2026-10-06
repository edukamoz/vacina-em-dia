import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Lista de cartões que vira duas colunas no computador (modo expandido, a partir de 1024 px) e
 * continua em uma coluna no celular e no tablet (`docs/04-design-system.md`, seção 2.5).
 *
 * @param props.children - Cartões da lista.
 */
export function Grade({ children }: { children: ReactNode }) {
  return (
    <View className="gap-md expandido:flex-row expandido:flex-wrap">
      {Children.toArray(children).map((filho, indice) => (
        <View key={indice} className="expandido:basis-[48.5%]">
          {filho}
        </View>
      ))}
    </View>
  );
}
