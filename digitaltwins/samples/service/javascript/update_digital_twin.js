// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

const IoTHubTokenCredentials = require('azure-iot-digitaltwins-service').IoTHubTokenCredentials;
const DigitalTwinServiceClient = require('azure-iot-digitaltwins-service').DigitalTwinServiceClient;

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - create a patch for modifying the Digital Twin
// - update the Digital Twin with patch
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function main() {
  const deviceId = process.env.IOTHUB_DEVICE_ID;

  // Create service client
  const credentials = new IoTHubTokenCredentials(process.env.IOTHUB_CONNECTION_STRING);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Update digital twin and verify the update
  // If you already have a component thermostat1:
  // const patch = [{
  //   op: 'replace',
  //   path: '/thermostat1/targetTemperature',
  //   value: 42
  // }];
  const patch = [{
    op: 'add',
    path: '/targetTemperature',
    value: 42
  }];
  await digitalTwinServiceClient.updateDigitalTwin(deviceId, patch);

  console.log('Patch has been succesfully applied');
};

main().catch((err) => {
  console.log('error code: ', err.code);
  console.log('error message: ', err.message);
  console.log('error stack: ', err.stack);
});
