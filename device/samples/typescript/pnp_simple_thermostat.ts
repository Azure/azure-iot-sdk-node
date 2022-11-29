// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { Mqtt as ProvProtocol } from 'azure-iot-provisioning-device-mqtt';

import { Client, Message, Twin } from 'azure-iot-device';
import { ConnectionString } from 'azure-iot-common';

import { SymmetricKeySecurityClient } from 'azure-iot-security-symmetric-key';
import { ProvisioningDeviceClient, RegistrationResult } from 'azure-iot-provisioning-device';
import { RegistrationClient } from 'azure-iot-provisioning-device/dist/interfaces';

// To see the dtdl of for this https://github.com/Azure/opendigitaltwins-dtdl

// String containing Hostname, Device Id & Device Key in the following formats:
//  'HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>'
let deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING || 'device connection string';

// DPS connection information
const provisioningHost = process.env.IOTHUB_DEVICE_DPS_ENDPOINT ||  'global.azure-devices-provisioning.net';
const idScope = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE || 'invalid scope';
const registrationId = process.env.IOTHUB_DEVICE_DPS_DEVICE_ID || 'invalid registration id';
const symmetricKey = process.env.IOTHUB_DEVICE_DPS_DEVICE_KEY || 'invalid key';
const useDps = process.env.IOTHUB_DEVICE_SECURITY_TYPE || 'connectionString';

const modelIdObject: { modelId: string } = { modelId: 'dtmi:com:example:Thermostat;1', };
const telemetrySendInterval = 10000;
const deviceSerialNum = '123abc';

class TemperatureSensor {
  currTemp: number;
  maxTemp: number;
  minTemp: number;
  cumulativeTemperature: number;
  startTime: string;
  numberOfTemperatureReadings: number;

  constructor() {
    this.currTemp = 1 + Math.random() * 90;
    this.maxTemp = this.currTemp;
    this.minTemp = this.currTemp;
    this.cumulativeTemperature = this.currTemp;
    this.startTime = new Date(Date.now()).toISOString();
    this.numberOfTemperatureReadings = 1;
  }

  getCurrentTemperatureObject(): { temperature: number }  {
    return { temperature: this.currTemp };
  }

  updateSensor(): this {
    this.currTemp = 1 + Math.random() * 90;
    this.cumulativeTemperature += this.currTemp;
    this.numberOfTemperatureReadings++;
    if (this.currTemp > this.maxTemp) {
      this.maxTemp = this.currTemp;
    }
    if (this.currTemp < this.minTemp) {
      this.minTemp = this.currTemp;
    }
    return this;
  }

  getMaxMinReportObject(): {
    maxTemp: number;
    minTemp: number;
    avgTemp: number;
    endTime: string;
    startTime: string;
} {
    return {
      maxTemp: this.maxTemp,
      minTemp: this.minTemp,
      avgTemp: this.cumulativeTemperature / this.numberOfTemperatureReadings,
      endTime: new Date(Date.now()).toISOString(),
      startTime: this.startTime,
    };
  }

  getMaxTemperatureValue(): number {
    return this.maxTemp;
  }
}

let intervalToken: NodeJS.Timeout;

const deviceTemperatureSensor = new TemperatureSensor();
const commandMaxMinReport = 'getMaxMinReport';

const propertyUpdateHandler = (
  deviceTwin: any,
  propertyName: string,
  desiredValue: unknown,
  version: any
) => {
  console.log(
    'Received an update for property: ' +
      propertyName +
      ' with value: ' +
      JSON.stringify(desiredValue)
  );
  const patch: any = createReportPropPatch({
    [propertyName]: {
      value: desiredValue,
      ac: 200,
      ad: 'Successfully executed patch for ' + propertyName,
      av: version,
    },
  });
  updateComponentReportedProperties(deviceTwin, patch);
  console.log('updated the property');
};

const commandHandler = async (
  request: { methodName: any; payload: string },
  response: any
) => {
  switch (request.methodName) {
    case commandMaxMinReport: {
      console.log('MaxMinReport ' + request.payload);
      await sendCommandResponse(
        request,
        response,
        200,
        deviceTemperatureSensor.getMaxMinReportObject()
      );
      break;
    }
    default:
      await sendCommandResponse(request, response, 404, 'unknown method');
      break;
  }
};

const sendCommandResponse = async (request: { methodName: any; payload?: string }, response: any, status: number, payload: any) => {
  try {
    await response.send(status, payload);
    console.log(
      'Response to method "' + request.methodName + '" sent successfully.'
    );
  } catch (err) {
    console.error(
      'An error ocurred when sending a method response:\n' + err.toString()
    );
  }
};

const createReportPropPatch: any = (propertiesToReport: any) => {
  let patch;
  patch = {};
  patch = propertiesToReport;
  console.log('The following properties will be updated for root interface:');
  console.log(patch);
  return patch;
};

const updateComponentReportedProperties: (deviceTwin: Twin, patch: any) => void = (deviceTwin: Twin, patch: any) => {
  deviceTwin.properties.reported.update(patch, function (err: Error): any {
    if (err) throw err;
    console.log('Properties have been reported for component');
  });
};

const desiredPropertyPatchHandler = (deviceTwin: Twin) => {
  deviceTwin.on('properties.desired', (delta: any) => {
    const versionProperty = delta.$version;

    Object.entries(delta).forEach(([propertyName, propertyValue]) => {
      if (propertyName !== '$version') {
        propertyUpdateHandler(
          deviceTwin,
          propertyName,
          propertyValue,
          versionProperty
        );
      }
    });
  });
};

const attachExitHandler = async (client: Client) => {
  const standardInput = process.stdin;
  standardInput.setEncoding('utf-8');
  console.log('Please enter q or Q to exit sample.');
  standardInput.on('data', (data: string) => {
    if (data === 'q\n' || data === 'Q\n') {
      console.log('Clearing intervals and exiting sample.');
      clearInterval(intervalToken);
      client.close();
      process.exit();
    } else {
      console.log('User Input was : ' + data);
      console.log('Please only enter q or Q to exit sample.');
    }
  });
};

async function sendTelemetry(deviceClient: Client, index: number): Promise<void> {
  console.log('Sending telemetry message %d...', index);
  const msg = new Message(
    JSON.stringify(
      deviceTemperatureSensor.updateSensor().getCurrentTemperatureObject()
    )
  );
  msg.contentType = 'application/json';
  msg.contentEncoding = 'utf-8';
  await deviceClient.sendEvent(msg);
}

async function provisionDevice(payload: any): Promise<void> {
  const provSecurityClient: SymmetricKeySecurityClient = new SymmetricKeySecurityClient(
    registrationId || '',
    symmetricKey
  );
  const provisioningClient: RegistrationClient = ProvisioningDeviceClient.create(
    provisioningHost,
    idScope,
    new ProvProtocol(),
    provSecurityClient
  );

  if (payload) {
    provisioningClient.setProvisioningPayload(payload);
  }

  try {
    const result: any | RegistrationResult = await provisioningClient.register();
    deviceConnectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + symmetricKey;
    console.log('registration succeeded');
    console.log('assigned hub=' + result.assignedHub);
    console.log('deviceId=' + result.deviceId);
    console.log('payload=' + JSON.stringify(result.payload));
  } catch (err) {
    console.error('error registering device: ' + err.toString());
  }
}

async function main(): Promise<void> {
  // If the user include a provision host then use DPS
  if (useDps === 'DPS') {
    await provisionDevice(modelIdObject);
  } else if (useDps === 'connectionString') {
    try {
      if (!( deviceConnectionString && ConnectionString.parse(deviceConnectionString, [ 'HostName', 'DeviceId', ]))) {
        console.error('Connection string was not specified.');
        process.exit(1);
      }
    } catch (err) {
      console.error('Invalid connection string specified.');
      process.exit(1);
    }
  } else {
    console.log('No proper SECURITY TYPE provided.');
    process.exit(1);
  }

  // fromConnectionString must specify a transport, coming from any transport package.
  const client: Client = Client.fromConnectionString(deviceConnectionString, Protocol);
  console.log('Connecting using connection string ' + deviceConnectionString);
  let resultTwin: Twin;

  try {
    // Add the modelId here
    await client.setOptions(modelIdObject);
    await client.open();
    console.log('Enabling the commands on the client');
    client.onDeviceMethod(commandMaxMinReport, commandHandler);

    // Send Telemetry every 10 secs
    let index: number = 0;
    intervalToken = setInterval(() => {
      sendTelemetry(client, index).catch((err) =>
        console.log('error', err.toString())
      );
      index += 1;
    }, telemetrySendInterval);

    // attach a standard input exit listener
    attachExitHandler(client);

    // Deal with twin
    try {
      resultTwin = await client.getTwin();
      const patchRoot = createReportPropPatch({
        serialNumber: deviceSerialNum,
      });
      const patchThermostat = createReportPropPatch({
        maxTempSinceLastReboot:
          deviceTemperatureSensor.getMaxTemperatureValue(),
      });

      // the below things can only happen once the twin is there
      updateComponentReportedProperties(resultTwin, patchRoot);
      updateComponentReportedProperties(resultTwin, patchThermostat);

      // Setup the handler for desired properties
      desiredPropertyPatchHandler(resultTwin);
    } catch (err) {
      console.error(
        'could not retrieve twin or report twin properties\n' + err.toString()
      );
    }
  } catch (err) {
    console.error(
      'could not connect Plug and Play client or could not attach interval function for telemetry\n' +
        err.toString()
    );
  }
}

main()
  .then(() => console.log('executed sample'))
  .catch((err) => console.log('error', err));
