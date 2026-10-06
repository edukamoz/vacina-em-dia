@description('Região dos recursos.')
param location string

@description('Nome da conta de armazenamento (3 a 24 letras minúsculas e números).')
param storageName string

@description('Contêineres de pacote de implantação das Function Apps (plano Flex Consumption).')
param deploymentContainers array

@description('Etiquetas aplicadas aos recursos.')
param tags object

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource containers 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = [
  for name in deploymentContainers: {
    parent: blobService
    name: name
    properties: { publicAccess: 'None' }
  }
]

@description('Nome da conta de armazenamento.')
output name string = storage.name

@description('Endpoint de blobs.')
output blobEndpoint string = storage.properties.primaryEndpoints.blob
