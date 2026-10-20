import { createContext, useContext } from 'react';

/**
 * Permite que um filho (como o mapa) trave a rolagem da tela enquanto o dedo está nele. Sem isso,
 * no Android, a rolagem da página rouba o arrasto e o mapa não se move.
 */
export const RolagemDaTelaContext = createContext<((travada: boolean) => void) | null>(null);

/** Devolve a função que trava (`true`) ou libera (`false`) a rolagem da tela; `null` fora de uma `Tela`. */
export function useTravarRolagem(): ((travada: boolean) => void) | null {
  return useContext(RolagemDaTelaContext);
}
