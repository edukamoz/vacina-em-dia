import tokensJson from '../../../../docs/04-design-system/tokens.json';

/** Nomes dos temas do design system, na ordem em que o usuário os escolhe. */
export const THEME_NAMES = ['light', 'dark', 'highContrast'] as const;

/** Tema do design system: Claro, Escuro ou Alto contraste. */
export type ThemeName = (typeof THEME_NAMES)[number];

/** Nome do token de cor (por exemplo `fundo`, `texto`, `atrasada`). */
export type ColorToken = keyof typeof tokensJson.temas.claro;

/** Rótulos dos temas exibidos na interface. */
export const THEME_LABELS: Readonly<Record<ThemeName, string>> = {
  light: 'Claro',
  dark: 'Escuro',
  highContrast: 'Alto contraste',
};

const THEME_KEYS = { light: 'claro', dark: 'escuro', highContrast: 'altoContraste' } as const;

/**
 * Cores de um tema, lidas de `docs/04-design-system/tokens.json` (fonte única dos tokens).
 *
 * @param name - Tema desejado.
 * @returns Mapa de token de cor para valor hexadecimal.
 */
export function getThemeColors(name: ThemeName): Readonly<Record<ColorToken, string>> {
  return tokensJson.temas[THEME_KEYS[name]];
}

/** Tokens que não dependem do tema (tipografia, espaçamento, toque, breakpoints). */
export const baseTokens = {
  typography: tokensJson.tipografia,
  spacing: tokensJson.espacamento,
  touch: tokensJson.toque,
  breakpoints: tokensJson.breakpoints,
  layout: tokensJson.layout,
} as const;
