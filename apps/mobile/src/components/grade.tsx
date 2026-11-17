import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

/**
 * Lista de cartões que vira duas colunas no computador (modo expandido, a partir de 1024 px) e
 * continua em uma coluna no celular e no tablet (`docs/04-design-system.md`, seção 2.5).
 *
 * @param props.children - Cartões da lista.
 * @param props.colunas - `2` (padrão) ou `1`, para listas dentro de uma coluna estreita (por exemplo,
 *   a coluna das doses ao lado do resumo na aba Doses).
 */
export function Grade({ children, colunas = 2 }: { children: ReactNode; colunas?: 1 | 2 }) {
  const uma = colunas === 1;
  return (
    <View
      className={`gap-lg ${uma ? '' : 'expandido:flex-row expandido:flex-wrap expandido:justify-between'}`}
    >
      {Children.toArray(children).map((filho, indice) => (
        <View key={indice} className={uma ? '' : 'expandido:basis-[49.1%]'}>
          {filho}
        </View>
      ))}
    </View>
  );
}
