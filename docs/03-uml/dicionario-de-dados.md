# Dicionário de dados do Azure SQL

Item do Jira: SCRUM-31. Atende à seção 5.2 do modelo de Documentação Técnica (descrição das tabelas e atributos). O diagrama está em `der.md`.

Tipos em T-SQL (Azure SQL). Colunas **obrigatórias** são `NOT NULL`; as demais aceitam `NULL`. `PK` é chave primária, `FK` chave estrangeira e `UK` restrição única. Todos os instantes (`DATETIME2`) são gravados em UTC; os campos `DATE` são datas civis do calendário brasileiro.

## `app_user`: usuário da conta

Uma linha por pessoa que criou conta. Guarda **somente** o identificador opaco do Entra External ID.

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | não | PK | Identificador interno do usuário. |
| `external_id` | `UNIQUEIDENTIFIER` | não | UK | Identificador do usuário no Entra (claim `oid`). Nome e e-mail ficam no Entra. |
| `created_at` | `DATETIME2(0)` | não | padrão: agora (UTC) | Quando a conta foi criada no sistema. |

## `consent`: aceite do termo de consentimento

Histórico de aceites. A API consulta se existe aceite da **versão vigente** do termo.

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | não | PK | Identificador do aceite. |
| `user_id` | `UNIQUEIDENTIFIER` | não | FK → `app_user.id` (cascata) | Quem aceitou. |
| `term_version` | `VARCHAR(20)` | não | UK com `user_id` | Versão do termo aceito (por exemplo, `1.0`). |
| `accepted_at` | `DATETIME2(0)` | não | | Momento do aceite. |

## `member`: membro da família

Pessoa cujo calendário vacinal é acompanhado (o próprio usuário, filhos, idosos etc.).

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | não | PK | Identificador do membro. |
| `user_id` | `UNIQUEIDENTIFIER` | não | FK → `app_user.id` (cascata) | Usuário dono do cadastro; base da verificação de propriedade. |
| `display_name` | `NVARCHAR(80)` | não | | Nome ou apelido (minimização de dados). |
| `birth_date` | `DATE` | não | | Data de nascimento, usada para a faixa etária. |
| `relationship` | `VARCHAR(20)` | sim | CHECK nos códigos conhecidos | Parentesco com o dono da conta (`SELF`, `MOTHER`, `FATHER`, `SON`, `DAUGHTER`, `GRANDMOTHER`, `GRANDFATHER`, `SISTER`, `BROTHER`, `SPOUSE`, `OTHER`); vazio se a pessoa preferiu não informar. Escolhido em lista no app. |
| `guardian_declared_at` | `DATETIME2(0)` | sim | | Quando o usuário declarou ser responsável por um membro menor de idade; vazio para adultos. |
| `created_at` | `DATETIME2(0)` | não | padrão: agora (UTC) | Criação do cadastro. |

## `special_group`: grupos específicos

Tabela de apoio com os grupos que alteram o calendário (por exemplo, gestante). Carregada por *seed*.

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `SMALLINT` | não | PK | Identificador do grupo. |
| `code` | `VARCHAR(30)` | não | UK | Código estável usado no código (por exemplo, `PREGNANT`). |
| `label` | `NVARCHAR(60)` | não | | Rótulo exibido na interface. |

## `member_special_group`: grupo específico de cada membro

Tabela associativa entre `member` e `special_group` (muitos para muitos).

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `member_id` | `UNIQUEIDENTIFIER` | não | PK, FK → `member.id` (cascata) | Membro. |
| `special_group_id` | `SMALLINT` | não | PK, FK → `special_group.id` | Grupo a que pertence. |

## `calendar_version`: versão do calendário vacinal

Cada versão registra a **fonte e a data** do calendário (exigência do RNF10).

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | não | PK | Identificador da versão. |
| `name` | `NVARCHAR(80)` | não | | Nome da versão (por exemplo, "Calendário de exemplo 0.1"). |
| `source` | `NVARCHAR(300)` | não | | Fonte oficial (título e endereço) ou "EXEMPLO FICTÍCIO". |
| `reference_date` | `DATE` | não | | Data de referência da fonte. |
| `is_fictitious` | `BIT` | não | padrão: 0 | Indica dados de exemplo, ainda não oficiais. A interface avisa quando for 1. |
| `is_active` | `BIT` | não | índice único filtrado | Versão em uso; no máximo uma por vez. |
| `created_at` | `DATETIME2(0)` | não | padrão: agora (UTC) | Quando a versão foi carregada. |

## `vaccine`: vacina

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | não | PK | Identificador da vacina. |
| `code` | `VARCHAR(40)` | não | UK | Código estável da vacina. |
| `name` | `NVARCHAR(120)` | não | | Nome exibido. |

## `dose_rule`: regra de dose do calendário

Define **quando** cada dose de cada vacina é indicada. Os limites de idade são em dias para permitir precisão (a interface os mostra em meses ou anos). Os valores vêm do calendário oficial ou, enquanto não houver, do conjunto fictício.

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | não | PK | Identificador da regra. |
| `calendar_version_id` | `UNIQUEIDENTIFIER` | não | FK → `calendar_version.id` | Versão do calendário a que a regra pertence. |
| `vaccine_id` | `UNIQUEIDENTIFIER` | não | FK → `vaccine.id` | Vacina. |
| `special_group_id` | `SMALLINT` | sim | FK → `special_group.id` | Se preenchido, a regra só vale para membros desse grupo. |
| `dose_number` | `TINYINT` | não | UK com `calendar_version_id` e `vaccine_id` | Número da dose na série (1, 2, reforço...). |
| `label` | `NVARCHAR(60)` | não | | Rótulo exibido (por exemplo, "1ª dose"). |
| `min_age_days` | `INT` | não | | Idade mínima, em dias, para tomar a dose. |
| `recommended_age_days` | `INT` | não | | Idade recomendada, em dias; define a data prevista (`due_date`). |
| `max_age_days` | `INT` | sim | | Idade máxima, em dias, quando existir. |
| `min_interval_days` | `INT` | sim | | Intervalo mínimo desde a dose anterior da série, em dias, quando existir. |

## `dose`: dose de um membro

Estado atual da dose, segundo a máquina de estados (`estados-dose.md`).

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | não | PK | Identificador da dose. |
| `member_id` | `UNIQUEIDENTIFIER` | não | FK → `member.id` (cascata); UK com `dose_rule_id` | Membro. |
| `dose_rule_id` | `UNIQUEIDENTIFIER` | não | FK → `dose_rule.id` | Regra que originou a dose. |
| `status` | `VARCHAR(10)` | não | `CHECK`: `PENDING`, `SCHEDULED`, `OVERDUE`, `APPLIED`, `CANCELLED` | Estado atual. |
| `due_date` | `DATE` | não | | Data prevista, calculada a partir da data de nascimento e da regra. |
| `scheduled_date` | `DATE` | sim | obrigatória em `SCHEDULED` | Data agendada pelo usuário. |
| `applied_date` | `DATE` | sim | obrigatória em `APPLIED` | Data em que a dose foi aplicada. |
| `cancelled_at` | `DATETIME2(0)` | sim | obrigatória em `CANCELLED` | Momento do cancelamento. |
| `row_version` | `ROWVERSION` | não | | Controle de concorrência (atualização simultânea). |
| `created_at` | `DATETIME2(0)` | não | padrão: agora (UTC) | Criação da dose. |
| `updated_at` | `DATETIME2(0)` | não | | Última alteração. |

## `dose_event`: histórico de eventos da dose

Registro de auditoria **sem dados pessoais**: cada mudança de estado gera uma linha.

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `BIGINT` | não | PK, identidade | Sequência dos eventos. |
| `dose_id` | `UNIQUEIDENTIFIER` | não | FK → `dose.id` (cascata) | Dose afetada. |
| `from_status` | `VARCHAR(10)` | sim | | Estado anterior; vazio no evento de geração (T1). |
| `to_status` | `VARCHAR(10)` | não | | Estado novo. |
| `event_type` | `VARCHAR(20)` | não | `CHECK`: `GENERATE`, `SCHEDULE`, `UNSCHEDULE`, `RESCHEDULE`, `APPLY`, `MARK_OVERDUE`, `CANCEL` | O que aconteceu. |
| `source` | `VARCHAR(10)` | não | `CHECK`: `USER`, `SCHEDULER` | Quem causou: o usuário ou a rotina diária. |
| `occurred_at` | `DATETIME2(0)` | não | padrão: agora (UTC) | Quando ocorreu. |

## `reminder`: lembrete enviado

Evita avisar duas vezes a mesma dose, para o mesmo motivo, no mesmo dia.

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | não | PK | Identificador do lembrete. |
| `dose_id` | `UNIQUEIDENTIFIER` | não | FK → `dose.id` (cascata); UK com `kind` e `reference_date` | Dose lembrada. |
| `kind` | `VARCHAR(10)` | não | `CHECK`: `UPCOMING`, `OVERDUE` | Dose próxima ou atrasada. |
| `reference_date` | `DATE` | não | | Data de referência da rotina que enviou. |
| `sent_at` | `DATETIME2(0)` | não | | Momento do envio. |

## `push_device`: dispositivo para notificações

| Coluna | Tipo | Nulo | Restrições | Descrição |
|---|---|---|---|---|
| `id` | `UNIQUEIDENTIFIER` | não | PK | Identificador do registro. |
| `user_id` | `UNIQUEIDENTIFIER` | não | FK → `app_user.id` (cascata) | Dono do dispositivo. |
| `token` | `VARCHAR(255)` | não | UK | Token de notificação push do dispositivo; removido se o serviço o considerar inválido. |
| `platform` | `VARCHAR(10)` | não | `CHECK`: `ANDROID`, `IOS` | Plataforma (a web não recebe push). |
| `created_at` | `DATETIME2(0)` | não | padrão: agora (UTC) | Quando foi registrado. |

## Dados pessoais e sensíveis no modelo

| Tabela e coluna | Classificação (LGPD) | Tratamento |
|---|---|---|
| `member.display_name`, `member.birth_date` | Dado pessoal; combinado com a vacinação, **dado sensível de saúde** | Coleta mínima; acesso só do dono; nunca em log |
| `dose.*` e `dose_event.*` | **Dado sensível de saúde** | Acesso só do dono; exclusão em cascata com a conta |
| `push_device.token` | Identificador de dispositivo | Removido na exclusão da conta e quando inválido |
| `app_user.external_id`, `consent.*` | Identificador opaco; registro de consentimento | Exclusão em cascata |
| Demais tabelas (`calendar_version`, `vaccine`, `dose_rule`, `special_group`) | Sem dado pessoal | Dados do calendário |

## Pendências de modelagem

- Os valores de `dose_rule`, `vaccine` e `calendar_version` dependem do calendário oficial do PNI, que **o autor ainda precisa fornecer ou confirmar**; até lá, o *seed* é de exemplo e marcado como fictício.
- Os grupos específicos de `special_group` (além de gestante) dependem do mesmo calendário oficial.
- Tamanhos de texto (`VARCHAR`/`NVARCHAR`) são propostas iniciais; ajustar no script de criação (SCRUM-22).
