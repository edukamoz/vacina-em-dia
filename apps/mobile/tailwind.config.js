/** @type {import('tailwindcss').Config} */
const tokens = require('../../docs/04-design-system/tokens.json');

// As cores viram variáveis CSS (`--cor-<token>`); o ThemeProvider troca os valores por tema,
// então `bg-fundo` e `text-texto` funcionam igual nos três temas.
const colors = Object.fromEntries(
  Object.keys(tokens.temas.claro).map((nome) => [nome, `var(--cor-${nome})`]),
);

const { espacamento, raios, bordas, toque, tipografia, breakpoints, layout } = tokens;
const px = (mapa) => Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, `${v}px`]));

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
      spacing: px(espacamento),
      borderRadius: px(raios),
      borderWidth: Object.fromEntries(Object.entries(bordas).map(([k, v]) => [k, `${v}px`])),
      minHeight: { toque: `${toque.minimo}px`, principal: `${toque.principal}px` },
      minWidth: { toque: `${toque.minimo}px` },
      maxWidth: { conteudo: `${layout.larguraMaximaConteudo}px` },
      screens: { medio: `${breakpoints.medio}px`, expandido: `${breakpoints.expandido}px` },
      fontFamily: {
        regular: ['AtkinsonHyperlegible_400Regular'],
        negrito: ['AtkinsonHyperlegible_700Bold'],
      },
      fontSize: Object.fromEntries(
        Object.entries(tipografia.estilos).map(([nome, e]) => [
          nome,
          [`${e.tamanho}px`, { lineHeight: `${e.alturaDeLinha}px` }],
        ]),
      ),
    },
  },
  plugins: [],
};
