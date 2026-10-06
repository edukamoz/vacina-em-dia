@description('Região do Static Web Apps (o plano gratuito não existe no Brazil South).')
param location string

@description('Nome do site.')
param siteName string

@description('Etiquetas aplicadas aos recursos.')
param tags object

resource site 'Microsoft.Web/staticSites@2023-12-01' = {
  name: siteName
  location: location
  tags: tags
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {}
}

@description('Endereço público do site.')
output hostName string = site.properties.defaultHostname
