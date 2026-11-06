import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Consulta de mídia da web: pede mais contraste ou está em cores forçadas (Windows). */
export const CONSULTA_DE_CONTRASTE = '(prefers-contrast: more), (forced-colors: active)';

/**
 * Acompanha o pedido de mais contraste do sistema e avisa a cada mudança, inclusive a leitura
 * inicial.
 *
 * - Web: `prefers-contrast: more` e `forced-colors: active` (modo de contraste do Windows).
 * - iOS: "Aumentar contraste" (cores do sistema mais escuras).
 * - Android: "Texto de alto contraste".
 *
 * Qualquer falha da plataforma vira "sem pedido": o app nunca muda de tema por causa de um erro.
 *
 * @param aoMudar - Recebe `true` quando o sistema pede mais contraste.
 * @returns Função que cancela a observação.
 */
export function observarContrasteDoSistema(aoMudar: (ligado: boolean) => void): () => void {
  if (Platform.OS === 'web') {
    if (typeof matchMedia !== 'function') return () => undefined;
    const consulta = matchMedia(CONSULTA_DE_CONTRASTE);
    aoMudar(consulta.matches);
    const aoAlterar = (evento: { matches: boolean }) => aoMudar(evento.matches);
    consulta.addEventListener('change', aoAlterar);
    return () => consulta.removeEventListener('change', aoAlterar);
  }

  const ios = Platform.OS === 'ios';
  const ler = ios
    ? AccessibilityInfo.isDarkerSystemColorsEnabled
    : AccessibilityInfo.isHighTextContrastEnabled;
  let ativo = true;
  void ler
    ?.call(AccessibilityInfo)
    .then((ligado) => ativo && aoMudar(ligado))
    .catch(() => undefined);
  const assinatura = AccessibilityInfo.addEventListener?.(
    ios ? 'darkerSystemColorsChanged' : 'highTextContrastChanged',
    aoMudar,
  );
  return () => {
    ativo = false;
    assinatura?.remove();
  };
}

/**
 * Indica se o sistema pede mais contraste. Serve para o tema "Seguir o aparelho" escolher o Alto
 * contraste (`resolveTheme`); quem fixou um tema na Conta não é afetado.
 */
export function useAltoContrasteDoSistema(): boolean {
  const [ligado, setLigado] = useState(false);
  useEffect(() => observarContrasteDoSistema(setLigado), []);
  return ligado;
}
