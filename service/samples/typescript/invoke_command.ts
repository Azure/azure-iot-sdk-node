// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { DigitalTwinClient } from 'azure-iothub';
import { IoTHubTokenCredentials } from 'azure-iothub';

const deviceId = process.env.IOTHUB_DEVICE_ID || '';
const connectionString = process.env.IOTHUB_CONNECTION_STRING || '';
const commandName = process.env.IOTHUB_COMMAND_NAME || 'turnOn'; // for the environmental sensor, you can try "blink", "turnOff" or "turnOn"
const commandPayload = process.env.IOTHUB_COMMAND_PAYLOAD || ''; // for the environmental sensor, it really doesn't matter. any string will do.

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinClient constructor
// - invoke a root level command on a Digital Twin enabled device
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function asyncMain(): Promise<void> {
  console.log('invoking command ' + commandName + ' for device ' + deviceId + '...');

  const credentials = new IoTHubTokenCredentials(connectionString);
  const digitalTwinClient = new DigitalTwinClient(credentials);

  // Invoke a command
  const options = {
    connectTimeoutInSeconds: 20,
    responseTimeoutInSeconds: 40 // The responseTimeoutInSeconds must be within [5; 300]
  };
  const invokeCommandResponse = await digitalTwinClient.invokeCommand(deviceId, commandName, commandPayload, options);

  // Print the response
  console.log(JSON.stringify(invokeCommandResponse, null, 2));
}

asyncMain().catch((err) => {
    console.log('error code: ', err.code);
    console.log('error message: ', err.message);
    console.log('error stack: ', err.stack);
  });
