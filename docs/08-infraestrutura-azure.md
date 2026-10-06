# Infraestrutura na Azure (SCRUM-22)

Criada em **06/10/2026** com o Azure CLI, na assinatura **Azure for Students**, região **Brazil South** (exceto o Static Web Apps, que não existe no Brasil e fica em **Central US**). Tudo no grupo de recursos `rg-vacinaemdia`, na camada gratuita ou de menor custo (ADR-004, ADR-005 e ADR-008).

| Recurso | Nome | Camada | Observação |
|---|---|---|---|
| Grupo de recursos | `rg-vacinaemdia` | n/a | Tag `projeto=vacina-em-dia` |
| Function App (API) | `func-vacinaemdia-vedia6398` | Flex Consumption (Linux, Node 24, 512 MB) | Identidade gerenciada ligada; HTTPS obrigatório, TLS 1.2, FTPS desligado; CORS só para o app web |
| Static Web Apps (app web) | `swa-vacinaemdia` | Free | `https://blue-rock-0d7abc710.4.azurestaticapps.net` |
| Azure SQL Server | `sql-vacinaemdia-vedia6398` | n/a | Autenticação **somente Microsoft Entra** (sem senha de SQL); TLS 1.2 |
| Banco de dados | `sqldb-vacinaemdia` | Serverless GP_S_Gen5, oferta gratuita | Ao esgotar a franquia gratuita: **pausa automática** (sem cobrança) |
| Key Vault | `kv-vedia6398` | Standard | Acesso por RBAC; a identidade da Function recebe "Key Vault Secrets User" |
| Application Insights | `appi-vacinaemdia` | Por uso | Ligado ao workspace `log-vacinaemdia` (retenção de 30 dias, teto diário de 0,1 GB) |
| Armazenamento | `stvedia6398` | Standard LRS | Exigido pelas Functions; acesso público a blobs desligado |

## Provedores registrados
`Microsoft.Sql`, `Microsoft.CognitiveServices` e `Microsoft.AzureActiveDirectory` (os demais já estavam registrados).

## Deploy
O fluxo `.github/workflows/deploy.yml` publica a API e o app web ao integrar na `main` (ou manualmente). Ele usa dois segredos do GitHub, que **nunca** entram no repositório:

- `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`: login federado (OIDC) de um registro de aplicativo com papel Contributor no grupo de recursos.
- `AZURE_STATIC_WEB_APPS_API_TOKEN`: token de deploy do Static Web Apps.

## Pendências
- Conceder à identidade da Function o papel "Key Vault Secrets User" (precisa do `az login` com escopo do Graph; o token anterior expirou).
- Criar o usuário do banco para a identidade da Function e as tabelas (SCRUM-13, 15, 18).
- Tenant do Entra External ID (SCRUM-13); Azure AI Speech (SCRUM-20).
- O plano Linux Consumo (Y1) foi descartado em 06/10/2026: o app ficou preso em erro 503, inclusive no Kudu. Trocado por Flex Consumption (sucessor recomendado pelo Azure). O Flex não aceita perfil de publicação, por isso o deploy usa OIDC.
- Custos: confirmar na calculadora oficial (SCRUM-26). Custo esperado hoje: zero ou perto disso.
- Recursos antigos do DelBicos (`rg-delbicos`) continuam intocados.
