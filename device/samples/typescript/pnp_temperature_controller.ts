// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { Mqtt as ProvProtocol } from 'azure-iot-provisioning-device-mqtt';
import { Client, Message, Twin } from 'azure-iot-device';
import { ConnectionString } from 'azure-iot-common';
import { SymmetricKeySecurityClient } from 'azure-iot-security-symmetric-key';
import { ProvisioningDeviceClient, RegistrationResult } from 'azure-iot-provisioning-device';
import { ProvisioningPayload, RegistrationClient } from 'azure-iot-provisioning-device/dist/interfaces';

let deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING || '';

// DPS connection information
const provisioningHost = process.env.IOTHUB_DEVICE_DPS_ENDPOINT || 'global.azure-devices-provisioning.net';
const idScope = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE || '';
const registrationId = process.env.IOTHUB_DEVICE_DPS_DEVICE_ID || '';
const symmetricKey = process.env.IOTHUB_DEVICE_DPS_DEVICE_KEY || '';
const useDps = process.env.IOTHUB_DEVICE_SECURITY_TYPE || 'connectionString';

const modelIdObject: { modelId: string } = { modelId: 'dtmi:com:example:TemperatureController;2', };
const messageSubjectProperty = '$.sub';
const thermostat1ComponentName = 'thermostat1';
const thermostat2ComponentName = 'thermostat2';
const deviceInfoComponentName = 'deviceInformation';
const commandComponentCommandNameSeparator = '*';
let intervalToken1: NodeJS.Timer;
let intervalToken2: NodeJS.Timer;
let intervalToken3: NodeJS.Timer;

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

  getCurrentTemperatureObject(): { temperature: number } {
    return { temperature: this.currTemp };
  }

  updateSensor(): this {
    this.currTemp = 1 + Math.random() * 90;
    this.cumulativeTemperature += this.currTemp;
    this.numberOfTemperatureReadings++;
    if (this.currTemp > this.maxTemp) this.maxTemp = this.currTemp;
    if (this.currTemp < this.minTemp) this.minTemp = this.currTemp;
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

const thermostat1: TemperatureSensor = new TemperatureSensor();
const thermostat2: TemperatureSensor = new TemperatureSensor();

const commandNameGetMaxMinReport1 = thermostat1ComponentName + commandComponentCommandNameSeparator + 'getMaxMinReport';
const commandNameGetMaxMinReport2 = thermostat2ComponentName + commandComponentCommandNameSeparator + 'getMaxMinReport';
const commandNameReboot = 'reboot';
const serialNumber = 'alwinexlepaho8329';

const commandHandler = async (request: { methodName: any }, response: any) => {
  helperLogCommandRequest(request);
  switch (request.methodName) {
    case commandNameGetMaxMinReport1: {
      await sendCommandResponse(
        request,
        response,
        200,
        thermostat1.getMaxMinReportObject()
      );
      break;
    }
    case commandNameGetMaxMinReport2: {
      await sendCommandResponse(
        request,
        response,
        200,
        thermostat2.getMaxMinReportObject()
      );
      break;
    }
    case commandNameReboot: {
      await sendCommandResponse(request, response, 200, 'reboot response');
      break;
    }
    default:
      await sendCommandResponse(request, response, 404, 'unknown method');
      break;
  }
};

const sendCommandResponse: ( request: { methodName: any }, response: any, status: number, payload: any ) => Promise<void> = async (
  request: { methodName: any },
  response: any,
  status: number,
  payload: any
) => {
  try {
    await response.send(status, payload);
    console.log(
      'Response to method: ' + request.methodName + ' sent successfully.'
    );
  } catch (err) {
    console.error(
      'An error ocurred when sending a method response:\n' + err.toString()
    );
  }
};

const helperLogCommandRequest: (request: { methodName: any; payload?: any }) => void = (request: { methodName: any; payload?: any }) => {
  console.log(
    'Received command request for command name: ' + request.methodName
  );

  if (request.payload) {
    console.log('The command request payload is:');
    console.log(request.payload);
  }
};

const helperCreateReportedPropertiesPatch: (propertiesToReport: any, componentName: any) => Record<string, unknown> = (
  propertiesToReport: any,
  componentName: any
) => {
  let patch;
  if (componentName) {
    patch = {};
    propertiesToReport.__t = 'c';
    patch[componentName] = propertiesToReport;
  } else {
    patch = {};
    patch = propertiesToReport;
  }
  if (componentName) {
    console.log(
      'The following properties will be updated for component: ' + componentName
    );
  } else {
    console.log('The following properties will be updated for root interface.');
  }
  console.log(patch);
  return patch;
};

const updateComponentReportedProperties: (deviceTwin: Twin, patch: any, componentName: string) => void = (
  deviceTwin: Twin,
  patch: any,
  componentName: string
) => {
  let logLine: string;
  if (componentName) {
    logLine = 'Properties have been reported for component: ' + componentName;
  } else {
    logLine = 'Properties have been reported for root interface.';
  }
  deviceTwin.properties.reported.update(patch, function (err: Error): any {
    if (err) throw err;
    console.log(logLine);
  });
};

const desiredPropertyPatchListener = (deviceTwin: Twin, componentNames: any) => {
  deviceTwin.on('properties.desired', (delta) => {
    console.log(
      'Received an update for device with value: ' + JSON.stringify(delta)
    );
    Object.entries(delta).forEach(([key, values]) => {
      const version = delta.$version;
      if (!!componentNames && componentNames.includes(key)) {
        // then it is a component we are expecting
        const componentName = key;
        const patchForComponents = { [componentName]: {} };
        Object.entries(values).forEach(([propertyName, propertyValue]) => {
          if (propertyName !== '__t' && propertyName !== '$version') {
            console.log('Will update property: ' + propertyName + ' to value: ' + propertyValue + ' of component: ' + componentName);
            const propertyContent: any = { value: propertyValue };
            propertyContent.ac = 200;
            propertyContent.ad = 'Successfully executed patch';
            propertyContent.av = version;
            patchForComponents[componentName][propertyName] = propertyContent;
          }
        });
        updateComponentReportedProperties(
          deviceTwin,
          patchForComponents,
          componentName
        );
      } else if (key !== '$version') {
        // individual property for root
        const patchForRoot = {};
        console.log(
          'Will update property: ' + key + ' to value: ' + values + ' for root'
        );
        const propertyContent: any = { value: values };
        propertyContent.ac = 200;
        propertyContent.ad = 'Successfully executed patch';
        propertyContent.av = version;
        patchForRoot[key] = propertyContent;
        updateComponentReportedProperties(deviceTwin, patchForRoot, '');
      }
    });
  });
};

const exitListener: (deviceClient: Client) => Promise<void> = async (deviceClient: Client) => {
  const standardInput = process.stdin;
  standardInput.setEncoding('utf-8');
  console.log('Please enter q or Q to exit sample.');
  standardInput.on('data', (data: string) => {
    if (data === 'q\n' || data === 'Q\n') {
      console.log('Clearing intervals and exiting sample.');
      clearInterval(intervalToken1);
      clearInterval(intervalToken2);
      clearInterval(intervalToken3);
      deviceClient.close();
      process.exit();
    } else {
      console.log('User Input was: ' + data);
      console.log('Please only enter q or Q to exit sample.');
    }
  });
};

async function sendTelemetry(deviceClient: Client, data: string | Message.BufferConvertible, index: number, componentName: string): Promise<void> {
  if (componentName) {
    console.log(
      'Sending telemetry message %d from component: %s ',
      index,
      componentName
    );
  } else {
    console.log('Sending telemetry message %d from root interface', index);
  }
  const msg = new Message(data);
  if (componentName) {
    msg.properties.add(messageSubjectProperty, componentName);
  }
  msg.contentType = 'application/json';
  msg.contentEncoding = 'utf-8';
  await deviceClient.sendEvent(msg);
}

async function provisionDevice(payload: ProvisioningPayload): Promise<void> {
  const provSecurityClient: SymmetricKeySecurityClient = new SymmetricKeySecurityClient(
    registrationId,
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
    const result: RegistrationResult | any = await provisioningClient.register();
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
      if (
        !(
          deviceConnectionString &&
          ConnectionString.parse(deviceConnectionString, [
            'HostName',
            'DeviceId',
          ])
        )
      ) {
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
  console.log('Connecting using connection string: ' + deviceConnectionString);
  let resultTwin;

  try {
    // Add the modelId here
    await client.setOptions(modelIdObject);
    await client.open();
    console.log('Enabling the commands on the client');
    client.onDeviceMethod(commandNameGetMaxMinReport1, commandHandler);
    client.onDeviceMethod(commandNameGetMaxMinReport2, commandHandler);
    client.onDeviceMethod(commandNameReboot, commandHandler);

    // Send Telemetry after some interval
    let index1 = 0;
    let index2 = 0;
    let index3 = 0;
    intervalToken1 = setInterval(() => {
      const data = JSON.stringify(
        thermostat1.updateSensor().getCurrentTemperatureObject()
      );
      sendTelemetry(client, data, index1, thermostat1ComponentName).catch(
        (err) => console.log('error ', err.toString())
      );
      index1 += 1;
    }, 5000);

    intervalToken2 = setInterval(() => {
      const data = JSON.stringify(
        thermostat2.updateSensor().getCurrentTemperatureObject()
      );
      sendTelemetry(client, data, index2, thermostat2ComponentName).catch(
        (err) => console.log('error ', err.toString())
      );
      index2 += 1;
    }, 5500);

    intervalToken3 = setInterval(() => {
      const data = JSON.stringify({ workingSet: 1 + Math.random() * 90 });
      sendTelemetry(client, data, index3, '').catch((err) =>
        console.log('error ', err.toString())
      );
      index3 += 1;
    }, 6000);

    // attach a standard input exit listener
    exitListener(client);

    try {
      resultTwin = await client.getTwin();
      // Only report readable properties
      const patchRoot: Record<string, unknown> = helperCreateReportedPropertiesPatch({ serialNumber: serialNumber }, null);
      const patchThermostat1Info = helperCreateReportedPropertiesPatch({ maxTempSinceLastReboot: thermostat1.getMaxTemperatureValue(), }, thermostat1ComponentName);
      const patchThermostat2Info = helperCreateReportedPropertiesPatch({ maxTempSinceLastReboot: thermostat2.getMaxTemperatureValue(), }, thermostat2ComponentName);

      const patchDeviceInfo = helperCreateReportedPropertiesPatch(
        {
          manufacturer: 'Contoso Device Corporation',
          model: 'Contoso 47-turbo',
          swVersion: '10.89',
          osName: 'Contoso_OS',
          processorArchitecture: 'Contoso_x86',
          processorManufacturer: 'Contoso Industries',
          totalStorage: 65000,
          totalMemory: 640,
        },
        deviceInfoComponentName
      );

      // the below things can only happen once the twin is there
      updateComponentReportedProperties(resultTwin, patchRoot, '');
      updateComponentReportedProperties(resultTwin, patchThermostat1Info, thermostat1ComponentName);
      updateComponentReportedProperties(resultTwin, patchThermostat2Info, thermostat2ComponentName);
      updateComponentReportedProperties(resultTwin, patchDeviceInfo, deviceInfoComponentName);
      desiredPropertyPatchListener(resultTwin, [thermostat1ComponentName, thermostat2ComponentName, deviceInfoComponentName,]);
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
