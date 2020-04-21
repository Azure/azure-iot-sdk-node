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

import { DigitalTwinClient } from 'azure-iot-digitaltwins-device';
import { EnvironmentalSensor } from './environmentalInterface';
import { DeviceInformation } from './deviceInformationInterface';

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
  await response.acknowledge(200, 'helpful response text');
  console.log('acknowledgement succeeded.');
};


const environmentalSensor = new EnvironmentalSensor('environmentalSensor', propertyUpdateHandler, commandHandler);
const deviceInformation = new DeviceInformation('deviceInformation');

const modelId = 'dtmi:contoso_device_corp:samplemodel;1';

async function main() {
  // mqtt is implied in this static method
  digitalTwinClient = DigitalTwinClient.fromConnectionString(modelId, process.env.DEVICE_CONNECTION_STRING);

  // Add the interface instances to the Digital Twin Client
  digitalTwinClient.addComponents(
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
    osName: 'Contoso_OS',
    processorArchitecture: 'Contoso_x86',
    processorManufacturer: 'Contoso Industries',
    totalStorage: 65000,
    totalMemory: 640,
  });

  await digitalTwinClient.report(environmentalSensor, { state: true });

  console.log('Sending telemtry every 5 seconds.  We won\'t print them out because it\'s tedious to watch.');
  setInterval( async () => {
    await digitalTwinClient.sendTelemetry(environmentalSensor, { temp: 1 + (Math.random() * 90), humid: 1 + (Math.random() * 99) });
  }, 5000);
};

main();
