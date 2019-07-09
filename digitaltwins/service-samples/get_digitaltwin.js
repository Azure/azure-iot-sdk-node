const IoTHubTokenCredentials = require('azure-iot-digitaltwin-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient  = require('azure-iot-digitaltwin-service').DigitalTwinServiceClient;
const RegistryManager = require('azure-iothub').Registry;

async function main() {
  const creds = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const registryClient = RegistryManager.fromConnectionString(process.env.IOTHUB_CONNECTION_STRING);
  const dtClient = new DigitalTwinServiceClient(creds);

  const deviceDescription = {
    deviceId: 'testDevice',
    status: 'enabled'
  };

  const createdDevice = await registryClient.create(deviceDescription);
  console.log('Created device: ' + deviceDescription.deviceId);
  console.log(JSON.stringify(createdDevice.responseBody, null, 2));

  const result = await dtClient.getDigitalTwin(deviceDescription.deviceId);
  console.log(JSON.stringify(result.interfaces, null, 2));

  await registryClient.delete(deviceDescription.deviceId);
  console.log(deviceDescription.deviceId + ' deleted.');
}

main();