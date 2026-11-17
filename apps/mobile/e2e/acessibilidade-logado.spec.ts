import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { test, expect, SENHA } from './base';

/**
 * Acessibilidade das telas de dentro do app (WCAG 2.1 A e AA, RNF04) com o axe-core, nos três
 * temas (Claro, Escuro e Alto contraste, este pelo modo de cores forçadas do sistema), e a checagem
 * de reflow: a 320 px de largura (o que o texto a 200% equivale) nenhuma tela pode rolar para o
 * lado (WCAG 1.4.10). Pega o que uma máquina consegue; não substitui o leitor de tela (B40).
 */
const TEMAS = [
  { nome: 'claro', midia: { colorScheme: 'light' as const } },
  { nome: 'escuro', midia: { colorScheme: 'dark' as const } },
  {
    nome: 'alto contraste',
    midia: { colorScheme: 'light' as const, forcedColors: 'active' as const },
  },
];

const TELAS = [
  { nome: 'Doses', caminho: '/' },
  { nome: 'Família', caminho: '/familia' },
  { nome: 'Histórico', caminho: '/historico' },
  { nome: 'Conta', caminho: '/conta' },
  { nome: 'Painel de gráficos', caminho: '/painel' },
  { nome: 'Preparar viagem', caminho: '/viagem' },
];

async function entrarComAna(page: Page) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill('mariana@exemplo.com.br');
  await page.getByLabel('Senha', { exact: true }).fill(SENHA);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('button', { name: 'Adicionar pessoa' }).click();
  await page.getByLabel('Nome ou apelido').fill('Ana');
  await page.getByLabel('Data de nascimento').fill('20051990');
  await page.getByRole('button', { name: 'Salvar e ver as vacinas' }).click();
  await expect(page.getByRole('heading', { name: 'Doses de Ana' })).toBeVisible();
}

async function irPara(page: Page, caminho: string) {
  // Navegação interna (sem recarregar), para a sessão da API falsa continuar valendo.
  await page.evaluate((destino) => {
    window.history.pushState({}, '', destino);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, caminho);
  await page.waitForTimeout(600);
}

for (const tema of TEMAS) {
  test(`CT-E2E-A11Y-L: telas do app (tema ${tema.nome}) sem violações graves do WCAG 2.1 AA`, async ({
    page,
    api,
  }, info) => {
    api.consentimentoAceito = true;
    await page.emulateMedia({ ...tema.midia, reducedMotion: 'reduce' });
    await entrarComAna(page);

    const graves: string[] = [];
    for (const tela of TELAS) {
      await irPara(page, tela.caminho);
      await expect(page.getByRole('heading').first()).toBeVisible();
      const resultado = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      await info.attach(`axe-${tela.nome}-${tema.nome}.json`, {
        body: JSON.stringify(resultado.violations, null, 2),
        contentType: 'application/json',
      });
      for (const v of resultado.violations) {
        if (v.impact === 'critical' || v.impact === 'serious') {
          const onde = v.nodes
            .slice(0, 3)
            .map((n) => `${n.target.join(' ')} => ${n.html.slice(0, 120)}`)
            .join(' | ');
          graves.push(`${tela.nome}: ${v.id}: ${v.help} (${v.nodes.length} elementos) ${onde}`);
        }
      }
    }
    expect(graves, 'violações graves').toEqual([]);
  });
}

test('CT-E2E-A11Y-R: a 320 px nenhuma tela do app rola para o lado (reflow, WCAG 1.4.10)', async ({
  page,
  api,
}) => {
  api.consentimentoAceito = true;
  await page.setViewportSize({ width: 320, height: 640 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await entrarComAna(page);

  const estouros: string[] = [];
  for (const tela of TELAS) {
    await irPara(page, tela.caminho);
    await expect(page.getByRole('heading').first()).toBeVisible();
    const largura = await page.evaluate(() => {
      // Conta só o que realmente força rolagem da página: um elemento que passa da janela mas está
      // dentro de uma faixa com rolagem lateral própria (carrossel, abas) não conta; o que fica
      // cortado por `overflow: hidden` conta, porque a pessoa não consegue ver.
      const janela = window.innerWidth;
      const cortado = (el: HTMLElement) => {
        for (let pai = el.parentElement; pai; pai = pai.parentElement) {
          const estilo = getComputedStyle(pai);
          // Só `auto` e `scroll` deixam a pessoa chegar ao que passou; `hidden` esconde de vez.
          const lateral = ['auto', 'scroll'].includes(estilo.overflowX);
          if (lateral && pai.getBoundingClientRect().right <= janela + 1) return true;
        }
        return false;
      };
      let maior = 0;
      let quem = '';
      for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
        const direita = el.getBoundingClientRect().right;
        if (direita > maior && direita > janela + 1 && !cortado(el)) {
          maior = direita;
          quem = `${el.tagName.toLowerCase()} "${(el.textContent ?? '').trim().slice(0, 40)}"`;
        }
      }
      return { janela, conteudo: Math.ceil(maior), quem };
    });
    // Folga de 1 px por arredondamento.
    if (largura.conteudo > largura.janela + 1) {
      estouros.push(
        `${tela.nome}: ${largura.quem} vai até ${largura.conteudo} px numa janela de ${largura.janela} px`,
      );
    }
  }
  expect(estouros, 'telas que estouram a largura').toEqual([]);
});
