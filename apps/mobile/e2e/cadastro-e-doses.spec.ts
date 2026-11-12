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

test.describe('Foto de perfil', () => {
  test('CT-E2E-05: escolhe uma foto na aba Conta, ela é enviada reduzida e pode ser removida', async ({
    page,
    api,
  }) => {
    api.consentimentoAceito = true;
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('mariana@exemplo.com.br');
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('Nenhuma pessoa cadastrada')).toBeVisible();

    await page.goto('/conta');
    await expect(page.getByRole('heading', { name: 'Seus dados' })).toBeVisible();
    // Na web só existe a galeria (o seletor de arquivos); a câmera não aparece.
    await expect(page.getByRole('button', { name: 'Tirar foto' })).toHaveCount(0);

    // PNG de 1 x 1 pixel.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
      'base64',
    );
    const seletor = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Escolher foto' }).click();
    await (await seletor).setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png });

    await expect(page.getByRole('button', { name: 'Trocar foto' })).toBeVisible();
    expect(api.foto?.contentType).toBe('image/jpeg');
    expect(api.chamadas).toContain('PUT /account/photo');

    await page.getByRole('button', { name: 'Remover foto' }).click();
    await expect(page.getByRole('button', { name: 'Escolher foto' })).toBeVisible();
    expect(api.foto).toBeNull();
  });
});

test.describe('Formulário de pessoa: parentesco e gestação (RF02)', () => {
  test('CT-E2E-06: a lista do parentesco flutua sem empurrar o formulário, e "Pai" esconde a gestação', async ({
    page,
    api,
  }) => {
    api.consentimentoAceito = true;
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('mariana@exemplo.com.br');
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('button', { name: 'Adicionar pessoa' }).click();

    const gestacao = page.getByRole('checkbox', { name: /Esta pessoa está grávida/ });
    await expect(gestacao).toBeVisible();
    const antes = await gestacao.boundingBox();

    // A lista abre por cima: o campo de gestação continua exatamente no mesmo lugar.
    await page.getByRole('button', { name: /Quem é esta pessoa para você\?/ }).click();
    const lista = page.getByRole('radiogroup', { name: 'Quem é esta pessoa para você?' });
    await expect(lista).toBeVisible();
    expect(await gestacao.boundingBox()).toEqual(antes);

    // Escolher um parentesco masculino fecha a lista e tira o campo da gestação.
    await page.getByRole('radio', { name: 'Pai' }).click();
    await expect(lista).toBeHidden();
    await expect(gestacao).toBeHidden();

    // E um feminino traz o campo de volta.
    await page.getByRole('button', { name: /Quem é esta pessoa para você\?/ }).click();
    await page.getByRole('radio', { name: 'Mãe' }).click();
    await expect(gestacao).toBeVisible();
  });
});

test.describe('Animal de estimação (B73)', () => {
  test('CT-E2E-07: cadastra um animal e vê que não há calendário oficial', async ({
    page,
    api,
  }) => {
    api.consentimentoAceito = true;
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('mariana@exemplo.com.br');
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('button', { name: 'Adicionar pessoa' }).click();
    await page.getByRole('radio', { name: 'Um animal de estimação' }).click();
    await page.getByLabel('Nome do animal').fill('Rex');
    await page.getByLabel('Data de nascimento (aproximada)').fill('10032022');
    await page.getByRole('button', { name: /Qual é a espécie\?/ }).click();
    await page.getByRole('radio', { name: 'Cachorro' }).click();
    await page.getByRole('button', { name: 'Salvar e ver as vacinas' }).click();

    await expect(page.getByRole('heading', { name: 'Doses de Rex' })).toBeVisible();
    await expect(
      page.getByText('Nenhuma vacina de Rex cadastrada').filter({ visible: true }).first(),
    ).toBeVisible();
    await expect(
      page
        .getByText(/Não existe calendário nacional de vacinação para animais/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
  });
});

test.describe('Preparar viagem (B74)', () => {
  test('CT-E2E-08: monta o roteiro de viagem com a fonte oficial e o aviso', async ({
    page,
    api,
  }) => {
    api.consentimentoAceito = true;
    await page.goto('/entrar');
    await page.getByLabel('E-mail').fill('mariana@exemplo.com.br');
    await page.getByLabel('Senha', { exact: true }).fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.getByRole('button', { name: 'Adicionar pessoa' }).click();
    await page.getByLabel('Nome ou apelido').fill('Ana');
    await page.getByLabel('Data de nascimento').fill('20051990');
    await page.getByRole('button', { name: 'Salvar e ver as vacinas' }).click();
    await expect(page.getByRole('heading', { name: 'Doses de Ana' })).toBeVisible();

    await page.getByRole('link', { name: /Vou viajar/ }).click();
    await page.getByRole('button', { name: 'Ver o roteiro' }).click();
    await expect(page.getByRole('heading', { name: 'Febre amarela' })).toBeVisible();
    await expect(
      page
        .getByText(/não substitui o serviço de saúde/)
        .filter({ visible: true })
        .first(),
    ).toBeVisible();
    await page.getByRole('radio', { name: 'Para o exterior' }).click();
    await page.getByRole('button', { name: 'Ver o roteiro' }).click();
    await expect(page.getByRole('heading', { name: /Certificado Internacional/ })).toBeVisible();
  });
});
