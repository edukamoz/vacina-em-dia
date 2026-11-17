import { View, type ViewProps } from 'react-native';
import { useVisual } from '../theme/theme-provider';

/**
 * Cartão do design system: superfície elevada por sombra (`sombra-1`), com fio decorativo de 1 px
 * e raio de 24 dp. No Alto contraste não há sombra e a borda passa a 3 px em `borda`.
 *
 * @param props.suave - Fundo `superficieSuave` e sem sombra, para informação de apoio dentro de
 *   outro cartão ou da tela (por exemplo, os dados de uma dose).
 */
export function Cartao({
  className = '',
  style,
  suave = false,
  ...rest
}: ViewProps & { className?: string; suave?: boolean }) {
  const { altoContraste, sombra } = useVisual();
  return (
    <View
      className={`rounded-cartao p-lg ${suave ? 'bg-superficieSuave' : 'bg-superficie'} ${
        altoContraste ? 'border-altoContraste border-borda' : 'border-fina border-bordaSuave'
      } ${className}`}
      style={[suave ? null : sombra(1), style]}
      {...rest}
    />
  );
}
