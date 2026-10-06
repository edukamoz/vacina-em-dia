@description('Região dos recursos.')
param location string

@description('Nome do espaço de trabalho do Log Analytics.')
param workspaceName string

@description('Nome do Application Insights.')
param appInsightsName string

@description('Etiquetas aplicadas aos recursos.')
param tags object

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: workspaceName
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    workspaceCapping: {
      dailyQuotaGb: json('0.1')
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
  }
}

@description('Cadeia de conexão do Application Insights.')
output connectionString string = appInsights.properties.ConnectionString
