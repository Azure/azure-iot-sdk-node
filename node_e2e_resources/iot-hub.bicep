@minLength(3)
@maxLength(50)
@description('The name of the IoT Hub to be created')
param name string

@secure()
@description('The connection string for the storage account')
param storageConnectionString string

resource iotHub 'Microsoft.Devices/IotHubs@2021-07-01' = {
  name: name
  location: resourceGroup().location
  sku: {
    name: 'S1'
    capacity: 2
  }
  properties: {
    enableFileUploadNotifications: true
    storageEndpoints: {
      '$default': {
        sasTtlAsIso8601: 'PT1H'
        connectionString: storageConnectionString
        containerName: 'aziotbld'
      }
    }
  }
}

var key = listKeys(resourceId('Microsoft.Devices/IotHubs/Iothubkeys', iotHub.name, 'iothubowner'), iotHub.apiVersion).primaryKey
output connectionString string = 'HostName=${iotHub.properties.hostName};SharedAccessKeyName=iothubowner;SharedAccessKey=${key}'
output name string = name
