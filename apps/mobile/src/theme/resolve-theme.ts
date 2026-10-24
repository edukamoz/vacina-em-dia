import type { ThemeName } from './tokens';

/** Escolha do usuário: seguir o sistema ou fixar um tema. */
export type ThemePreference = 'system' | ThemeName;

/**
 * Decide qual tema aplicar.
 *
 * Por padrão segue o sistema: Alto contraste se o sistema pede mais contraste, senão claro ou
 * escuro. Quem fixou um tema na Conta não é afetado pelo sistema.
 *
 * @param preference - Escolha do usuário.
 * @param systemScheme - Esquema de cores informado pelo sistema, quando houver.
 * @param systemHighContrast - O sistema pede mais contraste (padrão: não).
 * @returns Tema a aplicar.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
  systemHighContrast = false,
): ThemeName {
  if (preference !== 'system') return preference;
  if (systemHighContrast) return 'highContrast';
  return systemScheme === 'dark' ? 'dark' : 'light';
}
