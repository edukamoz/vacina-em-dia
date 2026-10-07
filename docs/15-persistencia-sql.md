# Persistência no Azure SQL (SCRUM-15 e SCRUM-13)

Os dados passam a viver no Azure SQL (ADR-004), com a API sem senha de banco (ADR-014 e `docs/08-infraestrutura-azure.md`).

## Estado (07/10/2026)

| Parte | Situação |
|---|---|
| Esquema (`apps/api/db/migrations/001-inicial.sql`) | Aplicado no banco `sqldb-vacinaemdia` |
| Repositórios SQL (contas, tokens, consentimento, membros, doses) | Prontos; mesmos testes de contrato dos repositórios em memória |
| Usuário do banco para a identidade gerenciada da API | Criado (leitura e escrita), por `scripts/db-migrate.mjs` |
| Ligado na API do Azure (`SQL_SERVER` e `SQL_DATABASE`) | **Não**: a sessão de demonstração do app atual quebraria (ver abaixo) |
| Migração `002-redefinicao-de-senha.sql` (tabela `password_reset_token`) | Aplicada em 07/10/2026 |
| Migração `003-parentesco-do-membro.sql` (coluna `member.relationship`) | **Escrita, ainda não aplicada no banco da nuvem** (aplicar antes de publicar a API que a usa) |
| Histórico de eventos da dose (`dose_event`), lembretes e dispositivos push | Não existem ainda (SCRUM-19) |

## Esquema implementado

Resumo; o modelo completo planejado está em `docs/03-uml/der.md` e `dicionario-de-dados.md`. **Diferenças em relação ao DER**, decididas na implementação:

- O calendário vacinal continua como **dado versionado no código** (`PNI_2026`, com teste de sincronia com o serviço de PLN), não em tabelas (`calendar_version`, `vaccine`, `dose_rule`): a dose guarda só o `rule_id`. Evita duas fontes de verdade para o calendário.
- Login próprio (ADR-014): `app_account` (e-mail, hash da senha) no lugar de `app_user.external_id`, e `refresh_token`.
- `consent` guarda o aceite atual da conta (versão, momento, declaração de responsável), não o histórico.
- `member.is_pregnant` no lugar das tabelas de grupos específicos.
- Identificadores são texto (`VARCHAR(64)`, UUID gerado pela API), para não depender da caixa dos GUIDs do SQL Server.

| Tabela | Colunas principais |
|---|---|
| `app_account` | `id`, `email` (único), `password_hash`, `created_at` |
| `refresh_token` | `token_hash` (SHA-256), `account_id`, `expires_at`, `revoked_at` |
| `consent` | `account_id`, `term_version`, `accepted_at`, `guardian_declaration` |
| `member` | `id`, `account_id`, `display_name`, `birth_date`, `is_pregnant`, `relationship` (opcional; código de parentesco), `seq` |
| `password_reset_token` | `token_hash` (SHA-256), `account_id`, `expires_at`, `used_at` |
| `dose` | `id`, `member_id`, `rule_id`, `status` (CHECK nos 5 estados), `due_date`, `scheduled_date`, `applied_date`, `seq` |

Excluir a conta apaga tudo em cascata (RF09). A propriedade é conferida em toda consulta: membros por `account_id`, doses pela junção com o membro do dono.

## Como funciona

- **Acesso:** só Microsoft Entra (sem senha de SQL). Na nuvem, a identidade gerenciada da Function App; no computador do desenvolvedor, o `az login`. Consultas parametrizadas, nunca concatenadas.
- **Banco gratuito pausa por inatividade:** o primeiro acesso depois da pausa leva até cerca de um minuto (tempo de conexão de 60 s e até 4 tentativas em erros transitórios). Medido em 07/10/2026: cadastro com a conexão fria ~4 s; login com a conexão aberta ~0,2 s.
- **Migrações:** `node scripts/db-migrate.mjs --server <servidor> --database <banco>` aplica os arquivos de `apps/api/db/migrations` em ordem, uma vez cada (tabela `schema_migration`). Com `--grant-name` e `--grant-client-id`, cria o usuário da identidade da API. Quem roda precisa ser administrador Entra do servidor e ter o IP liberado no firewall (regra temporária, removida depois).

## Como ligar no Azure (quando o app usar o login)

1. Configurações da Function App: `SQL_SERVER=sql-vacinaemdia-vedia6398.database.windows.net`, `SQL_DATABASE=sqldb-vacinaemdia` e `DEMO_SESSION_ENABLED=false`.
2. Publicar o app com as telas de login. A API e o app precisam subir juntos.

## Testes

| IDs | O que verifica |
|---|---|
| CT-DB-01 a 10 | Contrato dos repositórios, **na memória e no Azure SQL real**: ordem, atualização, Unicode, isolamento entre donos, cascata, consentimento, exclusão da conta, e-mail único, tokens de renovação |
| CT-SQL-01 a 14 | Leitura de colunas, erros de chave duplicada, SQL parametrizado e limitado ao dono, estado de dose desconhecido |

O contrato roda no Azure SQL só quando `SQL_TEST_SERVER` e `SQL_TEST_DATABASE` estão definidos e há `az login` (no CI roda só na memória). Em 07/10/2026 os 20 testes (10 por implementação) passaram contra o banco real. Também foi feito um teste de ponta a ponta no banco real: cadastro, login, senha errada, renovação e reuso, consentimento, membro (34 doses geradas), acesso de outro dono (404) e exclusão da conta.

## Riscos e pendências

- Os limites de uso (login, cadastro, assistente) ainda são em memória por instância; com uma instância é suficiente (ADR-010). Com mais de uma, passam para o banco.
- A rotina de atraso continua "preguiçosa" (na leitura); a rotina agendada entra com os lembretes (SCRUM-19).
- Dependência nova: `mssql` 12.7.4 (e `tedious` 20.3.3). O `npm audit` aponta 3 achados **moderados** na cadeia `sprintf-js` (negação de serviço por precisão de formato), sem correção que não seja um salto de versão maior; o CI só falha em nível alto na API.
