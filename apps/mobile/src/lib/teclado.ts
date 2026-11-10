/**
 * Contas do teclado na tela, puras para testar sem aparelho. As medidas são em pixels da janela
 * (eixo vertical, de cima para baixo).
 */

/**
 * Quanto do quadro o teclado cobre: a distância do topo do teclado até o fundo do quadro, nunca
 * negativa. É zero quando o quadro termina acima do teclado (ou quando o sistema já encolheu a
 * janela, caso do Android que redimensiona sozinho).
 *
 * @param fundoDoQuadro - Posição do fundo do quadro na janela.
 * @param topoDoTeclado - Posição do topo do teclado na janela.
 */
export function sobreposicaoDoTeclado(fundoDoQuadro: number, topoDoTeclado: number): number {
  return Math.max(0, Math.round(fundoDoQuadro - topoDoTeclado));
}

/** Margem, em pixels, que sobra entre o campo e a borda da área visível ao rolar até ele. */
export const MARGEM_DO_CAMPO = 24;

/**
 * Para onde rolar para o campo aparecer inteiro, com folga: devolve a nova posição de rolagem, ou
 * `null` quando o campo já está à vista e nada precisa mexer.
 *
 * @param campoTopo - Topo do campo, medido dentro do conteúdo que rola.
 * @param campoAltura - Altura do campo.
 * @param rolagemY - Posição atual da rolagem.
 * @param alturaVisivel - Altura da área visível da rolagem (já sem a parte coberta pelo teclado).
 */
export function rolagemParaVerCampo(
  campoTopo: number,
  campoAltura: number,
  rolagemY: number,
  alturaVisivel: number,
): number | null {
  const topo = campoTopo - MARGEM_DO_CAMPO;
  const fundo = campoTopo + campoAltura + MARGEM_DO_CAMPO;
  if (topo < rolagemY) return Math.max(0, topo);
  if (fundo > rolagemY + alturaVisivel) return Math.max(0, fundo - alturaVisivel);
  return null;
}
