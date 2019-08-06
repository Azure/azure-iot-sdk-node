const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DeviceClient = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;
const ProvisioningTransport = require('azure-iot-provisioning-device-mqtt').Mqtt;
const SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;

const EnvironmentalSensor = require('./environmentalinterface').EnvironmentalSensor;

// Edit this to match your IoT Central solution
const capabilityModel = 'urn:{yourname}:sample_device:1';

const registrationId = process.env.AZURE_IOT_PROVISIONING_REGISTRATION_ID;
const idScope = process.env.AZURE_IOT_PROVISIONING_ID_SCOPE;
const symmetricKey = process.env.AZURE_IOT_PROVISIONING_KEY;
const provisioningEndpoint = process.env.AZURE_IOT_PROVISIONING_ENDPOINT;

async function main() {
  const provisioningClient = ProvisioningDeviceClient.create(
    provisioningEndpoint,
    idScope,
    new ProvisioningTransport(),
    new SymmetricKeySecurityClient(registrationId, symmetricKey)
  );

  // IoT Central requires a special payload to be sent when the device is provisioned
  provisioningClient.setProvisioningPayload({
    '__iot:interfaces': {
      CapabilityModelId: capabilityModel
    }
  });

  const registrationResult = await provisioningClient.register();
  const deviceConnectionString = `HostName=${registrationResult.assignedHub};DeviceId=${registrationResult.deviceId};SharedAccessKey=${symmetricKey}`;

  const propertyUpdateHandler = (interfaceInstance, propertyName, reportedValue, desiredValue, version) => {
    console.log('Received an update for ' + propertyName + ': ' + JSON.stringify(desiredValue));
    interfaceInstance[propertyName].report(desiredValue, {
      code: 200,
      description: 'helpful descriptive text',
      version: version
    })
      .then(() => console.log('updated the property'))
      .catch(() => console.log('failed to update the property'));
  };

  const commandHandler = (request, response) => {
    console.log('received command: ' + request.commandName + ' for interfaceInstance: ' + request.interfaceInstanceName);
    response.acknowledge(200, 'helpful response text')
      .then(() => console.log('acknowledgement succeeded.'))
      .catch(() => console.log('acknowledgement failed'));
  };

  const environmentalSensor = new EnvironmentalSensor('sensor', propertyUpdateHandler, commandHandler);
  const deviceClient = DeviceClient.fromConnectionString(deviceConnectionString, Mqtt);

  const digitalTwinClient = new DigitalTwinClient(capabilityModel, deviceClient);
  digitalTwinClient.addInterfaceInstance(environmentalSensor);

  await digitalTwinClient.register();

  // send telemetry
  setInterval(async () => {
    const temp = 65.5 + Math.ceil(Math.random() * 10);
    const humidity = 12.2 + Math.ceil(Math.random() * 10);
    await environmentalSensor.temp.send(temp);
    await environmentalSensor.humid.send(humidity);
    console.log('Done sending telemetry: temp: ' + temp + ' humidity ' + humidity);
  }, 3000);
};

main();
