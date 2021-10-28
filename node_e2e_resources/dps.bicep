@minLength(3)
@maxLength(64)
param name string

@secure()
@description('The connection string of the IoT Hub to link to this DPS instance')
param iotHubConnectionString string

resource dps 'Microsoft.Devices/provisioningServices@2020-03-01' = {
  name: name
  location: resourceGroup().location
  sku: {
    name: 'S1'
  }
  properties: {
    iotHubs: [
      {
        connectionString: iotHubConnectionString
        location: resourceGroup().location
      }
    ]
  }
}

output idScope string = dps.properties.idScope
var key = listKeys(resourceId('Microsoft.Devices/provisioningServices/keys', dps.name, 'provisioningserviceowner'), dps.apiVersion).primaryKey
output connectionString string = 'HostName=${dps.properties.serviceOperationsHostName};SharedAccessKeyName=provisioningserviceowner;SharedAccessKey=${key}'
output name string = name
