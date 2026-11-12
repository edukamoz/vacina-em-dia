import { useSyncExternalStore } from 'react';

/** Quanto a tela precisa rolar (em pontos) para o botão do assistente mudar de estado. */
export const FOLGA_DA_ROLAGEM = 6;

/** Até esta distância do topo o botão fica sempre inteiro. */
export const TOPO_DA_TELA = 24;

/**
 * Decide se o botão do assistente deve ficar recolhido: recolhe quando a pessoa rola para baixo,
 * volta quando rola para cima e fica inteiro perto do topo. Movimentos pequenos mantêm o estado,
 * para o botão não piscar com o tremor do dedo.
 *
 * @param y - Posição atual da rolagem.
 * @param anterior - Posição da última leitura.
 * @param recolhido - Estado atual.
 */
export function botaoRecolhido(y: number, anterior: number, recolhido: boolean): boolean {
  if (y <= TOPO_DA_TELA) return false;
  const mudou = y - anterior;
  if (mudou > FOLGA_DA_ROLAGEM) return true;
  if (mudou < -FOLGA_DA_ROLAGEM) return false;
  return recolhido;
}

let recolhidoAgora = false;
const ouvintes = new Set<() => void>();

/** Muda o estado do botão do assistente; só avisa quem acompanha quando o valor muda. */
export function definirBotaoRecolhido(valor: boolean): void {
  if (valor === recolhidoAgora) return;
  recolhidoAgora = valor;
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Acompanha se o botão do assistente está recolhido (a tela está sendo rolada para baixo). */
export function useBotaoRecolhido(): boolean {
  return useSyncExternalStore(
    (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => ouvintes.delete(ouvinte);
    },
    () => recolhidoAgora,
    () => false,
  );
}
