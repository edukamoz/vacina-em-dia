import { View, type ViewProps } from 'react-native';

/** Cartão com borda de 2 px, raio e espaçamento do design system. */
export function Cartao({ className = '', ...rest }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-cartao border-padrao border-borda bg-superficie p-lg ${className}`}
      {...rest}
    />
  );
}
