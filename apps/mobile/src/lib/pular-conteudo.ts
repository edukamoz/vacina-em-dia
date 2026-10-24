/** Identificador do contêiner do conteúdo principal de cada tela (alvo do link "Pular para o conteúdo"). */
export const ID_DO_CONTEUDO = 'conteudo-principal';

/** O mínimo que precisamos de um elemento do navegador, para testar sem DOM. */
export interface ElementoFocavel {
  focus(): void;
  getClientRects(): { length: number };
}

/**
 * Leva o foco ao conteúdo principal da tela que está à vista. A pilha de telas mantém as anteriores
 * no documento (escondidas), então pode haver mais de um contêiner com o mesmo id: vale o último que
 * ocupa espaço na página.
 *
 * @param raiz - O documento (ou outro nó que saiba buscar por seletor).
 * @returns `true` se encontrou um conteúdo visível e o focou.
 */
export function focarConteudoPrincipal(raiz: {
  querySelectorAll(seletor: string): ArrayLike<ElementoFocavel>;
}): boolean {
  const candidatos = Array.from(raiz.querySelectorAll(`[id="${ID_DO_CONTEUDO}"]`));
  const alvo = candidatos.reverse().find((el) => el.getClientRects().length > 0);
  if (!alvo) return false;
  alvo.focus();
  return true;
}
