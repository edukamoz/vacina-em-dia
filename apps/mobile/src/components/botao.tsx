import { Pressable, type PressableProps } from 'react-native';
import { useThemeColors } from '../theme/theme-provider';
import { Icone, type NomeDoIcone } from './icone';
import { Texto } from './texto';

/** Tipo de botão: principal (no máximo um por tela), secundário ou perigo. */
export type BotaoVariante = 'principal' | 'secundario' | 'perigo';

const ESTILOS: Readonly<Record<BotaoVariante, { caixa: string; texto: string }>> = {
  principal: { caixa: 'min-h-principal bg-primaria border-primaria', texto: 'text-sobrePrimaria' },
  secundario: { caixa: 'min-h-principal bg-fundo border-borda', texto: 'text-texto' },
  perigo: { caixa: 'min-h-principal bg-fundo border-erro', texto: 'text-erro' },
};

/**
 * Botão do design system: altura mínima de 56 dp em todos os tipos (como nas telas de referência), texto sempre
 * visível e papel de acessibilidade `button`.
 *
 * @param props.titulo - Texto do botão (também é o rótulo de acessibilidade).
 * @param props.variante - Tipo de botão; por padrão `principal`.
 * @param props.icone - Ícone opcional à esquerda do texto (decorativo; o texto continua sendo o rótulo).
 * @param props.selecionado - Para botões de escolha (tema, pessoa): anuncia o item escolhido.
 */
export function Botao({
  titulo,
  variante = 'principal',
  icone,
  selecionado,
  disabled,
  ...rest
}: Omit<PressableProps, 'children'> & {
  titulo: string;
  variante?: BotaoVariante;
  icone?: NomeDoIcone;
  selecionado?: boolean;
}) {
  const estilo = ESTILOS[variante];
  const cores = useThemeColors();
  const corDoIcone = {
    principal: cores.sobrePrimaria,
    secundario: cores.texto,
    perigo: cores.erro,
  }[variante];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{
        disabled: Boolean(disabled),
        ...(selecionado === undefined ? {} : { selected: selecionado }),
      }}
      // Na web, o estado de seleção só chega ao leitor de tela pela propriedade `aria-selected`.
      {...(selecionado === undefined ? {} : { 'aria-selected': selecionado })}
      disabled={disabled}
      className={`flex-row items-center justify-center gap-sm rounded-botao border-padrao px-xl py-md ${estilo.caixa}`}
      {...rest}
    >
      {icone ? <Icone nome={icone} cor={corDoIcone} /> : null}
      <Texto variante="botao" className={estilo.texto}>
        {titulo}
      </Texto>
    </Pressable>
  );
}
