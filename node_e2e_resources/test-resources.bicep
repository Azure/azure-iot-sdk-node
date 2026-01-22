targetScope = 'subscription'

@description('Signed in user alias')
param alias string

@description('Signed in user objectId')
param userObjectId string

@maxLength(46)
@description('Name of the resource group to create')
param rgName string

@secure()
@description('The value of the Hub and DPS root CA cert (base64 encoded)')
param rootCertValue string

@secure()
@description('The value of the Hub and DPS root CA cert private key (base64 encoded)')
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

output iotHubName string = iotHub.outputs.name
output dpsName string = dps.outputs.name

output iotProvisioningDeviceIdScope string = dps.outputs.idScope
output iotProvisioningServiceConnectionString string = dps.outputs.connectionString
output iotHubConnectionString string = iotHub.outputs.connectionString
output eventHubConnectionString string = iotHub.outputs.eventHubConnectionString
output storageConnectionString string = storageAccount.outputs.connectionString
