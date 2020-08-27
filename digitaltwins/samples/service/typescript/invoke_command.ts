// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { DigitalTwinServiceClient } from 'azure-iot-digitaltwins-service';
import { IoTHubTokenCredentials } from 'azure-iot-digitaltwins-service';

const deviceId = process.env.IOTHUB_DEVICE_ID || '';
const connectionString = process.env.IOTHUB_CONNECTION_STRING || '';
const commandName = process.env.IOTHUB_COMMAND_NAME || 'turnOn'; // for the environmental sensor, you can try "blink", "turnOff" or "turnOn"
const commandPayload = process.env.IOTHUB_COMMAND_PAYLOAD || ''; // for the environmental sensor, it really doesn't matter. any string will do.

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - invoke a root level command on a Digital Twin enabled device
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function asyncMain(): Promise<void> {
  console.log('invoking command ' + commandName + ' for device ' + deviceId + '...');

  const credentials = new IoTHubTokenCredentials(connectionString);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Invoke a command
  const options = {
    connectTimeoutInSeconds: 1,
    responseTimeoutInSeconds: 7 // The responseTimeoutInSeconds must be within [5; 300]
  };
  const invokeCommandResponse = await digitalTwinServiceClient.invokeCommand(deviceId, commandName, commandPayload, options);

  // Print the response
  console.log(JSON.stringify(invokeCommandResponse, null, 2));
}

asyncMain().catch((err) => {
    console.log('error code: ', err.code);
    console.log('error message: ', err.message);
    console.log('error stack: ', err.stack);
  });
