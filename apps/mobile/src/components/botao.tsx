import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { useMovimentoReduzido, useThemeColors, useVisual } from '../theme/theme-provider';
import { Icone, type NomeDoIcone } from './icone';
import { Texto } from './texto';

/** Tipo de botão: principal (no máximo um por tela), secundário ou perigo. */
export type BotaoVariante = 'principal' | 'secundario' | 'perigo';

const ESTILOS: Readonly<Record<BotaoVariante, { caixa: string; texto: string }>> = {
  principal: {
    caixa: 'min-h-principal bg-primaria',
    texto: 'text-sobrePrimaria',
  },
  secundario: { caixa: 'min-h-principal bg-superficie border-borda', texto: 'text-texto' },
  perigo: { caixa: 'min-h-principal bg-erroSuave border-erro', texto: 'text-erro' },
};

/**
 * Classes da caixa e do texto do botão.
 *
 * @param variante - Tipo de botão.
 * @param desativado - Botão desativado (não vale para "carregando", que mantém a aparência normal).
 */
export function classesDoBotao(
  variante: BotaoVariante,
  desativado: boolean,
): { readonly caixa: string; readonly texto: string } {
  return desativado ? ESTILO_DESATIVADO : ESTILOS[variante];
}

/**
 * Botão desativado: sem a cor da marca, borda tracejada e texto de apoio. O texto continua legível
 * (4,5:1 ou mais nos três temas) para a pessoa saber o que o botão faria, e o tracejado mostra que
 * não responde, sem depender só da cor.
 */
const ESTILO_DESATIVADO = {
  caixa: 'min-h-principal bg-superficieSuave border-borda border-dashed',
  texto: 'text-textoSecundario',
} as const;

/**
 * Botão do design system: altura mínima de 56 dp em todos os tipos, texto sempre visível, gradiente
 * da marca no principal e papel de acessibilidade `button`.
 *
 * @param props.titulo - Texto do botão (também é o rótulo de acessibilidade).
 * @param props.variante - Tipo de botão; por padrão `principal`.
 * @param props.icone - Ícone opcional à esquerda do texto (decorativo; o texto continua sendo o rótulo).
 * @param props.selecionado - Para botões de escolha (tema, pessoa): anuncia o item escolhido.
 * @param props.carregando - Ação em andamento: mostra um indicador no lugar do ícone, bloqueia o
 *   toque, anuncia "ocupado" ao leitor de tela e mantém a aparência normal do botão.
 * @param props.disabled - Botão que não pode ser usado agora: aparência de desativado (veja
 *   `ESTILO_DESATIVADO`) e papel anunciado como desativado.
 */
export function Botao({
  titulo,
  variante = 'principal',
  icone,
  selecionado,
  carregando = false,
  disabled,
  ...rest
}: Omit<PressableProps, 'children'> & {
  titulo: string;
  variante?: BotaoVariante;
  icone?: NomeDoIcone;
  selecionado?: boolean;
  carregando?: boolean;
}) {
  const desativado = Boolean(disabled) && !carregando;
  const bloqueado = Boolean(disabled) || carregando;
  const estilo = classesDoBotao(variante, desativado);
  const cores = useThemeColors();
  const reduzido = useMovimentoReduzido();
  const { altoContraste, gradienteMarca, sombra } = useVisual();
  const corDoIcone = desativado
    ? cores.textoSecundario
    : { principal: cores.sobrePrimaria, secundario: cores.texto, perigo: cores.erro }[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{
        disabled: bloqueado,
        busy: carregando,
        ...(selecionado === undefined ? {} : { selected: selecionado }),
      }}
      // Na web, o estado de seleção só chega ao leitor de tela pela propriedade `aria-selected`.
      {...(selecionado === undefined ? {} : { 'aria-selected': selecionado })}
      disabled={bloqueado}
      // Pressionar: encolhe a 0,97 em 120 ms (na web a transição vem do CSS); parado com "Reduzir movimento".
      style={({ pressed }) => [
        variante === 'principal' && !desativado ? [gradienteMarca, sombra(1)] : null,
        reduzido
          ? null
          : ({ transitionProperty: 'transform', transitionDuration: '120ms' } as object),
        pressed && !reduzido && !bloqueado ? { transform: [{ scale: 0.97 }] } : null,
      ]}
      className={`flex-row items-center justify-center gap-sm rounded-botao border-padrao px-xl py-md ${estilo.caixa} ${
        variante === 'principal' && !desativado
          ? altoContraste
            ? 'border-borda'
            : 'border-transparent'
          : ''
      }`}
      {...rest}
    >
      {carregando ? (
        <ActivityIndicator size="small" color={corDoIcone} importantForAccessibility="no" />
      ) : icone ? (
        <Icone nome={icone} cor={corDoIcone} />
      ) : null}
      <Texto variante="botao" className={estilo.texto}>
        {titulo}
      </Texto>
    </Pressable>
  );
}
