// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const ProvProtocol = require('azure-iot-provisioning-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const Message = require('azure-iot-device').Message;
const SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

// To see the dtdl of for this https://github.com/Azure/opendigitaltwins-dtdl

// DPS connection information
const provisioningHost = process.env.IOTHUB_DEVICE_DPS_ENDPOINT || 'global.azure-devices-provisioning.net';
const idScope = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE || '';
const deviceId = process.env.IOTHUB_DEVICE_DPS_DEVICE_ID || '';
const deviceKey = process.env.IOTHUB_DEVICE_DPS_DEVICE_KEY || '';

const modelIdObject = { modelId: 'dtmi:com:example:Thermostat;1' };
const telemetrySendInterval = 10000;
let deviceConnectionString = '';

// check to make sure all env variables are set
if (provisioningHost === '' || provisioningHost === undefined) {
  console.error('\x1b[31m%s\x1b[0m', 'Missing Provisioning Host string');
  process.exit(0);
}  

if (idScope === '' || idScope === undefined) {
  console.error('\x1b[31m%s\x1b[0m', 'Missing Id Scope string');
  process.exit(0);
}

if (deviceId === '' || deviceId === undefined) {
  console.error('\x1b[31m%s\x1b[0m', 'Missing Device Id string');
  process.exit(0);
}

if (deviceKey === '' || deviceKey === undefined) {
  console.error('\x1b[31m%s\x1b[0m', 'Missing Device Key string');
  process.exit(0);
}  

class TemperatureSensor {
  constructor() {
    this.currTemp = 1 + (Math.random() * 90);
    this.maxTemp = this.currTemp;
    this.minTemp = this.currTemp;
    this.cumulativeTemperature = this.currTemp;
    this.startTime = (new Date(Date.now())).toISOString();
    this.numberOfTemperatureReadings = 1;
  }

  getCurrentTemperatureObject() {
    return { temperature: this.currTemp };
  }

  updateSensor() {
    this.currTemp = 1 + (Math.random() * 90);
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

  getMaxMinReportObject() {
    return {
      maxTemp: this.maxTemp,
      minTemp: this.minTemp,
      avgTemp: this.cumulativeTemperature / this.numberOfTemperatureReadings,
      endTime: (new Date(Date.now())).toISOString(),
      startTime: this.startTime
    };
  }
   
  getMaxTemperatureValue() {
    return this.maxTemp;
  }
}

let intervalToken;
const deviceTemperatureSensor = new TemperatureSensor();

async function sendTelemetry(deviceClient, index) {
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

async function provisionDevice(payload) {
  const provSecurityClient = new SymmetricKeySecurityClient(deviceId, deviceKey);
  const provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new ProvProtocol(), provSecurityClient);

  if (!!(payload)) {
    provisioningClient.setProvisioningPayload(payload);
  }

  try {
    let result = await provisioningClient.register();
    deviceConnectionString = 'HostName=' + result.assignedHub + ';DeviceId=' + result.deviceId + ';SharedAccessKey=' + deviceKey;
    console.log('Registration succeeded');    
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Error registering device: ' + err.toString());
  }
}

async function main() {
   
  // If the user include a provision host then use DPS
  await provisionDevice(modelIdObject);
  
  // fromConnectionString must specify a transport, coming from any transport package.
  const client = Client.fromConnectionString(deviceConnectionString, Protocol);  
  
  try {
    // Add the modelId here
    await client.setOptions(modelIdObject);
    await client.open();

    // Send Telemetry every 10 secs
    let index = 0;
    intervalToken = setInterval(() => {
      sendTelemetry(client, index).catch((err) => console.log('\x1b[31m%s\x1b[0m', 'Error: ' + err.toString()));
      index += 1;
    }, telemetrySendInterval);    
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', 'Could not connect Plug and Play client or could not attach interval function for telemetry\n' + err.toString());
  }
}

main().then(()=> console.log('Sending telemetry:')).catch((err) => console.log('Error', err));
