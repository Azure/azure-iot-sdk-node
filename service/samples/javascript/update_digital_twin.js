// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const IoTHubTokenCredentials = require('azure-iothub').IoTHubTokenCredentials;
const DigitalTwinClient = require('azure-iothub').DigitalTwinClient;

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinClient constructor
// - create a patch for modifying the Digital Twin
// - update the Digital Twin with patch
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function main() {
  const deviceId = process.env.IOTHUB_DEVICE_ID;
  const connString = process.env.IOTHUB_CONNECTION_STRING;

  // Create service client
  const credentials = new IoTHubTokenCredentials(connString);
  const digitalTwinClient = new DigitalTwinClient(credentials);

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
  await digitalTwinClient.updateDigitalTwin(deviceId, patch);

  console.log('Patch has been succesfully applied');
}

main().catch((err) => {
  console.log('error code: ', err.code);
  console.log('error message: ', err.message);
  console.log('error stack: ', err.stack);
});
