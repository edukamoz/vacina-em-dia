import { View, type ViewProps } from 'react-native';
import { useVisual } from '../theme/theme-provider';

/**
 * Cartão do design system: superfície elevada por sombra (`sombra-1`), com fio decorativo de 1 px.
 * No Alto contraste não há sombra e a borda passa a 3 px em `borda`.
 */
export function Cartao({ className = '', style, ...rest }: ViewProps & { className?: string }) {
  const { altoContraste, sombra } = useVisual();
  return (
    <View
      className={`rounded-cartao bg-superficie p-lg ${
        altoContraste ? 'border-altoContraste border-borda' : 'border-fina border-bordaSuave'
      } ${className}`}
      style={[sombra(1), style]}
      {...rest}
    />
  );
}
