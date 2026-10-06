@description('Região dos recursos.')
param location string

@description('Nome do cofre de segredos.')
param vaultName string

@description('Nome do recurso Azure AI Speech, cuja chave vira segredo do cofre.')
param speechName string

@description('Chave da Function de PLN (conhecida só depois da primeira publicação; vazia até lá).')
@secure()
param nlpFunctionKey string = ''

@description('Etiquetas aplicadas aos recursos.')
param tags object

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: vaultName
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: tenant().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
  }
}

resource speech 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: speechName
}

// Segredos criados pelo plano de gerenciamento (ARM): não exigem papel de dados no cofre.
resource speechKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'speech-key'
  properties: { value: speech.listKeys().key1 }
}

resource nlpKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (!empty(nlpFunctionKey)) {
  parent: vault
  name: 'nlp-function-key'
  properties: { value: nlpFunctionKey }
}

@description('Nome do cofre.')
output name string = vault.name

@description('Endereço do cofre.')
output uri string = vault.properties.vaultUri
