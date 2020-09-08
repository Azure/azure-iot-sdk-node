// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.

import { DigitalTwinServiceClient } from 'azure-iothub';
import { IoTHubTokenCredentials } from 'azure-iothub';

const deviceId = process.env.IOTHUB_DEVICE_ID || '';
const connectionString = process.env.IOTHUB_CONNECTION_STRING || '';
const componentName = process.env.IOTHUB_COMPONENT_NAME || 'sensor'; // for the environmental sensor, try "sensor"
const commandName = process.env.IOTHUB_COMMAND_NAME || 'turnOn'; // for the environmental sensor, you can try "blink", "turnOff" or "turnOn"
const commandPayload = process.env.IOTHUB_COMMAND_PAYLOAD || ''; // for the environmental sensor, it really doesn't matter. any string will do.

// Simple example of how to:
// - create a Digital Twin Service Client using the DigitalTwinServiceClient constructor
// - invoke a command on a Digital Twin enabled device's component
//
// Preconditions:
// - Environment variables have to be set
// - Twin enabled device must exist on the ADT hub
async function asyncMain(): Promise<void> {
  console.log('invoking command ' + commandName + ' on component ' + componentName + ' for device ' + deviceId + '...');

  const credentials = new IoTHubTokenCredentials(connectionString);
  const digitalTwinServiceClient = new DigitalTwinServiceClient(credentials);

  // Invoke a command
  const options = {
    connectTimeoutInSeconds: 30,
    responseTimeoutInSeconds: 40 // The responseTimeoutInSeconds must be within [5; 300]
  };
  const invokeComponentCommandResponse = await digitalTwinServiceClient.invokeComponentCommand(deviceId, componentName, commandName, commandPayload, options);

  // Print the response
  console.log(JSON.stringify(invokeComponentCommandResponse, null, 2));
}

asyncMain().catch((err) => {
    console.log('error code: ', err.code);
    console.log('error message: ', err.message);
    console.log('error stack: ', err.stack);
  });
