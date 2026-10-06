# ADR-004: Banco relacional Azure SQL Database (oferta gratuita)

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RF02, RF04, RF08, RF09, RNF01, RNF03

## Contexto

Os dados são relacionais (usuário, membro, vacina, dose, consentimento) e a Documentação Técnica exige DER claro. Dados de vacinação são sensíveis (LGPD). O orçamento é o crédito de estudante; a meta é custo zero.

## Decisão

- Usar **Azure SQL Database** no modelo **serverless, camada General Purpose**, com a **oferta gratuita** do Azure SQL.
- Região **Brazil South** (permitida pela política da assinatura e mais próxima dos usuários). Na oferta gratuita, a região escolhida vale para todos os bancos gratuitos da assinatura.
- Comportamento ao esgotar a franquia: **pausar automaticamente até o mês seguinte** (`AutoPause`), nunca "continuar cobrando".
- Acesso por **identidade gerenciada** e consultas **parametrizadas**; sem concatenar SQL (CLAUDE.md §10).
- Esquema versionado por migrações no repositório.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Cosmos DB (NoSQL) | O domínio é relacional; o DER e as integridades ficariam menos claros. |
| PostgreSQL ou MySQL flexível | Sem camada gratuita equivalente verificada; mais um ecossistema para estudar. |
| Azure Table Storage como banco principal | Sem relações nem consultas ricas; fica só para o contador de taxa (ADR-010). |

## Consequências

- Custo zero dentro da franquia: 100.000 vCore-segundos e 32 GB de dados por mês, por banco. A oferta permite até 10 bancos por assinatura (a ajuda da CLI ainda cita um por assinatura; um basta aqui).
- **Retomada após pausa** (serverless pausado) leva tempo e pode estourar os 3 s do RNF01 na primeira requisição depois de ociosidade. Mitigação: aceitar na demonstração, aquecer o banco antes da apresentação e medir no SCRUM-22.
- Limitações da oferta: retenção de restauração (PITR) de 7 dias, sem retenção de longo prazo e backup local redundante; sem pool elástico nem grupo de failover.
- Conexões abertas por ferramentas de consulta impedem a pausa e consomem a franquia.
- O provedor `Microsoft.Sql` **ainda não está registrado** na assinatura; o registro e a criação ficam no SCRUM-22.
- Criar o banco pela CLI usa as opções `--use-free-limit` e `--free-limit-exhaustion-behavior AutoPause`.

## Verificações e fontes

- **Compatibilidade com a assinatura (verificada em 06/10/2026):** a assinatura é `AzureForStudents_2018-01-01`, com limite de gastos ativado. A documentação diz que a oferta *Azure for Students Starter* é incompatível e que a *Azure for College Students* é compatível; a assinatura do autor é do segundo tipo.
- **Regiões:** o servidor SQL está disponível em Brazil South, Central US, Chile Central, South Africa North e North Central US (política "Allowed resource deployment regions").
- Fonte: [Experimente o Azure SQL Database gratuitamente](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer), consultada em 06/10/2026.
