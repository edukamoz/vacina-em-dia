import tokensJson from '../../../../docs/04-design-system/tokens.json';
import { THEME_NAMES, getThemeColors } from './tokens';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require('../../tailwind.config.js') as {
  theme: { extend: { colors: Record<string, string> } };
};

/** Contraste de duas cores hexadecimais, pela fórmula do WCAG 2.1. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('tokens do design system', () => {
  test('CT-TOK-01: os três temas têm exatamente os mesmos tokens de cor', () => {
    const [claro, escuro, alto] = Object.values(tokensJson.temas).map((t) => Object.keys(t).sort());
    expect(escuro).toEqual(claro);
    expect(alto).toEqual(claro);
  });

  test('CT-TOK-02: o tailwind.config expõe todos os tokens de cor como variáveis CSS', () => {
    const colors = tailwindConfig.theme.extend.colors;
    expect(Object.keys(colors).sort()).toEqual(Object.keys(tokensJson.temas.claro).sort());
    expect(colors.fundo).toBe('var(--cor-fundo)');
  });

  test.each(THEME_NAMES)('CT-TOK-03: texto e fundo do tema %s têm contraste mínimo de 4,5:1', (name) => {
    const cores = getThemeColors(name);
    expect(contrast(cores.texto, cores.fundo)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(cores.sobrePrimaria, cores.primaria)).toBeGreaterThanOrEqual(4.5);
  });

  test('CT-TOK-04: alto contraste tem contraste mínimo de 7:1 no texto', () => {
    const cores = getThemeColors('highContrast');
    expect(contrast(cores.texto, cores.fundo)).toBeGreaterThanOrEqual(7);
  });
});
