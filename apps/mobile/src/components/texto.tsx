import { Text, type TextProps } from 'react-native';

/** Estilos de texto do design system (`tokens.json`, `tipografia.estilos`). */
export type TextoVariante =
  'titulo1' | 'titulo2' | 'titulo3' | 'corpo' | 'corpoNegrito' | 'rotulo' | 'apoio' | 'botao';

// Classes por extenso: o Tailwind só gera o que encontra escrito no código.
const CLASSES: Readonly<Record<TextoVariante, string>> = {
  titulo1: 'text-titulo1 font-negrito',
  titulo2: 'text-titulo2 font-negrito',
  titulo3: 'text-titulo3 font-negrito',
  corpo: 'text-corpo font-regular',
  corpoNegrito: 'text-corpo font-negrito',
  rotulo: 'text-rotulo font-negrito',
  apoio: 'text-apoio font-regular',
  botao: 'text-botao font-negrito',
};

/**
 * Texto com a fonte e o tamanho do design system. Escala com o tamanho de fonte do sistema.
 *
 * @param props.variante - Estilo tipográfico; por padrão `corpo`.
 * @param props.className - Classes extras (por exemplo a cor, `text-textoSecundario`).
 */
export function Texto({
  variante = 'corpo',
  className = '',
  ...rest
}: TextProps & { variante?: TextoVariante; className?: string }) {
  return <Text className={`text-texto ${CLASSES[variante]} ${className}`} {...rest} />;
}
