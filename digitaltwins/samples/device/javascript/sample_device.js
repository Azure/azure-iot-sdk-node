// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const DeviceClient = require('azure-iot-device').Client;
const Mqtt = require('azure-iot-device-mqtt').Mqtt;

const EnvironmentalSensor = require('./environmentalinterface').EnvironmentalSensor;
const DeviceInformation = require('./deviceInformation').DeviceInformation;

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

const environmentalSensor = new EnvironmentalSensor('environmentalSensor', propertyUpdateHandler, commandHandler);
const deviceInformation = new DeviceInformation('deviceInformation');

const deviceClient = DeviceClient.fromConnectionString(process.env.DEVICE_CONNECTION_STRING, Mqtt);

const capabilityModel = 'urn:azureiot:samplemodel:1';

async function main() {
  const digitalTwinClient = new DigitalTwinClient(capabilityModel, deviceClient);
  digitalTwinClient.addInterfaceInstance(environmentalSensor);
  digitalTwinClient.addInterfaceInstance(deviceInformation);
  await digitalTwinClient.register();

  // report all of the device information.
  await deviceInformation.manufacturer.report('Contoso Device Corporation');
  await deviceInformation.model.report('Contoso 4762B-turbo');
  await deviceInformation.swVersion.report('3.1');
  await deviceInformation.osName.report('ContosoOS');
  await deviceInformation.processorArchitecture.report('4762');
  await deviceInformation.processorManufacturer.report('Contoso Foundries');
  await deviceInformation.totalStorage.report('64000');
  await deviceInformation.totalMemory.report('640');
  console.log('Done sending device Information');

  // send telemetry
  await environmentalSensor.temp.send(65.5);
  await environmentalSensor.humid.send(12.2);
  console.log('Done sending telemetry.');

  // report a property
  await environmentalSensor.state.report('online');
  console.log('reported state property as online');
};

main();
