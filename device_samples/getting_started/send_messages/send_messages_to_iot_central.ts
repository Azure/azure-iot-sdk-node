// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

// To see the dtdl of for this https://github.com/Azure/opendigitaltwins-dtdl

import { Mqtt as Protocol } from 'azure-iot-device-mqtt';
import { Mqtt as ProvProtocol } from 'azure-iot-provisioning-device-mqtt';
import { Client, Message, Twin } from 'azure-iot-device';
import { SymmetricKeySecurityClient } from 'azure-iot-security-symmetric-key';
import { ProvisioningDeviceClient, RegistrationResult } from 'azure-iot-provisioning-device';
import { ProvisioningPayload } from 'azure-iot-provisioning-device/dist/interfaces';

// DPS connection information
const provisioningHost: string = process.env.IOTHUB_DEVICE_DPS_ENDPOINT || 'global.azure-devices-provisioning.net';
const idScope: string = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE || '';
const deviceId: string = process.env.IOTHUB_DEVICE_DPS_DEVICE_ID || '';
const deviceKey: string = process.env.IOTHUB_DEVICE_DPS_DEVICE_KEY || '';

const modelIdObject: { modelId: string } = { modelId: 'dtmi:com:example:Thermostat;1' };
const telemetrySendInterval: number = 10000;
const logRed: string = '\x1b[31m%s\x1b[0m';

let deviceConnectionString: string = '';

console.assert((provisioningHost === '' || provisioningHost === undefined), 'Missing Provisioning Host string');
console.assert((idScope === '' || idScope === undefined), 'Missing Id Scope string');
console.assert((deviceId === '' || deviceId === undefined), 'Missing Device Id string');
console.assert((deviceKey === '' || deviceKey === undefined), 'Missing Device Key string');

// check to make sure all env variables are set
if (provisioningHost === '' || provisioningHost === undefined) {
  console.error(logRed, 'Missing Provisioning Host string');
  process.exit(0);
}

if (idScope === '' || idScope === undefined) {
  console.error(logRed, 'Missing Id Scope string');
  process.exit(0);
}

if (deviceId === '' || deviceId === undefined) {
  console.error(logRed, 'Missing Device Id string');
  process.exit(0);
}

if (deviceKey === '' || deviceKey === undefined) {
  console.error(logRed, 'Missing Device Key string');
  process.exit(0);
}

class TemperatureSensor {
  maxTemp: number;
  currTemp: number;
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
}

let intervalToken;
const deviceTemperatureSensor = new TemperatureSensor();

async function sendTelemetry(deviceClient: Client, index: number) {
  console.log('Sending telemetry message %d...', index);
  const msg = new Message(
    JSON.stringify(deviceTemperatureSensor.updateSensor().getCurrentTemperatureObject())
  );
  msg.contentType = 'application/json';
  msg.contentEncoding = 'utf-8';
  await deviceClient.sendEvent(msg);
}

async function provisionDevice(payload: ProvisioningPayload) {
  const provSecurityClient = new SymmetricKeySecurityClient(deviceId, deviceKey);
  const provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvProtocol(), provSecurityClient);

  if (!!(payload)) {
    provisioningClient.setProvisioningPayload(payload);
  }

  try {
    const result: void | RegistrationResult = await provisioningClient.register();
    deviceConnectionString = result !== undefined ? 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + deviceKey : '';
    console.log('Registration succeeded');
  } catch (err: any) {
    console.error(logRed, 'Error registering device: ' + err.toString());
  }
}

async function main(): Promise<void> {
  // If the user include a provision host then use DPS
  await provisionDevice(modelIdObject);
  // fromConnectionString must specify a transport, coming from any transport package.
  const client: Client = Client.fromConnectionString(deviceConnectionString, Protocol);

  try {
    // Add the modelId here
    await client.setOptions(modelIdObject);
    await client.open();

    // Send Telemetry every 10 secs
    let index: number = 0;
    intervalToken = setInterval(() => {
      sendTelemetry(client, index).catch((err) => console.log(logRed, 'Error: ' + err.toString()));
      index += 1;
    }, telemetrySendInterval);
  } catch (err: any) {
    console.error(logRed, 'Could not connect Plug and Play client or could not attach interval function for telemetry\n' + err.toString());
  }
}

main().then(()=> console.log('Sending telemetry:')).catch((err) => console.log('Error', err));
