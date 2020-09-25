// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

'use strict';

const IoTHubTokenCredentials = require('azure-iothub').IoTHubTokenCredentials;
const DigitalTwinClient = require('azure-iothub').DigitalTwinClient;
const { inspect } = require('util');

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinClient constructor
// - invoke a root level command on a Digital Twin enabled device
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function main() {
  const deviceId = process.env.IOTHUB_DEVICE_ID;
  const connectionString = process.env.IOTHUB_CONNECTION_STRING;
  const commandName = process.env.IOTHUB_COMMAND_NAME; // for the thermostat you can try getMaxMinReport
  const commandPayload = process.env.IOTHUB_COMMAND_PAYLOAD; // it really doesn't matter, any string will do.

  // Create service client
  const credentials = new IoTHubTokenCredentials(connectionString);
  const digitalTwinClient = new DigitalTwinClient(credentials);

  // Invoke a command
  const options = {
    connectTimeoutInSeconds: 30,
    responseTimeoutInSeconds: 40 // The responseTimeoutInSeconds must be within [5; 300]
  };
  const commandResponse = await digitalTwinClient.invokeCommand(deviceId, commandName, commandPayload, options);

  // Print result of the command
  console.log(inspect(commandResponse));
}

main().catch((err) => {
  console.log('error code: ', err.code);
  console.log('error message: ', err.message);
  console.log('error stack: ', err.stack);
});

