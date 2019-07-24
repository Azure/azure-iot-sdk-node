const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DeviceClient = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;

const EnvironmentalSensor = require('./environmentalinterface').EnvironmentalSensor;

const propertyUpdateHandler = (component, propertyName, reportedValue, desiredValue, version) => {
  console.log('Received an update for ' + propertyName + ': ' + JSON.stringify(desiredValue));
  component[propertyName].report(desiredValue, {
    code: 200,
    description: 'helpful descriptive text',
    version: version
  })
    .then(() => console.log('updated the property'))
    .catch(() => console.log('failed to update the property'));
};

const commandHandler = (request, response) => {
  console.log('received command: ' + request.commandName + ' for component: ' + request.componentName);
  response.acknowledge(200, 'helpful response text')
    .then(() => console.log('acknowledgement succeeded.'))
    .catch(() => console.log('acknowledgement failed'));
};

const environmentalSensor = new EnvironmentalSensor('environmentalSensor', propertyUpdateHandler, commandHandler);

const deviceClient = DeviceClient.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Mqtt);

const capabilityModel = 'urn:azureiot:samplemodel:1';

async function main() {
  const digitalTwinClient = new DigitalTwinClient(capabilityModel, deviceClient);
  digitalTwinClient.addComponent(environmentalSensor);
  await digitalTwinClient.register();

  // send telemetry
  await environmentalSensor.temp.send(65.5);
  await environmentalSensor.humid.send(12.2);
  console.log('Done sending telemetry.');

  // report a property
  await environmentalSensor.state.report('online');
  console.log('reported state property as online');
};

main();
