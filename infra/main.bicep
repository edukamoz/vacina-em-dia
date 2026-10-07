// Infraestrutura do Vacina em Dia (CN2: infraestrutura como código).
// Reproduz o grupo de recursos `rg-vacinaemdia` em Brazil South com o menor custo possível.
// Uso: veja infra/README.md.
targetScope = 'resourceGroup'

@description('Região principal.')
param location string = resourceGroup().location

@description('Região do Static Web Apps (plano gratuito indisponível no Brazil South).')
param swaLocation string = 'centralus'

@description('Sufixo único dos nomes globais (minúsculas e números, até 12 caracteres).')
@maxLength(12)
param suffix string = 'vedia6398'

@description('E-mail do administrador Microsoft Entra do SQL.')
param sqlEntraAdminLogin string

@description('ID de objeto do administrador Microsoft Entra do SQL.')
param sqlEntraAdminObjectId string

@description('Origem permitida no CORS da API (endereço do app web).')
param webOrigin string = ''

@description('Concede à API o papel Key Vault Secrets User. Exige que quem implanta seja Owner ou User Access Administrator.')
param assignRoles bool = false

@description('Chave da Function de PLN. Vazia na primeira implantação; informe depois de publicar o PLN.')
@secure()
param nlpFunctionKey string = ''

var tags = {
  projeto: 'vacina-em-dia'
}
var storageName = 'st${suffix}'
var apiAppName = 'func-vacinaemdia-${suffix}'
var nlpAppName = 'func-nlp-vacinaemdia-${suffix}'
var speechName = 'spch-vacinaemdia-${suffix}'
var apiContainer = 'app-package-${apiAppName}'
var nlpContainer = 'app-package-${nlpAppName}'

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    location: location
    workspaceName: 'log-vacinaemdia'
    appInsightsName: 'appi-vacinaemdia'
    tags: tags
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    storageName: storageName
    deploymentContainers: [
      apiContainer
      nlpContainer
    ]
    tags: tags
  }
}

module speech 'modules/speech.bicep' = {
  name: 'speech'
  params: {
    location: location
    speechName: speechName
    tags: tags
  }
}

resource speechAccount 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: speechName
}

module keyVault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  dependsOn: [
    speech
  ]
  params: {
    location: location
    vaultName: 'kv-${suffix}'
    speechName: speechName
    nlpFunctionKey: nlpFunctionKey
    tags: tags
  }
}

module nlp 'modules/function-app.bicep' = {
  name: 'nlp-function'
  dependsOn: [
    storage
  ]
  params: {
    location: location
    functionAppName: nlpAppName
    planName: 'asp-nlp-vacinaemdia'
    runtimeName: 'python'
    runtimeVersion: '3.13'
    alwaysReadyHttp: 1 // a partida a frio (~50 s) estoura o tempo de espera da API
    httpPerInstanceConcurrency: 8
    storageName: storageName
    deploymentContainer: nlpContainer
    appInsightsConnectionString: monitoring.outputs.connectionString
    extraSettings: {
      PYTHON_THREADPOOL_THREAD_COUNT: '4'
      OMP_NUM_THREADS: '1'
      OPENBLAS_NUM_THREADS: '1'
      MKL_NUM_THREADS: '1'
    }
    tags: tags
  }
}

module api 'modules/function-app.bicep' = {
  name: 'api-function'
  dependsOn: [
    storage
  ]
  params: {
    location: location
    functionAppName: apiAppName
    planName: 'asp-api-vacinaemdia'
    runtimeName: 'node'
    runtimeVersion: '24'
    storageName: storageName
    deploymentContainer: apiContainer
    appInsightsConnectionString: monitoring.outputs.connectionString
    systemAssignedIdentity: true
    corsOrigins: empty(webOrigin) ? [] : [webOrigin]
    extraSettings: {
      DOCS_ENABLED: 'true'
      NLP_BASE_URL: 'https://${nlp.outputs.hostName}/api'
      NLP_FUNCTION_KEY: nlpFunctionKey
      SPEECH_ENDPOINT: speech.outputs.endpoint
      SPEECH_KEY: speechAccount.listKeys().key1
    }
    tags: tags
  }
}

module sql 'modules/sql.bicep' = {
  name: 'sql'
  params: {
    location: location
    serverName: 'sql-vacinaemdia-${suffix}'
    databaseName: 'sqldb-vacinaemdia'
    entraAdminLogin: sqlEntraAdminLogin
    entraAdminObjectId: sqlEntraAdminObjectId
    tags: tags
  }
}

module web 'modules/static-web-app.bicep' = {
  name: 'web'
  params: {
    location: swaLocation
    siteName: 'swa-vacinaemdia'
    tags: tags
  }
}

resource vaultRef 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: 'kv-${suffix}'
}

// Key Vault Secrets User
resource apiReadsSecrets 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (assignRoles) {
  scope: vaultRef
  name: guid(vaultRef.id, apiAppName, '4633458b-17de-408a-b874-0445c86b69e6')
  dependsOn: [
    keyVault
  ]
  properties: {
    principalId: api.outputs.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
  }
}

output apiHost string = api.outputs.hostName
output nlpHost string = nlp.outputs.hostName
output webHost string = web.outputs.hostName
output keyVaultUri string = keyVault.outputs.uri
