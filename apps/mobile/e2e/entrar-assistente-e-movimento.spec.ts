import { test, expect, SENHA } from './base';

test.describe('Entrar (RF01)', () => {
  test('CT-E2E-02: senha errada mostra a mensagem da API; senha certa leva ao app', async ({
    page,
    api,
  }) => {
    api.consentimentoAceito = true;
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('mariana@exemplo.com.br');
    await page.getByLabel('Senha', { exact: true }).fill('senha errada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();

    // O botão "Mostrar" fica dentro do campo e revela a senha.
    await expect(page.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'password');
    await page.getByRole('button', { name: 'Mostrar a senha' }).click();
    await expect(page.getByLabel('Senha', { exact: true })).not.toHaveAttribute('type', 'password');
    await expect(page.getByRole('button', { name: 'Esconder a senha' })).toBeVisible();

    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Nenhuma pessoa cadastrada')).toBeVisible();
  });
});

test.describe('Assistente (RF07)', () => {
  test('CT-E2E-03: abre o balão, pergunta e recebe a resposta curada com a fonte', async ({
    page,
    api,
  }) => {
    api.consentimentoAceito = true;
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('mariana@exemplo.com.br');
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Nenhuma pessoa cadastrada')).toBeVisible();

    await page.getByRole('button', { name: 'Abrir o assistente' }).click();
    const janela = page.getByRole('dialog', { name: 'Assistente' });
    await expect(janela).toBeVisible();
    await janela.getByLabel('Sua pergunta').fill('Para que serve a BCG?');
    await janela.getByRole('button', { name: 'Enviar' }).click();
    await expect(janela.getByText(/protege contra formas graves da tuberculose/)).toBeVisible();
    await expect(janela.getByText(/Ministério da Saúde \(PNI\)/)).toBeVisible();
  });
});

test.describe('Movimento (RNF04)', () => {
  test('CT-E2E-04: o padrão segue o sistema (ADR-026); o atalho escolhe na hora e a escolha vale mais que o sistema', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/apresentacao');
    const raiz = page.locator('html');
    // Sem escolha guardada, o sistema pedindo menos movimento deixa tudo parado.
    await expect(raiz).toHaveAttribute('data-movimento', 'reduzido');

    // O atalho do rodapé anima mesmo assim ("Animar sempre") e volta a reduzir.
    await page.getByRole('switch', { name: 'Reduzir movimento' }).click();
    await expect(raiz).toHaveAttribute('data-movimento', 'normal');
    await page.getByRole('switch', { name: 'Reduzir movimento' }).click();
    await expect(raiz).toHaveAttribute('data-movimento', 'reduzido');
  });

  test('CT-E2E-04b: sem pedido do sistema, o padrão anima', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/apresentacao');
    await expect(page.locator('html')).toHaveAttribute('data-movimento', 'normal');
  });
});
