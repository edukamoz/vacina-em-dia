import { test, expect, SENHA } from './base';

test.describe('Cadastro até a primeira dose (RF01, RF02, RF03, RF04, RF09)', () => {
  test('CT-E2E-01: cria a conta, aceita o consentimento, cadastra uma pessoa e registra uma dose', async ({
    page,
    api,
  }) => {
    await page.goto('/apresentacao');
    await page.getByRole('button', { name: 'Criar conta' }).first().click();
    await expect(page).toHaveURL(/criar-conta/);

    // Senhas diferentes: o erro aparece e nada é enviado.
    await page.getByLabel('E-mail').fill('mariana@exemplo.com.br');
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByLabel('Repita a senha').fill(`${SENHA}x`);
    await page.getByRole('checkbox', { name: /Li e aceito os termos/ }).click();
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText(/As senhas não são iguais/)).toBeVisible();
    expect(api.chamadas).not.toContain('POST /auth/register');

    // Corrigida, a conta é criada e o app pede o consentimento.
    await page.getByLabel('Repita a senha').fill(SENHA);
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByRole('button', { name: 'Aceitar e continuar' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aceitar e continuar' })).toBeDisabled();
    await page.getByRole('checkbox', { name: /Li e aceito/ }).click();
    await page.getByRole('checkbox', { name: /responsável legal/ }).click();
    await page.getByRole('button', { name: 'Aceitar e continuar' }).click();
    expect(api.consentimentoAceito).toBe(true);

    // Sem ninguém cadastrado, o app convida a adicionar a primeira pessoa.
    await expect(page.getByText('Nenhuma pessoa cadastrada')).toBeVisible();
    await page.getByRole('button', { name: 'Adicionar pessoa' }).click();
    await page.getByLabel('Nome ou apelido').fill('Maria');
    await page.getByLabel('Data de nascimento').fill('20052025');
    await page.getByRole('button', { name: 'Salvar e ver as vacinas' }).click();

    // O calendário da Maria mostra a fonte oficial e o aviso.
    await expect(page.getByRole('heading', { name: 'Doses de Maria' })).toBeVisible();
    await expect(page.getByRole('button', { name: /BCG, dose única/ })).toBeVisible();
    await expect(
      page
        .getByText(/Calendário Nacional de Vacinação 2026/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByText(/não substitui a caderneta oficial/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();

    // Detalhe e registro da aplicação.
    await page.getByRole('button', { name: /BCG, dose única/ }).click();
    await expect(page.getByText('tuberculose').filter({ visible: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Registrar aplicação' }).click();
    await page
      .getByRole('button', { name: '1 de outubro de 2026', exact: true })
      .filter({ visible: true })
      .click();
    await page.getByRole('button', { name: 'Confirmar aplicação' }).click();
    await expect(
      page
        .getByText(/Esta dose já foi aplicada/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    expect(api.doses.find((d) => d.ruleId === 'bcg')?.status).toBe('APPLIED');
  });
});
