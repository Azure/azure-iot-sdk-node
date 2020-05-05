// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
//
//  █████╗ ███████╗██╗   ██╗██████╗ ███████╗    ██╗ ██████╗ ████████╗    ██████╗ ███╗   ██╗██████╗
// ██╔══██╗╚══███╔╝██║   ██║██╔══██╗██╔════╝    ██║██╔═══██╗╚══██╔══╝    ██╔══██╗████╗  ██║██╔══██╗
// ███████║  ███╔╝ ██║   ██║██████╔╝█████╗      ██║██║   ██║   ██║       ██████╔╝██╔██╗ ██║██████╔╝
// ██╔══██║ ███╔╝  ██║   ██║██╔══██╗██╔══╝      ██║██║   ██║   ██║       ██╔═══╝ ██║╚██╗██║██╔═══╝
// ██║  ██║███████╗╚██████╔╝██║  ██║███████╗    ██║╚██████╔╝   ██║       ██║     ██║ ╚████║██║
// ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝    ╚═╝ ╚═════╝    ╚═╝       ╚═╝     ╚═╝  ╚═══╝╚═╝
//
// NOTE: In this sample (and this repository in general), the terms 'PnP' and 'Digital Twins' are used interchangeably.

'use strict';

const DigitalTwinClient = require('azure-iot-digitaltwins-device').DigitalTwinClient;
const EnvironmentalSensor = require('./environmentalInterface').EnvironmentalSensor;
const DeviceInformation = require('./deviceInformationInterface').DeviceInformation;
const SDKInformation = require('./sdkInformationInterface').SDKInformation;

let digitalTwinClient;


const propertyUpdateHandler = async (component, propertyName, reportedValue, desiredValue, version) => {
  console.log('Received an update for ' + propertyName + ': ' + JSON.stringify(desiredValue));
  await digitalTwinClient.report(component, { [propertyName]: desiredValue }, {
    code: 200,
    description: 'helpful descriptive text',
    version: version
  });
  console.log('updated the property');
};

const commandHandler = (request, response) => {
  console.log('received command: ' + request.commandName + ' for component: ' + request.componentName);
  switch (request.commandName) {
    case 'blink': {
      console.log('Got the blink command.');
      response.acknowledge(200, 'blink response');
      break;
    }
    case 'turnon': {
      console.log('Got the turnon command.');
      response.acknowledge(200, 'turn on response');
      break;
    }
    case 'turnoff': {
      console.log('Got the turnoff command.');
      response.acknowledge(200, 'turn off response');
      break;
    }
    case 'rundiagnostics': {
      console.log('Got the rundiagnostics command.');
      response.acknowledge(200, 'rundiagnostics response');
      break;
    }
  }
};

const environmentalSensor = new EnvironmentalSensor('sensor', propertyUpdateHandler, commandHandler);
const deviceInformation = new DeviceInformation('deviceInformation');
const sdkInformation = new SDKInformation('SDKInformation');

const modelId = 'dtmi:my_company:com:sample_device;1';

async function main() {
  // mqtt is implied in this static method
  console.log('Creating Digital Twin Client from provided device connection string.');
  digitalTwinClient = DigitalTwinClient.fromConnectionString(modelId, process.env.DEVICE_CONNECTION_STRING);

  // Add the interface instances to the Digital Twin Client
  console.log('Adding the components to the DTClient.');
  digitalTwinClient.addComponents(
    environmentalSensor,
    deviceInformation,
    sdkInformation
  );

  // enableCommands will enable the AzureDigitalTwinCommand properties in your interfaces to receive PnP commands from the service, and respond via
  // the commandHandler you created for your interface.
  console.log('Enabling the commands on the DTClient');
  digitalTwinClient.enableCommands();

  // enablePropertyUpdates will use the device twin to listen for updates to the writable properties in the interface instances that have been set.
  // Ex. for `brightness` property, which is set as a writable property, updates will be handled by the propertyUpdateHandler you've written.
  console.log('Enabling property updates on the DTClient');
  await digitalTwinClient.enablePropertyUpdates();

  // report all of the device information.
  console.log('Reporting deviceInformation properties...');
  await digitalTwinClient.report(deviceInformation, {
    manufacturer: 'Contoso Device Corporation',
    model: 'Contoso 47-turbo',
    swVersion: '3.1',
    osName: 'Contoso_OS',
    processorArchitecture: 'Contoso_x86',
    processorManufacturer: 'Contoso Industries',
    totalStorage: 65000,
    totalMemory: 640,
  });

  // report sdk information
  console.log('Reporting SDKInformation properties...');
  await digitalTwinClient.report(sdkInformation, {
    language: 'node.js',
    version: digitalTwinClient.getVersion(),
    vendor: 'Microsoft'
  });

  console.log('Reporting environmentalSensor properties...');
  await digitalTwinClient.report(environmentalSensor, {
    name: 'IoT Sample Device',
    state: true,
    brightness: '10'
  });

  let index = 0;
  setInterval( async () => {
    console.log('Sending telemetry message %d...', index);
    await digitalTwinClient.sendTelemetry(environmentalSensor, { temp: 1 + (Math.random() * 90), humid: 1 + (Math.random() * 99) });
    index += 1;
  }, 5000);
};

main();
