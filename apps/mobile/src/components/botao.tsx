import { Pressable, type PressableProps } from 'react-native';
import { Texto } from './texto';

/** Tipo de botão: principal (no máximo um por tela), secundário ou perigo. */
export type BotaoVariante = 'principal' | 'secundario' | 'perigo';

const ESTILOS: Readonly<Record<BotaoVariante, { caixa: string; texto: string }>> = {
  principal: { caixa: 'min-h-principal bg-primaria border-primaria', texto: 'text-sobrePrimaria' },
  secundario: { caixa: 'min-h-toque bg-fundo border-borda', texto: 'text-texto' },
  perigo: { caixa: 'min-h-toque bg-fundo border-erro', texto: 'text-erro' },
};

/**
 * Botão do design system: altura mínima de 56 dp no principal e 48 dp nos demais, texto sempre
 * visível e papel de acessibilidade `button`.
 *
 * @param props.titulo - Texto do botão (também é o rótulo de acessibilidade).
 * @param props.variante - Tipo de botão; por padrão `principal`.
 */
export function Botao({
  titulo,
  variante = 'principal',
  disabled,
  ...rest
}: Omit<PressableProps, 'children'> & { titulo: string; variante?: BotaoVariante }) {
  const estilo = ESTILOS[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      className={`items-center justify-center rounded-botao border-padrao px-xl py-md ${estilo.caixa}`}
      {...rest}
    >
      <Texto variante="botao" className={estilo.texto}>
        {titulo}
      </Texto>
    </Pressable>
  );
}
