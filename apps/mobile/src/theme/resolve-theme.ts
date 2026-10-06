import type { ThemeName } from './tokens';

/** Escolha do usuário: seguir o sistema ou fixar um tema. */
export type ThemePreference = 'system' | ThemeName;

/**
 * Decide qual tema aplicar.
 *
 * Por padrão segue o sistema (claro ou escuro). Alto contraste só entra por escolha explícita do
 * usuário (`docs/04-design-system.md`, seção 6).
 *
 * @param preference - Escolha do usuário.
 * @param systemScheme - Esquema de cores informado pelo sistema, quando houver.
 * @returns Tema a aplicar.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemScheme: string | null | undefined,
): ThemeName {
  if (preference !== 'system') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}
