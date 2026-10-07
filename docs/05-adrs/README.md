# Registros de decisão de arquitetura (ADRs)

Cada decisão técnica relevante tem um arquivo próprio, curto, com contexto, decisão, alternativas e consequências. Item do Jira: SCRUM-33 (requisito RNF06). As decisões ADR-001 a ADR-008 vêm do Quadro 6 do documento de Fase 0; ADR-009 e ADR-010 resolvem pendências do `CLAUDE.md` §14; ADR-011 registra as decisões do design system (SCRUM-32); ADR-012 registra a documentação da API (OpenAPI e Swagger); ADR-013 registra a sessão de demonstração provisória, usada até o login do SCRUM-13; ADR-014 substitui a ADR-005 por autenticação própria; ADR-015 adota o Brevo para o e-mail de recuperação de senha.

## Índice

| ADR | Decisão | Status |
|---|---|---|
| [ADR-001](ADR-001-api-azure-functions-sem-express.md) | API em Azure Functions (Node.js e TypeScript), sem Express | Aceita |
| [ADR-002](ADR-002-pln-function-python.md) | Serviço de PLN separado, em Azure Function com Python | Aceita |
| [ADR-003](ADR-003-voz-azure-ai-speech.md) | Reconhecimento de voz com Azure AI Speech | Aceita |
| [ADR-004](ADR-004-banco-azure-sql.md) | Banco relacional Azure SQL Database (oferta gratuita) | Aceita |
| [ADR-005](ADR-005-autenticacao-entra-external-id.md) | Autenticação com Microsoft Entra External ID | Substituída pela ADR-014 |
| [ADR-006](ADR-006-app-expo-estado.md) | App com Expo, NativeWind e Expo Router; Context API e TanStack Query | Aceita |
| [ADR-007](ADR-007-monorepo-npm-workspaces.md) | Monorepo com npm workspaces e pacote compartilhado (Zod) | Aceita |
| [ADR-008](ADR-008-key-vault-e-application-insights.md) | Segredos no Key Vault e monitoramento no Application Insights | Aceita |
| [ADR-009](ADR-009-armazenamento-de-token-na-web.md) | Armazenamento do token de sessão no app (nativo e web) | Aceita |
| [ADR-010](ADR-010-limitacao-de-taxa.md) | Limitação de taxa nos endpoints sensíveis | Aceita |
| [ADR-011](ADR-011-design-system-universal-e-acessivel.md) | Design system universal (celular e web), três temas e fonte Atkinson | Aceita |
| [ADR-012](ADR-012-documentacao-da-api-openapi-swagger.md) | Documentação da API com OpenAPI gerado dos esquemas Zod e Swagger UI | Aceita |
| [ADR-013](ADR-013-sessao-de-demonstracao-provisoria.md) | Sessão de demonstração provisória (antes do login) | Aceita (provisória) |
| [ADR-014](ADR-014-autenticacao-propria.md) | Autenticação própria (e-mail e senha no Azure SQL) | Aceita |
| [ADR-015](ADR-015-email-transacional-brevo.md) | E-mail transacional com o Brevo (recuperação de senha) | Aceita |

## Estados possíveis

**Proposta** (em discussão), **Aceita** (validada pelo autor) e **Substituída** (trocada por um ADR mais novo, que é citado). Uma decisão aceita só muda por um novo ADR que a substitua; o antigo permanece como histórico.

## Modelo

```markdown
# ADR-NNN: título

- **Status:** Proposta | Aceita | Substituída por ADR-NNN
- **Data:** AAAA-MM-DD
- **Decisor:** autor
- **Requisitos relacionados:** RFxx, RNFxx

## Contexto
## Decisão
## Alternativas consideradas
## Consequências
## Verificações e fontes
```

## Convenções

- Fatos sobre preço, limite, região e disponibilidade citam a fonte e a data da consulta. Valores de custo definitivos entram na estimativa do SCRUM-26.
- Versões exatas das tecnologias não ficam nos ADRs; ficam em `docs/tech-versions.md`, criado no setup (SCRUM-23).
- Contexto de custo do projeto: assinatura **Azure for Students** (crédito de US$ 100, com limite de gastos ativado); a meta é usar camadas gratuitas sempre que possível.
