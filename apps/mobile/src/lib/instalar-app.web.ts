// Variante da web: guarda o aviso de instalação que o navegador oferece (`beforeinstallprompt`) e
// o usa quando a pessoa toca em "Instalar o aplicativo". No iPhone não existe esse aviso: o app
// mostra o passo a passo. A versão do celular é `instalar-app.ts`.
import { useEffect, useState } from 'react';
import { estaInstalado } from './ambiente';
import {
  CHAVE_CONVITE_DISPENSADO,
  deveMostrarConvite,
  ehIphoneOuIpad,
  formaDoConvite,
  type FormaDoConvite,
} from './instalar-app-comum';

export { CHAVE_CONVITE_DISPENSADO, deveMostrarConvite, ehIphoneOuIpad, formaDoConvite };
export type { FormaDoConvite };

/** Evento não padronizado que o Chrome e o Edge enviam quando o site pode ser instalado. */
interface AvisoDeInstalacao extends Event {
  prompt: () => Promise<void>;
}

/** Estado do convite para instalar o app. */
export interface ConviteDeInstalacao {
  readonly forma: FormaDoConvite;
  /** Abre a janela de instalação do navegador (só na forma `botao`). */
  readonly instalar: () => Promise<void>;
}

/** Convite para instalar o site como app: botão (Android e computador) ou passo a passo (iPhone). */
export function useConviteDeInstalacao(): ConviteDeInstalacao {
  const [aviso, setAviso] = useState<AvisoDeInstalacao | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const guardar = (evento: Event) => {
      // Sem isto o navegador mostra o banner dele na hora; o app escolhe o momento certo.
      evento.preventDefault();
      setAviso(evento as AvisoDeInstalacao);
    };
    const instalou = () => setAviso(null);
    window.addEventListener('beforeinstallprompt', guardar);
    window.addEventListener('appinstalled', instalou);
    return () => {
      window.removeEventListener('beforeinstallprompt', guardar);
      window.removeEventListener('appinstalled', instalou);
    };
  }, []);

  const iphone =
    typeof navigator !== 'undefined' &&
    ehIphoneOuIpad(navigator.userAgent, navigator.maxTouchPoints ?? 0);
  return {
    forma: formaDoConvite(estaInstalado(), aviso !== null, iphone),
    instalar: async () => {
      if (!aviso) return;
      await aviso.prompt();
      setAviso(null);
    },
  };
}
