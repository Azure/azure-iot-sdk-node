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
    routing: {
      routes: [
        {
          name: 'twin-update-event'
          source: 'TwinChangeEvents'
          condition: 'true'
          endpointNames: [
            'events'
          ]
          isEnabled: true
        }
      ]
      fallbackRoute: {
        name: '$fallback'
        source: 'DeviceMessages'
        condition: 'true'
        endpointNames: [
          'events'
        ]
        isEnabled: true
      }
    }
  }
}

var sharedAccessKeyName = '${listKeys(iotHub.id, '2020-04-01').value[0].keyName}'
var sharedAccessKey = '${listKeys(iotHub.id, '2020-04-01').value[0].primaryKey}'

output connectionString string = 'HostName=${iotHub.name}.azure-devices.net;SharedAccessKeyName=${sharedAccessKeyName};SharedAccessKey=${sharedAccessKey}'
output eventHubConnectionString string = 'Endpoint=${iotHub.properties.eventHubEndpoints.events.endpoint};SharedAccessKeyName=${sharedAccessKeyName};SharedAccessKey=${sharedAccessKey};EntityPath=${iotHub.properties.eventHubEndpoints.events.path}'
output name string = name
