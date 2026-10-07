import { Text, type TextProps } from 'react-native';
import { getThemeColors } from '../theme/tokens';

/** Estilos de texto do design system (`tokens.json`, `tipografia.estilos`). */
export type TextoVariante =
  | 'exibicao'
  | 'destaque'
  | 'titulo1'
  | 'titulo2'
  | 'titulo3'
  | 'corpo'
  | 'corpoNegrito'
  | 'rotulo'
  | 'apoio'
  | 'botao';

// Classes por extenso: o Tailwind só gera o que encontra escrito no código.
const CLASSES: Readonly<Record<TextoVariante, string>> = {
  exibicao: 'text-exibicao font-negrito',
  destaque: 'text-destaque font-regular',
  titulo1: 'text-titulo1 font-negrito',
  titulo2: 'text-titulo2 font-negrito',
  titulo3: 'text-titulo3 font-negrito',
  corpo: 'text-corpo font-regular',
  corpoNegrito: 'text-corpo font-negrito',
  rotulo: 'text-rotulo font-negrito',
  apoio: 'text-apoio font-regular',
  botao: 'text-botao font-negrito',
};

const COLOR_CLASS = new RegExp(
  `(^|\\s)text-(${Object.keys(getThemeColors('light')).join('|')})(\\s|$)`,
);

/**
 * Cor padrão do texto, só quando quem chama não escolheu outra. Duas classes de cor no mesmo
 * elemento disputam pela ordem do CSS gerado (não pela ordem escrita), o que já deixou texto
 * claro sobre botão claro; por isso a padrão só entra se não houver outra.
 *
 * @param className - Classes extras recebidas pelo componente.
 * @returns `text-texto` ou texto vazio.
 */
export function textColorClass(className: string): string {
  return COLOR_CLASS.test(className) ? '' : 'text-texto';
}

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
  return (
    <Text className={`${textColorClass(className)} ${CLASSES[variante]} ${className}`} {...rest} />
  );
}
