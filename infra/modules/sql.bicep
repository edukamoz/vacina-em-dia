@description('Região dos recursos.')
param location string

@description('Nome do servidor SQL.')
param serverName string

@description('Nome do banco de dados.')
param databaseName string

@description('Nome (e-mail) do administrador Microsoft Entra do servidor.')
param entraAdminLogin string

@description('ID de objeto do administrador Microsoft Entra.')
param entraAdminObjectId string

@description('Etiquetas aplicadas aos recursos.')
param tags object

resource server 'Microsoft.Sql/servers@2023-08-01-preview' = {
  name: serverName
  location: location
  tags: tags
  properties: {
    version: '12.0'
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    // Sem senha de SQL: só autenticação Microsoft Entra.
    administrators: {
      administratorType: 'ActiveDirectory'
      login: entraAdminLogin
      sid: entraAdminObjectId
      tenantId: tenant().tenantId
      azureADOnlyAuthentication: true
    }
  }
}

// Permite serviços do Azure (a API) a alcançar o servidor.
resource allowAzure 'Microsoft.Sql/servers/firewallRules@2023-08-01-preview' = {
  parent: server
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// Oferta gratuita do Azure SQL: ao esgotar a franquia, o banco pausa (sem cobrança).
resource database 'Microsoft.Sql/servers/databases@2023-08-01-preview' = {
  parent: server
  name: databaseName
  location: location
  tags: tags
  sku: { name: 'GP_S_Gen5', tier: 'GeneralPurpose', family: 'Gen5', capacity: 2 }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 34359738368
    autoPauseDelay: 60
    minCapacity: json('0.5')
    zoneRedundant: false
    useFreeLimit: true
    freeLimitExhaustionBehavior: 'AutoPause'
  }
}

@description('Nome do servidor.')
output serverName string = server.name
