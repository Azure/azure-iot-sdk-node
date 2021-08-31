// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const Mqtt = require('azure-iot-device-mqtt').Mqtt;
const ProvisioningMqtt = require('azure-iot-provisioning-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
const ClientPropertyCollection = require('azure-iot-device').ClientPropertyCollection;
const generateWritablePropertyResponse = require('azure-iot-device').generateWritablePropertyResponse;
const SymmetricKeySecurityClient = require('azure-iot-security-symmetric-key').SymmetricKeySecurityClient;
const ProvisioningDeviceClient = require('azure-iot-provisioning-device').ProvisioningDeviceClient;

// Must be "DPS" or "connectionString"
const deviceSecurityType = process.env.IOTHUB_DEVICE_SECURITY_TYPE;

// Must be set if IOTHUB_DEVICE_SECURITY_TYPE environment variable is "connectionString"
let deviceConnectionString = process.env.IOTHUB_DEVICE_CONNECTION_STRING;

// Must be set if IOTHUB_DEVICE_SECURITY_TYPE environment variable is "DPS"
const provisioningHost = process.env.IOTHUB_DEVICE_DPS_ENDPOINT || 'global.azure-devices-provisioning.net';
const idScope = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE;
const registrationId = process.env.IOTHUB_DEVICE_DPS_DEVICE_ID;
const symmetricKey = process.env.IOTHUB_DEVICE_DPS_DEVICE_KEY;

// Model definition: https://github.com/Azure/iot-plugandplay-models/blob/main/dtmi/com/example/thermostat-1.json
const modelId = 'dtmi:com:example:Thermostat;1';

const sendTelemetryIntervalTime = 10 * 1000; //10 seconds

async function provisionDevice(payload) {
  const provisioningClient = ProvisioningDeviceClient.create(
    provisioningHost,
    idScope,
    new ProvisioningMqtt(),
    new SymmetricKeySecurityClient(registrationId, symmetricKey)
  );

  if (payload) {
    provisioningClient.setProvisioningPayload(payload);
  }

  const result = await provisioningClient.register();
  console.log('registration succeeded');
  console.log('assigned hub=' + result.assignedHub);
  console.log('deviceId=' + result.deviceId);
  console.log('payload=' + JSON.stringify(result.payload));
  return `HostName=${result.assignedHub};DeviceId=${result.deviceId};SharedAccessKey=${symmetricKey}`;
}

class TemperatureSensor {
  constructor() {
    this.currTemp = 1 + Math.random() * 90;
    this.maxTemp = this.currTemp;
    this.minTemp = this.currTemp;
    this.cumulativeTemperature = this.currTemp;
    this.startTime = new Date().toISOString();
    this.numberOfTemperatureReadings = 1;
  }
  updateSensor() {
    this.currTemp = 1 + Math.random() * 90;
    this.cumulativeTemperature += this.currTemp;
    ++this.numberOfTemperatureReadings;
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
      endTime: new Date().toISOString(),
      startTime: this.startTime,
    };
  }
  getCurrentTemp() {
    return this.currTemp;
  }
  getMaxTemp() {
    return this.maxTemp;
  }
}

class ThermostatSample {
  constructor() {
    this.sensor = new TemperatureSensor();
    this.sendTelemetryIndex = 0;

    this.exitHandler = async () => {
      console.log('Exiting sample');
      if (this.sendTelemetryIntervalId) {
        console.log('Clearing send telemetry interval');
        clearInterval(this.sendTelemetryIntervalId);
      }
      if (this.client) {
        console.log('Closing client');
        await this.client.close().catch((err) => {
          console.log(`An error ocurred while closing the client ${err}`);
          process.exit(1);
        });
      }
      process.exit();
    };

    this.handleWritablePropertyRequest = (properties) => {
      console.log(`Received writable property patch ${JSON.stringify(properties.backingObject)}.`);
      const writablePropertyResponse = new ClientPropertyCollection();
      for(const [key, value] of Object.entries(properties.backingObject)) {
        if (key === '$version') {
          continue;
        }
        const [ackCode, ackDescription] = (key === 'targetTemperature' && typeof value === 'number') ?
          [200, 'success']:
          [400, 'invalid property'];
        writablePropertyResponse.setProperty(
          key,
          generateWritablePropertyResponse(value, ackCode, ackDescription, properties.version)
        );
      }
      console.log(
        `Updating properties to acknowledge writable property request: ${JSON.stringify(writablePropertyResponse.backingObject)}`
      );
      this.client.updateClientProperties(writablePropertyResponse)
        .then(() => {
          console.log(
            `Successfully updated properties to acknowledge writable property request version ${properties.version}`
          );
        })
        .catch((err) => {
          console.error(
            `Error updating properties to acknowledge writable property request version ${properties.version}: ${err}`
          );
        });
    };

    this.handleGetMaxMinReport = (request, response) => {
      console.log(
        `Received command request "getMaxMinReport" with payload "${request.payload}" and request ID ${request.requestID}`
      );
      response.send(200, this.sensor.getMaxMinReportObject())
        .then(() => {
          console.log(`Successfully responded to command request ID ${request.requestID}`);
        })
        .catch((err) => {
          console.error(`An error ocurred while responding to command request ID ${request.requestID}: ${err}`);
        });
    };

    this.handleSendTelemetry = () => {
      this.sensor.updateSensor();
      const currIndex = this.sendTelemetryIndex++;
      console.log(`Sending telemetry message ${currIndex} to default component`);
      this.client.sendTelemetry({ temperature: this.sensor.getCurrentTemp() })
        .then(() => {
          console.log(`Successfully sent telemetry message ${currIndex}`);
        })
        .catch((err) => {
          console.error(`An error occurred while sending telemetry message ${currIndex}: ${err}`);
        });
    };
  }

  async main() {
    const standardInput = process.stdin;
    standardInput.setEncoding('utf-8');
    standardInput.on('data', (data) => {
      if (data === 'q\n' || data === 'Q\n') {
        this.exitHandler();
      } else {
        console.log('Invalid user input received.');
      }
    });
    console.log('Press Q to exit sample.');

    if (deviceSecurityType === 'DPS') {
      if (!idScope || !registrationId || !symmetricKey) {
        throw new Error(
          'IOTHUB_DEVICE_DPS_ID_SCOPE, IOTHUB_DEVICE_DPS_DEVICE_ID, and IOTHUB_DEVICE_DPS_DEVICE_KEY must be provided if IOTHUB_DEVICE_SECURITY_TYPE is "DPS"'
        );
      }
      deviceConnectionString = await provisionDevice({ modelId });
    } else if (deviceSecurityType === 'connectionString') {
      if (!deviceConnectionString) {
        throw new Error(
          'IOTHUB_DEVICE_CONNECTION_STRING must be provided if IOTHUB_DEVICE_SECURITY_TYPE is "connectionString"'
        );
      }
    } else {
      throw new Error('IOTHUB_DEVICE_SECURITY_TYPE must be "DPS" or "connectionString"');
    }

    this.client = Client.fromConnectionString(deviceConnectionString, Mqtt, modelId);
    this.client.on('error', (err) => {
      console.error(`Client encountered an unexpected error: ${err}`);
    });
    console.log(`Connecting using connection string "${deviceConnectionString}" and model ID "${modelId}"`);
    await this.client.open();

    const properties = new ClientPropertyCollection();
    properties.setProperty('maxTempSinceLastReboot', this.sensor.getMaxTemp());
    console.log(`Updating client property "maxTempSinceLastReboot" with value ${this.sensor.getMaxTemp()}`);
    this.client.updateClientProperties(properties)
      .then(() => {
        console.log('Successfully updated "maxTempSinceLastReboot" property');
      })
      .catch((err) => {
        console.error(`Error updating "maxTempSinceLastReboot" property: ${err}`);
      });

    console.log('Registering listener for writable property requests');
    this.client.onWritablePropertyUpdateRequest(this.handleWritablePropertyRequest);

    console.log('Enabling commands on the client and registering listener for command "getMaxMinReport"');
    this.client.onCommand('getMaxMinReport', this.handleGetMaxMinReport);

    console.log(`Starting to send telemetry every ${sendTelemetryIntervalTime} ms`);
    this.sendTelemetryIntervalId = setInterval(this.handleSendTelemetry, sendTelemetryIntervalTime);
  }
}

new ThermostatSample().main().catch((err) => {
  console.error(`An error occurred while starting the sample: ${err}`);
  process.exit(1);
});