@minLength(3)
@maxLength(24)
@description('The name of the storage account to be created')
param storageAccountName string

resource storageAccount 'Microsoft.Storage/storageAccounts@2021-04-01' = {
  name: storageAccountName
  location: resourceGroup().location
  sku: {
    name: 'Standard_GRS'
  }
  kind: 'Storage'
  resource blobService 'blobServices' = {
    name: 'default'
    resource container 'containers' = {
      name: 'aziotbld'
    }
  }
}

output connectionString string = 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
