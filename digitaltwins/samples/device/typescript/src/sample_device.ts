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

import { DigitalTwinClient, CommandCallback, CommandRequest, CommandResponse, PropertyChangedCallback, BaseInterface } from 'azure-iot-digitaltwins-device';
import { EnvironmentalSensor } from './environmentalinterface';
import { DeviceInformation } from './deviceInformationInterface';
import { SDKInformation } from './sdkInformationInterface';

const environmentCommandCallback: CommandCallback = (request: CommandRequest, response: CommandResponse) => {
  console.log('Callback for command for environment interface');
  switch (request.commandName) {
    case 'blink': {
      console.log('Got the blink command.');
      response.acknowledge(200, 'blink response', (err?: Error) => {
        if (err) {
          console.log('responding to the blink command failed.');
        }
      });
      break;
    }
    case 'turnOn': {
      console.log('Got the turnOn command.');
      response.acknowledge(200, 'turn on response', (err?: Error) => {
        if (err) {
          console.log('responding to the turnOn command failed.');
        }
      });
      break;
    }
    case 'turnOff': {
      console.log('Got the turnOff command.');
      response.acknowledge(200, 'turn off response', (err?: Error) => {
        if (err) {
          console.log('responding to the blink command failed.');
        }
      });
      break;
    }
  }
};

const environmentReadWriteCallback: PropertyChangedCallback = (interfaceObject: BaseInterface, propertyName: string, reportedValue: any, desiredValue: any, version: number) => {
  dtClient.report(interfaceObject, { [propertyName]: desiredValue + ' the boss' }, {version: version, code: 200, description: 'a promotion'}, (err?: Error) => {
    if (err) {
      console.log('did not do the update');
    } else {
      console.log('The update worked!!!!');
    }
  });
};

const environmentalSensor = new EnvironmentalSensor('sensor', environmentReadWriteCallback, environmentCommandCallback );
const deviceInformation = new DeviceInformation('deviceInformation');
const sdkInformation = new SDKInformation('sdkInformation');

const modelId = 'dtmi:com:example:SampleDevice;1';
let dtClient = DigitalTwinClient.fromConnectionString(modelId, process.env.DEVICE_CONNECTION_STRING as string);

const main = async () => {
  await dtClient.report(environmentalSensor, {
    name: 'IoT Sample Device',
    state: true,
    brightness: '10'
  });
  await dtClient.report(deviceInformation, {
    manufacturer: 'Contoso Device Corporation',
    model: 'Contoso 4762B-turbo',
    swVersion: '3.1',
    osName: 'ContosoOS',
    processorArchitecture: '4762',
    processorManufacturer: 'Contoso Foundries',
    totalStorage: '64000',
    totalMemory: '640'
  });
  await dtClient.report(sdkInformation, {
    language: 'node.js',
    version: dtClient.getVersion(),
    vendor: 'Microsoft'
  });

  let index = 0;
  setInterval( async () => {
    console.log('Sending telemetry message %d...', index);
    await dtClient.sendTelemetry(environmentalSensor, { temp: 1 + (Math.random() * 90), humidity: 1 + (Math.random() * 99) });
    index += 1;
  }, 5000);
};

dtClient.addComponents(environmentalSensor, deviceInformation);

dtClient.enableCommands();

dtClient.enablePropertyUpdates()
  .then(() => {
    console.log('enabled the property updates.');
    main();
  });
