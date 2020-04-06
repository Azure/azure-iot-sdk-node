// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;

const EnvironmentalSensor = require('./environmentalinterface').EnvironmentalSensor;
const DeviceInformation = require('./deviceInformation').DeviceInformation;

const environmentalId = 'urn:contoso:com:EnvironmentalSensor:1';
let digitalTwinClient;


const propertyUpdateHandler = async (interfaceInstance, propertyName, reportedValue, desiredValue, version) => {
  console.log('Received an update for ' + propertyName + ': ' + JSON.stringify(desiredValue));
  try {
    await digitalTwinClient.report(interfaceInstance, propertyName, desiredValue, {
      code: 200,
      description: 'helpful descriptive text',
      version: version
    });
    console.log('updated the property');
  } catch (e) {
    console.log('failed to update the property');
  }
};

const commandHandler = (request, response) => {
  console.log('received command: ' + request.commandName + ' for interfaceInstance: ' + request.interfaceInstanceName);
  response.acknowledge(200, 'helpful response text')
    .then(() => console.log('acknowledgement succeeded.'))
    .catch(() => console.log('acknowledgement failed'));
};


const environmentalSensor = new EnvironmentalSensor('environmentalSensor', propertyUpdateHandler, commandHandler);
const deviceInformation = new DeviceInformation('deviceInformation');

const capabilityModel = 'urn:azureiot:samplemodel:1';

async function main() {
  // mqtt is implied in this static method
  digitalTwinClient = DigitalTwinClient.fromConnectionString(capabilityModel, process.env.DEVICE_CONNECTION_STRING);

  // Add the interface instances to the Digital Twin Client
  digitalTwinClient.addInterfaceInstances(
    environmentalSensor,
    deviceInformation,
  );

  // enableCommands will enable the AzureDigitalTwinCommand properties in your interfaces to receive PnP commands from the service, and respond via
  // the commandHandler you created for your interface.
  // For information on how to write a commandHandler (aka a callback for handling 'direct' methods):
  // https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-mqtt-support#respond-to-a-direct-method
  // Ex. for `blink` property in the EnvironmentalSensor, it will now be handled by the commandHandler method that you wrote.
  digitalTwinClient.enableCommands();

  // enablePropertyUpdates will use the device twin to listen for updates to the writable properties in the interface instances that have been set.
  // Ex. for `brightness` property, which is set as a writable property, updates will be handled by the propertyUpdateHandler you've written.
  await digitalTwinClient.enablePropertyUpdates();

  // report all of the device information.
  await digitalTwinClient.report(deviceInformation, {
    manufacturer: 'Contoso Device Corporation',
    model: 'Contoso 47-turbo',
    swVersion: '3.1',
    osName: 'ContosoOS',
    processorArchitecture: 'Cotosox86',
    processorManufacturer: 'Contoso Industries',
    totalStorage: 65000,
    totalMemory: 640,
  });

  await digitalTwinClient.report(environmentalSensor, { state: true });

  // send telemetry every 5 seconds
  setInterval( async () => {
    await digitalTwinClient.sendTelemetry(environmentalSensor, { temp: 1 + (Math.random() * 90), humid: 1 + (Math.random() * 99) });
  }, 5000);
};

main();
