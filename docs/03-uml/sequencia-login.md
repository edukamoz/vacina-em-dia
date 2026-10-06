# Diagrama de sequência: cadastro, login e primeiro acesso (RF01 e RF09)

Item do Jira: SCRUM-31. Decisões relacionadas: ADR-005 (Entra External ID) e ADR-009 (armazenamento do token).

A senha **nunca** passa pela API: o app autentica direto no Entra External ID (fluxo OAuth 2.0 com PKCE) e envia à API apenas o token de acesso.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant A as App (Expo)
    participant E as Entra External ID
    participant TS as TokenStorage
    participant API as API (Azure Functions)
    participant DB as Azure SQL

    U->>A: Toca em "Entrar" ou "Criar conta"
    A->>E: Abre o fluxo de login (código de autorização + PKCE)
    E->>U: Pede e-mail e senha (e verificação, se houver)
    U->>E: Informa as credenciais
    E-->>A: Código de autorização
    A->>E: Troca o código pelos tokens (com o verificador PKCE)
    E-->>A: Token de acesso (e de renovação, se aplicável)
    A->>TS: Guarda os tokens (SecureStore no nativo, sessionStorage na web)

    A->>API: GET /me (Authorization: Bearer token)
    API->>API: Valida assinatura, emissor, público, escopo e validade
    alt token inválido ou expirado
        API-->>A: 401 (sem detalhes internos)
        A->>E: Renova o token ou volta ao login
    else token válido
        API->>DB: Busca usuário por externalId (claim oid)
        alt primeiro acesso
            API->>DB: Cria o usuário (apenas o identificador opaco)
        end
        API->>DB: Consulta o aceite da versão vigente do termo
        API-->>A: 200 com perfil mínimo e "consentimento pendente" (sim ou não)
    end

    opt consentimento pendente
        A->>U: Exibe o termo em linguagem simples
        U->>A: Aceita o termo
        A->>API: POST /me/consent (versão do termo)
        API->>DB: Registra o aceite (versão e data)
        API-->>A: 201
    end

    A->>U: Libera a área de membros e doses
```

## Pontos de atenção

- **LGPD:** sem aceite da versão vigente do termo, a API recusa os demais endpoints de dados com um erro específico (por exemplo, 403 com o código `CONSENT_REQUIRED`); o app leva o usuário à tela de consentimento.
- **Logs:** a API registra apenas o identificador opaco do usuário e o resultado; nunca o token, o e-mail ou o nome.
- **Limitação de tentativas de login:** é do Entra (ADR-010); a API não vê credenciais.
- **Rotas e códigos** acima são exemplos para ilustrar o fluxo; o contrato definitivo da API entra na Documentação Técnica.
- O ADR-005 deixa em aberto a biblioteca de login por plataforma (MSAL ou `expo-auth-session`); a decisão é do SCRUM-13.
