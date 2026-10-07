# ADR-014: Autenticação própria (e-mail e senha no Azure SQL)

- **Status:** Aceita (substitui a [ADR-005](ADR-005-autenticacao-entra-external-id.md))
- **Data:** 2026-10-07
- **Decisor:** autor
- **Requisitos relacionados:** RF01, RF09, RNF02, RNF03, RNF09

## Contexto

A ADR-005 escolheu o Microsoft Entra External ID. Em 07/10/2026 o portal do Entra respondeu **401 "Insufficient privileges"** ao autor: o diretório da faculdade (Centro Paula Souza) não permite que alunos criem tenants. Sem tenant não há como usar o Entra External ID, e o prazo (19/11) não comporta esperar uma liberação. O autor decidiu descartar o tenant e implementar login próprio.

## Decisão

- **Cadastro e login por e-mail e senha**, implementados na própria API (Azure Functions), com as contas no **Azure SQL** (ADR-004).
- **Senha:** nunca guardada. Guarda-se apenas o hash **scrypt** (módulo `node:crypto`, sem dependência nova), com sal aleatório de 16 bytes por conta e parâmetros gravados junto do hash para permitir aumentar o custo depois. Parâmetros iniciais: N = 2^15, r = 8, p = 3 (uso de memória de ~32 MB, compatível com instância de 512 MB); **conferir contra a recomendação vigente da OWASP (Password Storage Cheat Sheet) na implementação**. Comparação em tempo constante.
- **Política de senha** (orientação do NIST SP 800-63B, sem regras de composição): mínimo de 8 caracteres, máximo de 128, recusa de senhas comuns (lista pequena versionada) e de senha igual ao e-mail.
- **Sessão:** token de acesso **JWT HS256** de vida curta (15 minutos), com `sub` igual ao identificador opaco da conta; e **token de renovação** opaco e aleatório (256 bits), guardado só como hash no banco, com rotação a cada uso e validade de 30 dias. Sair da conta revoga o token de renovação. A chave de assinatura fica no **Key Vault** (ADR-008), nunca no repositório.
- **Armazenamento do token no app:** como na ADR-009 (`expo-secure-store` no nativo; `sessionStorage` com CSP na web).
- **Proteção contra tentativas repetidas** (a ADR-010 deixava isso ao Entra): limite por e-mail e por origem, **5 falhas em 15 minutos bloqueiam novas tentativas por 15 minutos** (resposta 429 com `Retry-After`). Mensagem única "E-mail ou senha incorretos" para conta inexistente e senha errada, e o mesmo custo de cálculo nos dois casos, para não revelar quais e-mails existem.
- **Dados da conta:** e-mail (minúsculas, normalizado), hash da senha, data de criação e data do consentimento. Nenhum CPF. O e-mail é dado pessoal e entra na política de privacidade e na exclusão de conta (RF09); não vai para logs.
- **Rotas:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`; as demais rotas passam a exigir `Authorization: Bearer`. O cabeçalho de demonstração (ADR-013) deixa de valer em produção e fica só em testes e desenvolvimento, até ser removido.
- **Fora do primeiro corte:** confirmação de e-mail e **recuperação de senha** exigem enviar e-mail (por exemplo, Azure Communication Services Email, que tem custo e precisa de aprovação do autor, conforme `CLAUDE.md` §3). Até lá, a tela "Esqueci minha senha" explica que a recuperação ainda não está disponível. É um risco aceito para a demonstração.
- **Troca futura:** a API depende de uma interface de "provedor de identidade" (`AuthService`); trocar para o Entra External ID mais tarde significa trocar essa implementação, sem mudar os demais serviços.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Entra External ID (ADR-005) | Bloqueado: o diretório da faculdade não permite criar tenant. |
| Tenant externo com conta Microsoft pessoal | Possível, mas o autor decidiu não usar tenant; dependeria de um teste gratuito de 30 dias que expira antes de 19/11. |
| Azure AD B2C | Descontinuado para novos clientes (ver ADR-005). |
| Login social apenas | Não atende o RF01 (e-mail e senha). |

## Consequências

- **Responsabilidade:** o projeto passa a guardar credenciais. Isso contraria a redação atual do **RNF02** ("autenticação gerenciada pela plataforma de identidade"), que foi reescrita: "autenticação com senha protegida por hash forte (scrypt), tokens de curta duração e limite de tentativas". A mudança deve ser mencionada na apresentação como decisão consciente.
- **Persistência obrigatória:** contas não podem ficar em memória. O login depende da **persistência no Azure SQL** (usuário do banco para a identidade gerenciada da API, tabelas e migrações), que passa a ser pré-requisito do SCRUM-13.
- **Residência dos dados:** como o e-mail e o hash ficam no Azure SQL em Brazil South, deixa de existir a transferência internacional prevista na ADR-005 (menos um ponto na política de privacidade).
- **Exclusão de conta:** remove a conta, os tokens de renovação e os dados dos membros, sem chamada a serviço externo.
- **Custo:** zero adicional (nenhum serviço novo).
- **Testes de segurança:** casos para hash e comparação, política de senha, enumeração de contas, bloqueio por tentativas, expiração e rotação do token de renovação, adulteração do JWT e acesso a dados de outra conta.
- O `docs/12-guia-tenant-entra.md` fica como **histórico** e não deve ser seguido.

## Verificações e fontes

- Erro 401 "Insufficient privileges" ao abrir o Entra, relatado pelo autor em 07/10/2026.
- Orientação de senhas: NIST SP 800-63B e OWASP Password Storage Cheat Sheet (a conferir na implementação, SCRUM-13).
