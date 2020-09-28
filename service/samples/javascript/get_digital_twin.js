// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const IoTHubTokenCredentials = require('azure-iothub').IoTHubTokenCredentials;
const DigitalTwinClient = require('azure-iothub').DigitalTwinClient;
const { inspect } = require('util');

// Simple example of how to:
// - create a Digital Twin Client using the DigitalTwinClient constructor
// - get the Digital Twin
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function main() {
  const deviceId = process.env.IOTHUB_DEVICE_ID;
  const connectionString = process.env.IOTHUB_CONNECTION_STRING;

  // Create digital twin client
  const credentials = new IoTHubTokenCredentials(connectionString);
  const digitalTwinClient = new DigitalTwinClient(credentials);

  // Get digital twin and retrieve the modelId from it
  const digitalTwin = await digitalTwinClient.getDigitalTwin(deviceId);

  console.log(inspect(digitalTwin));
  console.log('Model Id: ' + inspect(digitalTwin.$metadata.$model));
}

main().catch((err) => {
  console.log('error code: ', err.code);
  console.log('error message: ', err.message);
  console.log('error stack: ', err.stack);
});
