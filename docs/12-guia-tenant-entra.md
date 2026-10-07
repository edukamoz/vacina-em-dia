# Guia: criar o tenant externo do Microsoft Entra External ID (SCRUM-13)

Objetivo: ter o diretório (tenant) onde ficam as contas do app, para trocar a sessão de demonstração (ADR-013) pelo login real (RF01, ADR-005). Os passos abaixo seguem a documentação oficial da Microsoft ([Criar um tenant externo](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-create-external-tenant-portal), consultada em 07/10/2026).

## Antes de começar

- Use a conta da faculdade (a que está no `az login`). O diretório dela é o do Centro Paula Souza.
- A criação exige o papel **Tenant Creator** (Criador de tenant) no diretório. Se o menu "Criar" não aparecer ou der erro de permissão, o diretório da faculdade não liberou: use a **opção de teste de 30 dias** (primeiro item do passo 5), que **não** precisa de assinatura nem desse papel. Atenção: o teste expira em 30 dias (cobriria até meados de novembro; a entrega final é em 19/11), então é preciso converter para um tenant com assinatura ou refazer.
- **O país/região escolhido não pode ser mudado depois.** Escolha **Brasil**. (Não há região de dados no Brasil para o Entra: isso deve constar na política de privacidade; ver pendência do SCRUM-14.)

## Passo a passo

Os nomes dos menus podem aparecer em inglês ou português, conforme o idioma do portal. Em inglês: *Entra ID > Overview > Manage tenants > Create > External*.

1. Entre em <https://entra.microsoft.com> com a conta da faculdade.
2. Vá em **Entra ID** > **Visão geral** > **Gerenciar locatários** (Manage tenants).
3. Clique em **Criar**.
4. Escolha **Externo** e **Continuar**.
5. Escolha a assinatura **Azure for Students** (ou, se der erro de permissão, o teste de 30 dias).
6. Na aba **Noções básicas**:
   - **Nome do locatário:** `Vacina em Dia`.
   - **Nome de domínio:** `vacinaemdia` (vira `vacinaemdia.onmicrosoft.com`; se já existir, tente `vacinaemdia2026`).
   - **País/Região:** Brasil.
7. **Avançar: Adicionar uma assinatura**: escolha `Azure for Students` e o grupo de recursos `rg-vacinaemdia`.
8. **Avançar: Revisar + criar** e **Criar**. A criação leva até 30 minutos; acompanhe nas notificações.
9. Quando terminar, abra o menu de configurações (engrenagem) > **Diretórios + assinaturas**, ache o diretório novo e clique em **Trocar**.
10. Em **Visão geral do locatário**, copie **ID do locatário**, **Nome** e **Domínio primário** e me envie. Esses três valores não são segredos.

## O que eu faço depois (SCRUM-13)

Registro o aplicativo (web e móvel), crio o fluxo de cadastro e entrada com e-mail e senha, ligo o login no app e na API (validação do token, no lugar do cabeçalho de sessão de demonstração) e atualizo os documentos. Para isso preciso do que o passo 10 pede. **Nunca envie senhas nem segredos de aplicativo no chat.**
