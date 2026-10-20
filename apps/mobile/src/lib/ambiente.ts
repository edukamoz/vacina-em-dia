import { Platform, useWindowDimensions } from 'react-native';
import { modoDeLayout } from './layout';

/**
 * Em que "forma" o app está sendo usado. A primeira tela (e o que mais mudar entre eles) tem um
 * desenho próprio para cada um:
 *
 * - `app`: aplicativo instalado (Android e iOS) ou site instalado como app (PWA), sem a moldura do
 *   navegador: abertura enxuta, direta ao ponto;
 * - `web-grande`: site no computador (a partir de 1024 px): página de apresentação completa;
 * - `web-pequena`: site no celular ou numa janela estreita: página compacta, pensada para o toque.
 */
export type Ambiente = 'app' | 'web-grande' | 'web-pequena';

/**
 * Escolhe o ambiente. Pura, para testar sem aparelho.
 *
 * @param plataforma - `Platform.OS`.
 * @param largura - Largura da janela, em pixels.
 * @param instalado - Verdadeiro quando o site roda instalado como app (modo "standalone").
 */
export function escolherAmbiente(
  plataforma: string,
  largura: number,
  instalado: boolean,
): Ambiente {
  if (plataforma !== 'web' || instalado) return 'app';
  return modoDeLayout(largura) === 'expandido' ? 'web-grande' : 'web-pequena';
}

/**
 * Diz se o site está aberto como app instalado (PWA): `display-mode: standalone` no Android e no
 * computador, `navigator.standalone` no iPhone. Falso fora da web.
 */
export function estaInstalado(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  const padrao = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iphone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return padrao || iphone;
}

/** Ambiente atual, atualizado quando a janela muda de tamanho. */
export function useAmbiente(): Ambiente {
  const largura = useWindowDimensions().width;
  return escolherAmbiente(Platform.OS, largura, estaInstalado());
}
