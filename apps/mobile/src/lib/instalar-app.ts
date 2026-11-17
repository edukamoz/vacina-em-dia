// Variante do celular: o app já é instalado, então não há convite. A versão da web é
// `instalar-app.web.ts`; as duas precisam exportar o mesmo (conferido por `plataforma.test.ts`).
import {
  CHAVE_CONVITE_DISPENSADO,
  deveMostrarConvite,
  ehIphoneOuIpad,
  formaDoConvite,
  type FormaDoConvite,
} from './instalar-app-comum';

export { CHAVE_CONVITE_DISPENSADO, deveMostrarConvite, ehIphoneOuIpad, formaDoConvite };
export type { FormaDoConvite };

/** Estado do convite para instalar o app. */
export interface ConviteDeInstalacao {
  readonly forma: FormaDoConvite;
  /** Abre a janela de instalação do navegador (só na forma `botao`). */
  readonly instalar: () => Promise<void>;
}

/** No celular o app já está instalado: nunca há convite. */
export function useConviteDeInstalacao(): ConviteDeInstalacao {
  return { forma: 'nenhuma', instalar: async () => {} };
}
