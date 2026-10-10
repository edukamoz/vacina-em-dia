import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PUBLICA = join(__dirname, '..', 'public');

interface Icone {
  src: string;
  sizes: string;
  purpose?: string;
}
interface Manifesto {
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  scope: string;
  display: string;
  theme_color: string;
  background_color: string;
  icons: Icone[];
  shortcuts: { name: string; url: string; icons: Icone[] }[];
}

const manifesto = JSON.parse(
  readFileSync(join(PUBLICA, 'manifest.webmanifest'), 'utf8'),
) as Manifesto;

describe('app instalável (PWA)', () => {
  test('CT-PWA-01: o manifesto tem nome, idioma, início e modo de aplicativo', () => {
    expect(manifesto.name).toBe('Vacina em Dia');
    expect(manifesto.short_name.length).toBeLessThanOrEqual(12 + 1);
    expect(manifesto.lang).toBe('pt-BR');
    expect(manifesto.start_url).toBe('/');
    expect(manifesto.scope).toBe('/');
    expect(manifesto.display).toBe('standalone');
  });

  test('CT-PWA-02: as cores do manifesto são a cor da marca do app.json', () => {
    const app = JSON.parse(readFileSync(join(__dirname, '..', 'app.json'), 'utf8')) as {
      expo: { web: { themeColor: string; lang: string } };
    };
    expect(manifesto.theme_color).toBe(app.expo.web.themeColor);
    expect(manifesto.background_color).toBe(app.expo.web.themeColor);
    expect(app.expo.web.lang).toBe(manifesto.lang);
  });

  test('CT-PWA-03: há ícones de 192 e 512 px, comuns e mascaráveis, e todos os arquivos existem', () => {
    const tamanhos = (finalidade: string) =>
      manifesto.icons.filter((i) => i.purpose === finalidade).map((i) => i.sizes);
    expect(tamanhos('any')).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(tamanhos('maskable')).toEqual(expect.arrayContaining(['192x192', '512x512']));
    for (const icone of [...manifesto.icons, ...manifesto.shortcuts.flatMap((s) => s.icons)]) {
      expect(existsSync(join(PUBLICA, icone.src))).toBe(true);
    }
  });

  test('CT-PWA-04: os atalhos levam a telas do app e começam na barra', () => {
    expect(manifesto.shortcuts.map((s) => s.url)).toEqual(['/', '/postos', '/historico']);
  });

  test('CT-PWA-05: a página-modelo liga o manifesto e o ícone do iOS, e a CSP não o bloqueia', () => {
    const modelo = readFileSync(join(PUBLICA, 'index.html'), 'utf8');
    expect(modelo).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(modelo).toContain('rel="apple-touch-icon"');
    expect(modelo).toContain('lang="%LANG_ISO_CODE%"');
    const swa = JSON.parse(readFileSync(join(PUBLICA, 'staticwebapp.config.json'), 'utf8')) as {
      navigationFallback: { exclude: string[] };
      mimeTypes: Record<string, string>;
    };
    expect(swa.navigationFallback.exclude).toEqual(
      expect.arrayContaining(['/manifest.webmanifest', '/icons/*']),
    );
    expect(swa.mimeTypes['.webmanifest']).toBe('application/manifest+json');
  });
});
