import type { ReactNode } from 'react';

/**
 * Inclinação 3D que segue o mouse (só na web; veja `inclinar.web.tsx`). No celular não há mouse,
 * então o conteúdo aparece como está.
 *
 * @param props.graus - Inclinação máxima, em graus (o design usa até 10).
 */
export function Inclinar({ children }: { children: ReactNode; graus?: number }) {
  return <>{children}</>;
}
