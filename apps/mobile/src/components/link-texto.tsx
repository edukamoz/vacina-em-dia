import { Pressable, type PressableProps } from 'react-native';
import { Texto } from './texto';

/**
 * Link de texto (negrito, verde e sublinhado) para ações secundárias que levam a outra tela, como
 * "Trocar pessoa". Mantém a área de toque de 48 dp e o papel `link` para o leitor de tela.
 *
 * @param props.titulo - Texto do link (também é o rótulo de acessibilidade).
 */
export function LinkTexto({
  titulo,
  ...rest
}: Omit<PressableProps, 'children'> & { titulo: string }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={titulo}
      className="min-h-toque justify-center self-start"
      {...rest}
    >
      <Texto variante="corpoNegrito" className="text-primaria underline">
        {titulo}
      </Texto>
    </Pressable>
  );
}
