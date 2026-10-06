@description('Região dos recursos.')
param location string

@description('Nome da Function App.')
param functionAppName string

@description('Nome do plano Flex Consumption.')
param planName string

@description('Linguagem: node ou python.')
@allowed(['node', 'python'])
param runtimeName string

@description('Versão da linguagem (Node 24; Python 3.13).')
param runtimeVersion string

@description('Memória por instância em MB (512, 2048 ou 4096).')
param instanceMemoryMB int = 512

@description('Máximo de instâncias. Os dados ainda são em memória, então a API usa 1.')
param maximumInstanceCount int = 1

@description('Instâncias sempre prontas para HTTP (0 = escala a zero, com partida a frio).')
param alwaysReadyHttp int = 0

@description('Requisições simultâneas por instância (0 = padrão da plataforma).')
param httpPerInstanceConcurrency int = 0

@description('Nome da conta de armazenamento do pacote de implantação.')
param storageName string

@description('Nome do contêiner de implantação (criado no módulo de armazenamento).')
param deploymentContainer string

@description('Cadeia de conexão do Application Insights.')
param appInsightsConnectionString string

@description('Configurações adicionais da aplicação (nome e valor).')
param extraSettings object = {}

@description('Origens permitidas no CORS (vazio = nenhuma).')
param corsOrigins array = []

@description('Cria identidade gerenciada (necessária para referências ao Key Vault).')
param systemAssignedIdentity bool = false

@description('Etiquetas aplicadas aos recursos.')
param tags object

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageName
}

var storageConnection = 'DefaultEndpointsProtocol=https;AccountName=${storage.name};AccountKey=${storage.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'

resource plan 'Microsoft.Web/serverfarms@2024-04-01' = {
  name: planName
  location: location
  tags: tags
  kind: 'functionapp'
  sku: {
    name: 'FC1'
    tier: 'FlexConsumption'
  }
  properties: {
    reserved: true
  }
}

var baseSettings = {
  AzureWebJobsStorage: storageConnection
  DEPLOYMENT_STORAGE_CONNECTION_STRING: storageConnection
  APPLICATIONINSIGHTS_CONNECTION_STRING: appInsightsConnectionString
}

resource app 'Microsoft.Web/sites@2024-04-01' = {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp,linux'
  identity: {
    type: systemAssignedIdentity ? 'SystemAssigned' : 'None'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      minTlsVersion: '1.2'
      ftpsState: 'FtpsOnly'
      cors: {
        allowedOrigins: corsOrigins
      }
    }
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storage.properties.primaryEndpoints.blob}${deploymentContainer}'
          authentication: {
            type: 'StorageAccountConnectionString'
            storageAccountConnectionStringName: 'DEPLOYMENT_STORAGE_CONNECTION_STRING'
          }
        }
      }
      runtime: {
        name: runtimeName
        version: runtimeVersion
      }
      scaleAndConcurrency: {
        instanceMemoryMB: instanceMemoryMB
        maximumInstanceCount: maximumInstanceCount
        alwaysReady: alwaysReadyHttp > 0 ? [
          {
            name: 'http'
            instanceCount: alwaysReadyHttp
          }
        ] : []
        triggers: httpPerInstanceConcurrency > 0 ? {
          http: {
            perInstanceConcurrency: httpPerInstanceConcurrency
          }
        } : null
      }
    }
  }
}

resource settings 'Microsoft.Web/sites/config@2024-04-01' = {
  parent: app
  name: 'appsettings'
  properties: union(baseSettings, extraSettings)
}

@description('Nome do host padrão (sem https).')
output hostName string = app.properties.defaultHostName

@description('Identidade gerenciada (vazio sem identidade).')
output principalId string = systemAssignedIdentity ? app.identity.principalId : ''

@description('Nome da Function App.')
output name string = app.name
