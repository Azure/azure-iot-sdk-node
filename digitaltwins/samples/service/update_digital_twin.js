// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

const connectionString = process.env.IOTHUB_CONNECTION_STRING;
const deviceId = process.env.IOTHUB_DEVICE_ID;

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - update the Digital Twin with patch
async function main() {
  // Environment variables have to be set
  // Digital Twin enabled device must be exist on the IoT Hub

  try {
    // Create service client
    const credentials = new IoTHubTokenCredentials(connectionString);
    const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

    // Get digital twin
    const digitalTwin = await digitalTwinServiceClient.getDigitalTwin(deviceId);

    // Print digital twin
    console.log(digitalTwin);

    // Update digital twin desired properties
    // jsonpatch example:
    // patch = [
    //     { op: 'add', path: '/newThermostat', value: { 'tempSetpoint': 100, '$metadata': {} } }];
    //     { op: 'remove', path: '/newThermostat' },
    //     { op: 'replace', path: '/newThermostat', value: { tempSetpoint: 42 } },
    // ]);
    const patch = [{ op: 'add', path: '/newThermostat', value: { 'tempSetpoint': 100, '$metadata': {} } }];
    console.log('patch:');
    console.log(JSON.stringify(patch, null, 2));

    // Update digital twin
    await digitalTwinServiceClient.updateDigitalTwin(deviceId, patch);
  } catch (err) {
    console.log(err);
  }
};

main();
