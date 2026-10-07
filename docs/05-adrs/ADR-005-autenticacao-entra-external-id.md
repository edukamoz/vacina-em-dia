# ADR-005: Autenticação com Microsoft Entra External ID

- **Status:** Substituída pela [ADR-014](ADR-014-autenticacao-propria.md) em 2026-10-07 (o diretório da faculdade bloqueou a criação do tenant)
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RF01, RF09, RNF02, RNF03, RNF09

## Contexto

O RNF02 exige autenticação gerenciada pela plataforma de identidade, e o RF01 pede cadastro e login por e-mail e senha com sessão segura. Guardar senhas por conta própria aumenta o risco e a responsabilidade (LGPD).

## Decisão

- Usar o **Microsoft Entra External ID** em um **tenant externo** (configuração para clientes de aplicativos), com cadastro e login por e-mail e senha.
- O app obtém tokens por fluxo OAuth 2.0 / OpenID Connect com PKCE; a API valida o token (assinatura, emissor, público e escopo) e usa **apenas o identificador opaco do usuário** (`oid`) como chave. Nenhum dado de identidade além disso é copiado para o banco.
- A **proteção contra tentativas repetidas de login é delegada ao Entra**; a API não implementa a sua (ver ADR-010). Conferir a configuração de bloqueio no SCRUM-13.
- Onde guardar o token no app: ADR-009.
- A biblioteca de cliente (MSAL ou `expo-auth-session`) será escolhida no protótipo do SCRUM-13, pois funciona nas três plataformas de formas diferentes.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Azure AD B2C | Descontinuado para novos clientes desde 1º/05/2025 (conforme a documentação da Microsoft). |
| Autenticação própria (senha no Azure SQL) | O projeto passaria a guardar credenciais; mais código e risco; contraria o RNF02. |
| Provedores sociais apenas (Google etc.) | Exclui quem não usa a conta; o RF01 pede e-mail e senha. |

## Consequências

- **Custo:** os primeiros 50.000 usuários ativos por mês são gratuitos; SMS e outros complementos são pagos e **não serão usados** (sem MFA por SMS).
- O tenant externo precisa ser **vinculado a uma assinatura** de um tenant corporativo; a assinatura do autor está no diretório Centro Paula Souza. Verificado em 06/10/2026: o usuário tem permissão padrão para criar tenants (`allowedToCreateTenants = true`). A criação efetiva fica no SCRUM-22; se a política do diretório bloquear, abrir um tenant próprio com outra conta e registrar um novo ADR.
- **Residência dos dados:** os locais disponíveis para o recurso de diretório são Global, Estados Unidos, Europa, Ásia-Pacífico, Austrália e Japão; **não há região no Brasil**. Isso significa transferência internacional de dados (e-mail e hash de credencial) e precisa constar na política de privacidade e no consentimento (RF09).
- O provedor `Microsoft.AzureActiveDirectory` **ainda não está registrado** na assinatura; o registro ocorre no SCRUM-22.
- A exclusão de conta (RF09) precisa remover também o usuário no Entra, via Microsoft Graph.

## Verificações e fontes

- [Preços do External ID](https://learn.microsoft.com/en-us/entra/external-id/external-identities-pricing), consultado em 06/10/2026 (50.000 MAU gratuitos; vínculo com assinatura; exigência de tenant corporativo).
- [Visão geral do External ID](https://learn.microsoft.com/en-us/entra/external-id/external-identities-overview), consultado em 06/10/2026 (fim da venda do Azure AD B2C em 1º/05/2025).
- Consulta ao provedor `Microsoft.AzureActiveDirectory` (`ciamDirectories`) e à política do diretório via `az`, em 06/10/2026.
