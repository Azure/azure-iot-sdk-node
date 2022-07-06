targetScope = 'subscription'

@description('Signed in user alias')
param alias string

@description('Signed in user objectId')
param userObjectId string

@maxLength(46)
@description('Name of the resource group to create')
param rgName string

@secure()
@description('The value of the Hub and DPS root CA cert to store in the keyvault (base64 encoded)')
param rootCertValue string

@secure()
@description('The value of the Hub and DPS root CA cert private key to store in the keyvault (base64 encoded)')
param rootCertPrivateKey string

resource rg 'Microsoft.Resources/resourceGroups@2021-04-01' = {
  name: rgName
  location: deployment().location
  tags: {
    createdBy: alias
  }
}

var shortName = take(replace(replace(rgName,'_',''),'-',''),10)
var uniqueId = take(uniqueString(rg.id),8)

module storageAccount 'storage-account.bicep' = {
  scope: rg
  name: 'storageAccount'
  params: {
    storageAccountName: toLower('${shortName}${uniqueId}')
  }
}

module iotHub 'iot-hub.bicep' = {
  scope: rg
  name: 'iotHub'
  params: {
    name: 'hub-${shortName}-${uniqueId}'
    storageConnectionString: storageAccount.outputs.connectionString
  }
}

module dps 'dps.bicep' = {
  scope: rg
  name: 'dps'
  params: {
    name: 'dps-${shortName}-${uniqueId}'
    iotHubConnectionString: iotHub.outputs.connectionString
  }
}

var keyVaultSecrets = [
  {
    name: 'IOTHUB-CA-ROOT-CERT'
    value: rootCertValue
  }
  {
    name: 'IOTHUB-CA-ROOT-CERT-KEY'
    value: rootCertPrivateKey
  }
  {
    name: 'IOT-PROVISIONING-DEVICE-ENDPOINT'
    value: 'global.azure-devices-provisioning.net'
  }
  {
    name: 'IOTHUB-CONNECTION-STRING'
    value: iotHub.outputs.connectionString
  }
  {
    name: 'EVENTHUB-CONNECTION-STRING'
    value: iotHub.outputs.eventHubConnectionString
  }
  {
    name: 'STORAGE-CONNECTION-STRING'
    value: storageAccount.outputs.connectionString
  }
  {
    name: 'IOT-PROVISIONING-DEVICE-IDSCOPE'
    value: dps.outputs.idScope
  }
  {
    name: 'IOT-PROVISIONING-ROOT-CERT'
    value: rootCertValue
  }
  {
    name: 'IOT-PROVISIONING-ROOT-CERT-KEY'
    value: rootCertPrivateKey
  }
  {
    name: 'IOT-PROVISIONING-SERVICE-CONNECTION-STRING'
    value: dps.outputs.connectionString
  }
  {
    name: 'DPS-CONN-STRING-INVALID-CERT' // Fake credential
    value: 'HostName=invalidcertdps1.westus.cloudapp.azure.com;SharedAccessKeyName=provisioningserviceowner;SharedAccessKey=lGO7OlXNhXlFyYV1rh9F/lUCQC1Owuh5f/1P0I1AFSY='
  }
  {
    name: 'DPS-GLOBAL-DEVICE-ENDPOINT-INVALID-CERT'
    value: 'invalidcertgde1.westus.cloudapp.azure.com'
  }
  {
    name: 'IOTHUB-CONN-STRING-INVALID-CERT' // Fake credential
    value: 'HostName=invalidcertiothub1.westus.cloudapp.azure.com;SharedAccessKeyName=iothubowner;SharedAccessKey=Fk1H0asPeeAwlRkUMTybJasksTYTd13cgI7SsteB05U='
  }
  {
    name: 'IOTHUB-DEVICE-CONN-STRING-INVALID-CERT' // Fake credential
    value: 'HostName=invalidcertiothub1.westus.cloudapp.azure.com;DeviceId=DoNotDelete1;SharedAccessKey=zWmeTGWmjcgDG1dpuSCVjc5ZY4TqVnKso5+g1wt/K3E='
  }
]

module keyVault 'key-vault.bicep' = {
  scope: rg
  name: 'keyVault'
  params: {
    keyVaultName: 'kv-${shortName}-${uniqueId}'
    keyVaultSecrets: keyVaultSecrets
    userObjectId: userObjectId
  }
}

output iotHubName string = iotHub.outputs.name
output dpsName string = dps.outputs.name
output keyVaultName string = keyVault.outputs.name

output iotProvisioningDeviceIdScope string = dps.outputs.idScope
output iotProvisioningServiceConnectionString string = dps.outputs.connectionString
output iotHubConnectionString string = iotHub.outputs.connectionString
output eventHubConnectionString string = iotHub.outputs.eventHubConnectionString
output storageConnectionString string = storageAccount.outputs.connectionString
