/** Como o convite para instalar o app aparece, conforme o aparelho. */
export type FormaDoConvite = 'nenhuma' | 'botao' | 'iphone';

/** Chave guardada no aparelho quando a pessoa toca em "Agora não". */
export const CHAVE_CONVITE_DISPENSADO = 'vacina-em-dia:convite-instalar:dispensado:v1';

/**
 * Diz se o navegador é de um iPhone ou iPad. O Safari do iOS não oferece o aviso automático de
 * instalação, então o app mostra o passo a passo "Compartilhar, depois Adicionar à Tela de
 * Início". O iPad recente se apresenta como Mac, mas tem tela de toque.
 *
 * @param userAgent - `navigator.userAgent`.
 * @param pontosDeToque - `navigator.maxTouchPoints`.
 */
export function ehIphoneOuIpad(userAgent: string, pontosDeToque: number): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return /Macintosh/i.test(userAgent) && pontosDeToque > 1;
}

/**
 * Decide qual convite mostrar: o botão "Instalar" quando o navegador já ofereceu a instalação
 * (Android e computador), o passo a passo no iPhone e nada quando o app já está instalado.
 *
 * @param instalado - O site já roda instalado como app.
 * @param temAvisoDoNavegador - O navegador ofereceu a instalação (`beforeinstallprompt`).
 * @param iphone - Navegador de iPhone ou iPad.
 */
export function formaDoConvite(
  instalado: boolean,
  temAvisoDoNavegador: boolean,
  iphone: boolean,
): FormaDoConvite {
  if (instalado) return 'nenhuma';
  if (temAvisoDoNavegador) return 'botao';
  return iphone ? 'iphone' : 'nenhuma';
}

/**
 * Se o cartão de convite deve aparecer agora: só depois da primeira dose aplicada (a pessoa já viu
 * o valor do app), só uma vez que ela não tenha dispensado, e só quando há o que mostrar.
 *
 * @param forma - Resultado de {@link formaDoConvite}.
 * @param dosesAplicadas - Quantas doses da pessoa já foram aplicadas.
 * @param dispensado - A pessoa já tocou em "Agora não".
 */
export function deveMostrarConvite(
  forma: FormaDoConvite,
  dosesAplicadas: number,
  dispensado: boolean,
): boolean {
  return forma !== 'nenhuma' && dosesAplicadas >= 1 && !dispensado;
}
