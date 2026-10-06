# ADR-008: Segredos no Azure Key Vault e monitoramento no Application Insights

- **Status:** Aceita
- **Data:** 2026-10-06
- **Decisor:** autor
- **Requisitos relacionados:** RNF01, RNF02, RNF03, RNF05

## Contexto

O sistema usa chaves e cadeias de conexão (Speech, banco, armazenamento) que nunca podem ir ao repositório nem ao app. Também é preciso medir desempenho (90% das respostas em menos de 3 s) e gerar alertas, sem registrar dados pessoais.

## Decisão

- **Segredos no Azure Key Vault**, acessados por **identidade gerenciada** das Functions; o código nunca vê credenciais em arquivo. Localmente, `.env` ignorado pelo Git e um `.env.example` sem valores reais.
- **Monitoramento com Application Insights** (baseado em workspace do Log Analytics), com logs, métricas, painel de desempenho e alertas básicos.
- **Logs sem dados pessoais**: sem nome, data de nascimento, e-mail, áudio, transcrição ou conteúdo de mensagem; apenas identificadores opacos.
- Para controlar o custo, **amostragem** da telemetria e um **teto diário** de ingestão no workspace.

## Alternativas consideradas

| Alternativa | Por que não |
|---|---|
| Variáveis de ambiente do Functions App | Mais simples, mas sem auditoria, rotação nem separação de acesso; menos adequado ao RNF02. |
| Segredos em arquivo ou no repositório | Proibido pelo `CLAUDE.md` §10. |
| Ferramenta de terceiros (Datadog, Sentry etc.) | Fora da exigência de usar a Azure por completo; custo. |

## Consequências

- Acesso aos segredos auditável e sem credencial no código.
- O Key Vault e o Application Insights têm custo por uso; a franquia gratuita de ingestão do Application Insights (5 GB por mês em consulta de 06/10/2026) deve ser reconfirmada na calculadora de preços (SCRUM-26), e um alerta de orçamento será configurado.
- Chamadas ao Key Vault na partida a frio podem somar latência; guardar os segredos em memória na inicialização.
- Sem dados pessoais nos logs é regra de código, revisada em todo PR.
- Os provedores `Microsoft.KeyVault`, `Microsoft.Insights` e `Microsoft.OperationalInsights` **já estão registrados** na assinatura (verificado em 06/10/2026).

## Verificações e fontes

- Registro dos provedores: `az provider show`, em 06/10/2026.
- Preço: [Azure Monitor: preços](https://azure.microsoft.com/pricing/details/monitor/), a confirmar no SCRUM-26.
