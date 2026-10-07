# Infraestrutura como código (Bicep)

Descreve, em código, os recursos do Vacina em Dia na Azure (critério "Infraestrutura como código" da banca de CN2). Escopo: um grupo de recursos em Brazil South, com o menor custo possível.

## Estrutura

| Arquivo | Recursos |
|---|---|
| `main.bicep` | Orquestra os módulos, define nomes e parâmetros |
| `modules/monitoring.bicep` | Log Analytics (30 dias) e Application Insights |
| `modules/storage.bicep` | Conta de armazenamento (LRS, TLS 1.2, sem acesso público) e contêineres de implantação |
| `modules/speech.bicep` | Azure AI Speech, camada gratuita F0 |
| `modules/keyvault.bicep` | Key Vault (RBAC) e segredos `speech-key` e `nlp-function-key` |
| `modules/function-app.bicep` | Plano Flex Consumption (FC1) e Function App (usado para a API em Node 24 e para o PLN em Python 3.13) |
| `modules/sql.bicep` | Servidor (só Entra) e banco Azure SQL na oferta gratuita (pausa ao esgotar a franquia) e regra de firewall para serviços do Azure |
| `modules/static-web-app.bicep` | Static Web Apps, plano Free (Central US) |

## Como validar (sem criar nada)

```bash
az bicep build --file infra/main.bicep --stdout > /dev/null
az deployment group validate -g <grupo> -f infra/main.bicep -p sqlEntraAdminLogin=<e-mail> sqlEntraAdminObjectId=<id-de-objeto> webOrigin=<https://endereco-do-site>
az deployment group what-if  -g <grupo> -f infra/main.bicep -p sqlEntraAdminLogin=<e-mail> sqlEntraAdminObjectId=<id-de-objeto> webOrigin=<https://endereco-do-site>
```

O CI executa o `az bicep build` a cada push.

## Como implantar em um grupo novo

```bash
az group create -n <grupo> -l brazilsouth --tags projeto=vacina-em-dia
az deployment group create -g <grupo> -f infra/main.bicep -p suffix=<sufixo-unico> sqlEntraAdminLogin=<e-mail> sqlEntraAdminObjectId=<id-de-objeto>
```

O SQL usa só autenticação Microsoft Entra, então **não há senha** de banco no código. O ID de objeto sai de `az ad signed-in-user show --query id -o tsv`. A chave da Function de PLN só existe depois da primeira publicação do PLN: rode de novo passando `nlpFunctionKey=<chave>`.

## Avisos importantes

- **Não implante este template no grupo `rg-vacinaemdia` atual.** Os recursos de lá foram criados pela linha de comando; os planos têm nomes gerados (`ASP-rgvacinaemdia-...`) e o template usa `asp-api-vacinaemdia` e `asp-nlp-vacinaemdia`, então criaria planos novos. O `what-if` mostra isso. Use-o para reproduzir o ambiente em um grupo novo ou para recriar tudo.
- **Limites da oferta gratuita:** uma assinatura só pode ter um Azure SQL gratuito e um Speech F0 por região; em um grupo de teste na mesma assinatura, a implantação deles falha.
- **Diferença deliberada:** o PLN ativo na nuvem está com `httpsOnly: false`; o template usa `true` (a ser corrigido no ambiente real).
- **Papéis (RBAC):** a atribuição "Key Vault Secrets User" para a API só é criada com `assignRoles=true`, e exige que quem implanta seja Owner (a conta de implantação do CI tem só Contributor). Os segredos já são gravados no cofre pelo plano de gerenciamento do ARM.
- **Banco:** só o servidor e o banco; as tabelas entram com a persistência (SCRUM-15/18).
- **Login, e-mail e banco na API:** `authTokenSecret`, `brevoApiKey` (segredos), `emailSenderAddress`, `webBaseUrl` e `useSqlInApi` (liga o Azure SQL e desliga a sessão de demonstração). Passe os segredos por parâmetro seguro; as migrações do banco rodam à parte (`scripts/db-migrate.mjs`).
- Chaves nas configurações da aplicação (`SPEECH_KEY`, `NLP_FUNCTION_KEY`) são lidas na implantação e ficam só no Azure; nada vai ao Git.
