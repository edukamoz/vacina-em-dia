@description('Região dos recursos.')
param location string

@description('Nome do recurso (também o subdomínio do endpoint).')
param speechName string

@description('Etiquetas aplicadas aos recursos.')
param tags object

// Camada gratuita F0 (limite mensal de horas de áudio).
resource speech 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: speechName
  location: location
  tags: tags
  kind: 'SpeechServices'
  sku: { name: 'F0' }
  properties: {
    customSubDomainName: speechName
    publicNetworkAccess: 'Enabled'
  }
}

@description('Endpoint do serviço de fala.')
output endpoint string = speech.properties.endpoint
