import { Text, useWindowDimensions, type TextProps } from 'react-native';
import { useEscalaDoTexto } from '../theme/theme-provider';
import { baseTokens, getThemeColors } from '../theme/tokens';

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

/** Acima desta ampliação da fonte do aparelho, o truncamento é desligado e o texto quebra. */
const AMPLIACAO_MAXIMA_COM_TRUNCAR = 1.3;

/**
 * Quantas linhas mostrar antes das reticências. O truncamento só vale com o texto no tamanho
 * "Normal" e com a fonte do aparelho até 130%: acima disso o texto quebra, para ninguém perder
 * conteúdo com o texto ampliado (WCAG 1.4.4; ADR-036).
 *
 * @param truncar - Linhas pedidas por quem usa o componente (`undefined` = nunca truncar).
 * @param escalaDoApp - Multiplicador do "Tamanho do texto" da Conta (1, 1,15 ou 1,3).
 * @param escalaDoAparelho - Ampliação da fonte feita nas configurações do aparelho.
 * @returns Número de linhas, ou `undefined` quando o texto deve quebrar livremente.
 */
export function linhasDoTruncamento(
  truncar: number | undefined,
  escalaDoApp: number,
  escalaDoAparelho: number,
): number | undefined {
  if (truncar === undefined) return undefined;
  if (escalaDoApp > 1 || escalaDoAparelho > AMPLIACAO_MAXIMA_COM_TRUNCAR) return undefined;
  return truncar;
}

/**
 * Texto com a fonte e o tamanho do design system. Escala com o tamanho de fonte do sistema e com
 * o "Tamanho do texto" escolhido na Conta.
 *
 * @param props.variante - Estilo tipográfico; por padrão `corpo`.
 * @param props.className - Classes extras (por exemplo a cor, `text-textoSecundario`).
 * @param props.truncar - Linhas antes das reticências. Só para e-mail, nome de pessoa em ficha,
 *   endereço e linhas de apoio; nome da vacina, estado, datas, erros, botões e rótulos nunca
 *   truncam (ADR-036). Desligado com texto ampliado.
 */
export function Texto({
  variante = 'corpo',
  className = '',
  style,
  truncar,
  ...rest
}: TextProps & { variante?: TextoVariante; className?: string; truncar?: 1 | 2 | 3 }) {
  const escala = useEscalaDoTexto();
  const linhas = linhasDoTruncamento(truncar, escala, useWindowDimensions().fontScale);
  const base = baseTokens.typography.estilos[variante];
  // Com o tamanho "Normal" a classe basta; nos maiores, o estilo troca o corpo e a altura da linha.
  const escalado =
    escala === 1
      ? style
      : [{ fontSize: base.tamanho * escala, lineHeight: base.alturaDeLinha * escala }, style];
  return (
    <Text
      className={`${textColorClass(className)} ${CLASSES[variante]} ${className}`}
      style={escalado}
      {...(linhas === undefined ? {} : { numberOfLines: linhas, ellipsizeMode: 'tail' as const })}
      {...rest}
    />
  );
}
