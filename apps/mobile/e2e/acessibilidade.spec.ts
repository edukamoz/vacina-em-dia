import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './base';

/**
 * Verificação automática de acessibilidade (WCAG 2.1 A e AA, RNF04) com o axe-core nas telas de
 * antes do login, nos três temas. Ela não substitui o teste com leitor de tela, mas pega o que uma
 * máquina consegue: contraste, nomes de botões e campos, hierarquia de títulos e idioma.
 */
const TELAS = ['/apresentacao', '/entrar', '/criar-conta'] as const;
const TEMAS = [
  { nome: 'claro', esquema: 'light' as const },
  { nome: 'escuro', esquema: 'dark' as const },
];

for (const tela of TELAS) {
  for (const tema of TEMAS) {
    test(`CT-E2E-A11Y: ${tela} (tema ${tema.nome}) sem violações graves do WCAG 2.1 AA`, async ({
      page,
    }, info) => {
      await page.emulateMedia({ colorScheme: tema.esquema, reducedMotion: 'reduce' });
      await page.goto(tela);
      await expect(page.getByRole('heading').first()).toBeVisible();

      const resultado = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      await info.attach(`axe${tela.replace('/', '-')}-${tema.nome}.json`, {
        body: JSON.stringify(resultado.violations, null, 2),
        contentType: 'application/json',
      });

      info.annotations.push({
        type: 'axe',
        description: `${resultado.violations.length} violações no total, ${resultado.passes.length} regras cumpridas`,
      });

      const graves = resultado.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious',
      );
      expect(
        graves.map((v) => `${v.id}: ${v.help} (${v.nodes.length} elementos)`),
        'violações graves',
      ).toEqual([]);
    });
  }
}
