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

/** Nível de elevação das sombras do design system (`sombras` em `tokens.json`). */
export type NivelDeSombra = keyof typeof tokensJson.sombras;

/**
 * Sombra de um nível, no formato CSS aceito por `boxShadow`. No Alto contraste vale `none`: a
 * borda de 3 px separa as superfícies.
 *
 * @param nivel - `1` (cartão em repouso), `2` (elevado) ou `3` (painel, folha, botão flutuante).
 * @param tema - Tema ativo.
 */
export function getShadow(nivel: NivelDeSombra, tema: ThemeName): string {
  return tokensJson.sombras[nivel][THEME_KEYS[tema]];
}

/**
 * Gradiente da marca (135 graus, de `primaria` até `primariaProfunda`). No Alto contraste não há
 * gradiente: devolve a cor chapada.
 */
export function getBrandGradient(tema: ThemeName): string {
  const cores = getThemeColors(tema);
  return tema === 'highContrast'
    ? cores.primaria
    : `linear-gradient(135deg, ${cores.primaria}, ${cores.primariaProfunda})`;
}

/** Gradiente do fundo da tela, de `fundo` até `fundoProfundo`; chapado no Alto contraste. */
export function getBackgroundGradient(tema: ThemeName): string {
  const cores = getThemeColors(tema);
  return tema === 'highContrast'
    ? cores.fundo
    : `linear-gradient(180deg, ${cores.fundo}, ${cores.fundoProfundo})`;
}
