import { baseTokens } from '../theme/tokens';

/** Modo de layout pela largura da janela (`docs/04-design-system.md`, seção 2.5). */
export type ModoDeLayout = 'compacto' | 'medio' | 'expandido';

/**
 * Escolhe o modo de layout pela largura, usando os breakpoints do design system: compacto
 * (celular), médio (tablet e janela estreita) e expandido (web em computador).
 *
 * @param largura - Largura da janela em pixels.
 */
export function modoDeLayout(largura: number): ModoDeLayout {
  if (largura >= baseTokens.breakpoints.expandido) return 'expandido';
  if (largura >= baseTokens.breakpoints.medio) return 'medio';
  return 'compacto';
}

/**
 * Posição da barra de navegação: embaixo no celular; à esquerda no tablet e no computador.
 *
 * @param modo - Modo de layout.
 */
export function posicaoDaBarra(modo: ModoDeLayout): 'bottom' | 'left' {
  return modo === 'compacto' ? 'bottom' : 'left';
}
